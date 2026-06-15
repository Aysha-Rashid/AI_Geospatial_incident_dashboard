# import sqlalchemy as sa
import psycopg2 
import os
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor

load_dotenv()

conn = psycopg2.connect(
    host=os.getenv("host"),
    database=os.getenv("POSTGRES_DB"),
    user=os.getenv("POSTGRES_USER"),
    password=os.getenv("POSTGRES_PASSWORD"),
    port=5432,
    cursor_factory=RealDictCursor,
)
cur = conn.cursor()

create_extension_query = """
CREATE EXTENSION IF NOT EXISTS postgis;
"""

create_table_query = """
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    incident_type VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(255),
    severity VARCHAR(50),
    status VARCHAR(50),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

create_index_query = """
CREATE INDEX IF NOT EXISTS idx_location 
ON incidents 
USING GIST (location);
"""

cur.execute(create_extension_query)
cur.execute(create_table_query)
cur.execute(create_index_query)

insert_query = """
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
);
"""

incident = {
    "incident_type": "Road Flooding",
    "description": "meow is blocking two lanes near the bridge.",
    "category": "checking",
    "severity": "High",
    "status": "Open",
    "latitude": 25.3539,
    "longitude": 54.8773,
}

cur.execute(
    insert_query,
    (
        incident["incident_type"],
        incident["description"],
        incident["category"],
        incident["severity"],
        incident["status"],
        incident["latitude"],
        incident["longitude"],
        incident["longitude"],  # X = longitude
        incident["latitude"],   # Y = latitude
    )
)
# check="""
# SELECT
#     id,
#     latitude,
#     longitude,
#     ST_AsText(location::geometry) AS point_text,
#     ST_AsGeoJSON(location::geometry) AS geojson
# FROM incidents;"""

# cur.execute(check)
conn.commit()

print("Table 'incidents' created successfully.")