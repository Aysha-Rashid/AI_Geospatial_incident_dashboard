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
import json

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
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        updated_at
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
            },
        })

    return {
        "type": "FeatureCollection",
        "features": features,
    }


@app.post("/incidents")
def create_incident(incident: IncidentCreate):
    conn, cur= get_connection()

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
            location
        )
        VALUES (
            %s, %s, %s, %s, %s, %s, %s,
            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography
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