import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      const clickedLocation = {
        latitude: Number(e.latlng.lat.toFixed(6)),
        longitude: Number(e.latlng.lng.toFixed(6)),
      };

      onMapClick(clickedLocation);
    },
  });

  return null;
}

export default function MapView({ geoData, selectedLocation, onMapClick }) {
  function onEachFeature(feature, layer) {
    const props = feature.properties || {};

    layer.bindPopup(`
      <strong>${props.incident_type || "Incident"}</strong><br/>
      Category: ${props.category || "N/A"}<br/>
      Severity: ${props.severity || "N/A"}<br/>
      Status: ${props.status || "N/A"}<br/>
      Description: ${props.description || "N/A"}<br/><br/>

      <strong>AI Summary:</strong><br/>
      ${props.ai_summary || "N/A"}<br/><br/>

      <strong>Escalation Risk:</strong>
      ${props.escalation_risk || "N/A"}<br/>

      <strong>Suggested Action:</strong><br/>
      ${props.suggested_action || "N/A"}<br/>

      ${
        props.distance_km !== undefined
          ? `<br/><strong>Distance:</strong> ${props.distance_km} km<br/>`
          : ""
      }
    `);
  }

  if (!geoData || geoData.type !== "FeatureCollection") {
    return <p>Invalid GeoJSON data.</p>;
  }

  return (
    <MapContainer
      center={[24.4539, 54.3773]}
      zoom={13}
      style={{ height: "600px", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapClickHandler onMapClick={onMapClick} />

      <GeoJSON
        key={JSON.stringify(geoData)}
        data={geoData}
        onEachFeature={onEachFeature}
      />

      {selectedLocation && (
        <CircleMarker
          center={[selectedLocation.latitude, selectedLocation.longitude]}
          radius={10}
        >
          <Popup>
            Selected location<br />
            Lat: {selectedLocation.latitude}<br />
            Lng: {selectedLocation.longitude}
          </Popup>
        </CircleMarker>
      )}
    </MapContainer>
  );
}