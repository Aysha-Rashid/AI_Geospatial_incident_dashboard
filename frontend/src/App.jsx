import { useEffect, useState } from "react";
import MapView from "./MapView";
import IncidentForm from "./IncidentForm";
import "leaflet/dist/leaflet.css";

function App() {
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchIncidents() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("http://localhost:8000/incidents");

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();
      setGeoData(data);
    } catch (err) {
      console.error("FETCH ERROR:", err);
      setError("Could not fetch incidents from FastAPI.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchIncidents();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Geospatial Incident Alert Dashboard</h1>

      <IncidentForm onIncidentCreated={fetchIncidents} />

      {loading && <p>Loading incidents...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {geoData && <MapView geoData={geoData} />}
    </div>
  );
}

export default App;