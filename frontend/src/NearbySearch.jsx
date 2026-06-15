import { useEffect, useState } from "react";

export default function NearbySearch({ selectedLocation, onNearbyResult, onReset }) {
  const [radiusKm, setRadiusKm] = useState("5");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedLocation) {
      setLatitude(String(selectedLocation.latitude));
      setLongitude(String(selectedLocation.longitude));
    }
  }, [selectedLocation]);

  async function handleNearbySearch(e) {
    e.preventDefault();
    setError("");

    if (!latitude || !longitude || !radiusKm) {
      setError("Choose a location and radius first.");
      return;
    }

    try {
      const url = `http://localhost:8000/incidents/nearby?lat=${latitude}&lng=${longitude}&radius_km=${radiusKm}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Nearby search failed");
      }

      onNearbyResult(data);
    } catch (err) {
      console.error("NEARBY SEARCH ERROR:", err);
      setError(err.message || "Could not search nearby incidents.");
    }
  }

  return (
    <form
      onSubmit={handleNearbySearch}
      style={{
        marginBottom: "20px",
        display: "flex",
        gap: "10px",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <strong>Nearby Search</strong>

      <input
        placeholder="Latitude"
        value={latitude}
        onChange={(e) => setLatitude(e.target.value)}
      />

      <input
        placeholder="Longitude"
        value={longitude}
        onChange={(e) => setLongitude(e.target.value)}
      />

      <input
        placeholder="Radius km"
        value={radiusKm}
        onChange={(e) => setRadiusKm(e.target.value)}
      />

      <button type="submit">Find Nearby</button>

      <button type="button" onClick={onReset}>
        Show All
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
}