import { useEffect, useState } from "react";

export default function IncidentForm({ onIncidentCreated, selectedLocation }) {
  const [formData, setFormData] = useState({
    incident_type: "",
    description: "",
    category: "Infrastructure",
    severity: "Medium",
    latitude: "",
    longitude: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedLocation) {
      setFormData((prev) => ({
        ...prev,
        latitude: String(selectedLocation.latitude),
        longitude: String(selectedLocation.longitude),
      }));
    }
  }, [selectedLocation]);

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      incident_type: formData.incident_type,
      description: formData.description,
      category: formData.category,
      severity: formData.severity,
      status: "Open",
      latitude: Number(formData.latitude),
      longitude: Number(formData.longitude),
    };

    try {
      const response = await fetch("http://localhost:8000/incidents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to create incident");
      }

      setFormData({
        incident_type: "",
        description: "",
        category: "Infrastructure",
        severity: "Medium",
        latitude: "",
        longitude: "",
      });

      if (onIncidentCreated) {
        await onIncidentCreated();
      }
    } catch (err) {
      console.error("CREATE INCIDENT ERROR:", err);
      setError(err.message || "Could not create incident.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
      <h2>Create Incident</h2>

      <input
        name="incident_type"
        placeholder="Incident type"
        value={formData.incident_type}
        onChange={handleChange}
        required
      />

      <textarea
        name="description"
        placeholder="Description"
        value={formData.description}
        onChange={handleChange}
      />

      <select name="category" value={formData.category} onChange={handleChange}>
        <option value="Infrastructure">Infrastructure</option>
        <option value="Flood">Flood</option>
        <option value="Fire">Fire</option>
        <option value="Traffic">Traffic</option>
        <option value="Security">Security</option>
        <option value="Environmental">Environmental</option>
      </select>

      <select name="severity" value={formData.severity} onChange={handleChange}>
        <option value="Low">Low</option>
        <option value="Medium">Medium</option>
        <option value="High">High</option>
        <option value="Critical">Critical</option>
      </select>

      <input
        name="latitude"
        placeholder="Latitude"
        value={formData.latitude}
        onChange={handleChange}
        required
      />

      <input
        name="longitude"
        placeholder="Longitude"
        value={formData.longitude}
        onChange={handleChange}
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create Incident"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
}