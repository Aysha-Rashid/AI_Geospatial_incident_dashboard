import os
import json
import psycopg2
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from psycopg2.extras import RealDictCursor
from database import cur, conn
from pydantic import BaseModel, Field
from typing import Optional
from fastapi import Query, HTTPException

class IncidentCreate(BaseModel):
    incident_type: str
    description: Optional[str] = None
    category: Optional[str] = None
    severity: str = "Medium"
    status: str = "Open"
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)

def get_connection():
    return conn, cur

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IncidentStatusUpdate(BaseModel):
    status: str

@app.get("/incidents/nearby")
def get_nearby_incidents(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(5, gt=0),
):
    conn, cur = get_connection()
    # cur = conn.cursor()

    try:
        radius_meters = radius_km * 1000

        query = """
        SELECT
            id,
            incident_type,
            description,
            category,
            severity,
            status,
            latitude,
            longitude,
            ST_AsGeoJSON(location::geometry) AS geojson,
            ST_Distance(
                location,
                ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography
            ) AS distance_meters,
            created_at,
            updated_at,
            ai_summary,
            escalation_risk,
            suggested_action
            FROM incidents
            WHERE ST_DWithin(
                location,
                ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,
                %s
            )
            ORDER BY distance_meters ASC;
        """

        cur.execute(
            query,
            (
                lng, lat,          # for ST_Distance
                lng, lat,          # for ST_DWithin
                radius_meters,
            ),
        )

        rows = cur.fetchall()

        features = []

        for row in rows:
            features.append({
                "type": "Feature",
                "geometry": json.loads(row["geojson"]),
                "properties": {
                    "id": row["id"],
                    "incident_type": row["incident_type"],
                    "description": row["description"],
                    "category": row["category"],
                    "severity": row["severity"],
                    "status": row["status"],
                    "latitude": row["latitude"],
                    "longitude": row["longitude"],
                    "distance_meters": round(float(row["distance_meters"]), 2),
                    "distance_km": round(float(row["distance_meters"]) / 1000, 2),
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                    "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
                },
            })

        return {
            "type": "FeatureCollection",
            "features": features,
        }

    except Exception as e:
        print("NEARBY SEARCH ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))

    # finally:
    #     cur.close()
    #     conn.close()

@app.patch("/incidents/{incident_id}/status")
def update_incident_status(incident_id: int, status_update: IncidentStatusUpdate):
    allowed_statuses = ["Open", "In Progress", "Resolved"]

    if status_update.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid status. Use Open, In Progress, or Resolved."
        )

    conn, cur  = get_connection()
    # cur = conn.cursor()

    try:
        query = """
        UPDATE incidents
        SET status = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        RETURNING
            id,
            incident_type,
            description,
            category,
            severity,
            status,
            latitude,
            longitude,
            ST_AsGeoJSON(location::geometry) AS geojson,
            created_at,
            updated_at;
        """

        cur.execute(query, (status_update.status, incident_id))
        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Incident not found")

        conn.commit()

        return {
            "type": "Feature",
            "geometry": json.loads(row["geojson"]),
            "properties": {
                "id": row["id"],
                "incident_type": row["incident_type"],
                "description": row["description"],
                "category": row["category"],
                "severity": row["severity"],
                "status": row["status"],
                "latitude": row["latitude"],
                "longitude": row["longitude"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
            },
        }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as e:
        conn.rollback()
        print("UPDATE STATUS ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/incidents")
def get_incidents():
    conn, cur = get_connection()
    # cur = conn.cursor()

    query = """
    SELECT
        id,
        incident_type,
        description,
        category,
        severity,
        status,
        latitude,
        longitude,
        ST_AsGeoJSON(location::geometry) AS geojson,
        created_at,
        updated_at,
        ai_summary,
        escalation_risk,
        suggested_action
    FROM incidents
    ORDER BY created_at DESC;
    """

    cur.execute(query)
    rows = cur.fetchall()
# )
#     conn.close()
    # cur.close(

    features = []

    for row in rows:
        features.append({
            "type": "Feature",
            "geometry": json.loads(row["geojson"]),
            "properties": {
                "id": row["id"],
                "incident_type": row["incident_type"],
                "description": row["description"],
                "category": row["category"],
                "severity": row["severity"],
                "status": row["status"],
                "latitude": row["latitude"],
                "longitude": row["longitude"],
                "created_at": str(row["created_at"]),
                "updated_at": str(row["updated_at"]),
                "ai_summary": row["ai_summary"],
                "escalation_risk": row["escalation_risk"],
                "suggested_action": row["suggested_action"],
            },
        })

    return {
        "type": "FeatureCollection",
        "features": features,
    }


@app.post("/incidents")
def create_incident(incident: IncidentCreate):
    conn, cur= get_connection()
    analysis = analyze_incident(
        incident.description,
        incident.severity,
        incident.category
    )
    try:
        query = """
            INSERT INTO incidents (
                incident_type,
                description,
                category,
                severity,
                status,
                latitude,
                longitude,
                location,
                ai_summary,
                escalation_risk,
                suggested_action
            )
            VALUES (
                %s, %s, %s, %s, %s, %s, %s,
                ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography,
                %s, %s, %s
            )
            RETURNING
                id,
                incident_type,
                description,
                category,
                severity,
                status,
                latitude,
                longitude,
                ST_AsGeoJSON(location::geometry) AS geojson,
                ai_summary,
                escalation_risk,
                suggested_action,
                created_at,
                updated_at;
            """

        cur.execute(
            query,
            (
                incident.incident_type,
                incident.description,
                incident.category,
                incident.severity,
                incident.status,
                incident.latitude,
                incident.longitude,
                incident.longitude,
                incident.latitude,
                analysis["ai_summary"],
                analysis["escalation_risk"],
                analysis["suggested_action"],
            ),
        )

        row = cur.fetchone()

        response_data = {
            "type": "Feature",
            "geometry": json.loads(row["geojson"]),
            "properties": {
                "id": row["id"],
                "incident_type": row["incident_type"],
                "description": row["description"],
                "category": row["category"],
                "severity": row["severity"],
                "status": row["status"],
                "latitude": row["latitude"],
                "longitude": row["longitude"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
                "ai_summary": row["ai_summary"],
                "escalation_risk": row["escalation_risk"],
                "suggested_action": row["suggested_action"],
            },
        }

        conn.commit()
        return response_data

    except Exception as e:
        conn.rollback()
        print("CREATE INCIDENT ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))

    # finally:
    #     cur.close()
    #     conn.close()

def analyze_incident(description: str, severity: str, category: str):
    description_lower = (description or "").lower()
    severity_lower = (severity or "").lower()
    category_lower = (category or "").lower()

    danger_words = [
        "fire", "flood", "collapse", "blocked", "accident",
        "explosion", "injury", "urgent", "danger", "leak",
        "smoke", "evacuation", "critical"
    ]

    matched_words = [
        word for word in danger_words
        if word in description_lower
    ]

    if severity_lower == "critical":
        escalation_risk = "Critical"
    elif severity_lower == "high" or matched_words:
        escalation_risk = "High"
    elif severity_lower == "medium":
        escalation_risk = "Medium"
    else:
        escalation_risk = "Low"

    if category_lower == "flood":
        suggested_action = "Dispatch field inspection team and notify infrastructure response unit."
    elif category_lower == "fire":
        suggested_action = "Escalate to emergency response team and verify nearby asset risk."
    elif category_lower == "traffic":
        suggested_action = "Notify traffic operations and check nearby road impact."
    elif category_lower == "security":
        suggested_action = "Escalate to security operations for immediate review."
    elif category_lower == "environmental":
        suggested_action = "Notify environmental monitoring team and collect site evidence."
    else:
        suggested_action = "Assign incident to operations team for review and follow-up."

    ai_summary = (
        f"{severity} {category} incident reported. "
        f"Risk level is {escalation_risk}. "
        f"Key concern: {description[:120] if description else 'No description provided.'}"
    )

    return {
        "ai_summary": ai_summary,
        "escalation_risk": escalation_risk,
        "suggested_action": suggested_action,
    }