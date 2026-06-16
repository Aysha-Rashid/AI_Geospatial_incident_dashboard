import { useEffect, useState } from "react";
import MapView from "./MapView";
import IncidentForm from "./IncidentForm";
import FilterPanel from "./FilterPanel";
import "leaflet/dist/leaflet.css";
import IncidentList from "./IncidentList";
import NearbySearch from "./NearbySearch";
import "./App.css";

function App() {
  const [geoData, setGeoData] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    severity: "All",
    status: "All",
    category: "All",
  });

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

  const features = geoData?.features || [];

  const categories = [
    ...new Set(
      features
        .map((feature) => feature.properties?.category)
        .filter(Boolean)
    ),
  ];

  const filteredFeatures = features.filter((feature) => {
    const props = feature.properties || {};

    const matchesSeverity =
      filters.severity === "All" || props.severity === filters.severity;

    const matchesStatus =
      filters.status === "All" || props.status === filters.status;

    const matchesCategory =
      filters.category === "All" || props.category === filters.category;

    return matchesSeverity && matchesStatus && matchesCategory;
  });

  const filteredGeoData = geoData
    ? {
        ...geoData,
        features: filteredFeatures,
      }
    : null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Geospatial Incident Alert Dashboard</h1>
          <p>AI-assisted geospatial incident monitoring and risk analysis</p>
        </div>
        <span className="live-badge">Live System</span>
      </header>
      <main className="dashboard-grid">
        <aside className="sidebar">
          <div className="card">
            <IncidentForm
              onIncidentCreated={() => fetchIncidents(filters)}
              selectedLocation={selectedLocation}
            />
            {loading && <p>Loading incidents...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}
          </div>
          <div className="card">
            {geoData && (
              <FilterPanel
                filters={filters}
                setFilters={setFilters}
                categories={categories}
                total={features.length}
                visible={filteredFeatures.length}
              />
            )}
          </div>
          <div className="card">
            <NearbySearch
              selectedLocation={selectedLocation}
              onNearbyResult={setGeoData}
              onReset={() => fetchIncidents(filters)}
            />
          </div>
        </aside>
        <section className="map-panel">
          {filteredGeoData && (
            <MapView
              geoData={filteredGeoData}
              selectedLocation={selectedLocation}
              onMapClick={setSelectedLocation}
            />
          )}
        </section>
      </main>
      <section className="card incident-section">
        {geoData && (
          <IncidentList
            geoData={geoData}
            onStatusUpdated={() => fetchIncidents(filters)}
          />
        )}
      </section>
    </div>
  );
}

export default App;