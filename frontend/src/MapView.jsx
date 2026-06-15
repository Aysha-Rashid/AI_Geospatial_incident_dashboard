import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function MapView({ geoData }) {
  function onEachFeature(feature, layer) {
    const props = feature.properties || {};

    layer.bindPopup(`
      <strong>${props.incident_type || "Incident"}</strong><br/>
      Category: ${props.category || "N/A"}<br/>
      Severity: ${props.severity || "N/A"}<br/>
      Status: ${props.status || "N/A"}<br/>
      Description: ${props.description || "N/A"}
    `);
  }

  if (!geoData || geoData.type !== "FeatureCollection") {
    return <p>Invalid GeoJSON data.</p>;
  }

  return (
    <MapContainer
      center={[24.4539, 54.3773]}
      zoom={11}
      style={{ height: "600px", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <GeoJSON
        key={JSON.stringify(geoData)}
        data={geoData}
        onEachFeature={onEachFeature}
      />
    </MapContainer>
  );
}