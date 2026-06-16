export default function IncidentList({ geoData, onStatusUpdated }) {
  const incidents = geoData?.features || [];

  async function handleStatusChange(incidentId, newStatus) {
    try {
      const response = await fetch(
        `http://localhost:8000/incidents/${incidentId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to update status");
      }

      if (onStatusUpdated) {
        await onStatusUpdated();
      }
    } catch (err) {
      console.error("UPDATE STATUS ERROR:", err);
      alert(err.message || "Could not update status.");
    }
  }

  return (
    <div style={{ marginTop: "20px" }}>
      <h2>Incident List</h2>

      {incidents.length === 0 && <p>No incidents found.</p>}

      {incidents.map((feature) => {
        const props = feature.properties;

        return (
          <div
            key={props.id}
            style={{
              border: "1px solid #ddd",
              padding: "12px",
              marginBottom: "10px",
              borderRadius: "8px",
            }}
          >
            <strong>{props.incident_type}</strong>

            <p>{props.description}</p>

            <p>
              Category: {props.category} | Severity: {props.severity}
            </p>

            <label>
              Status:{" "}
              <select
                value={props.status}
                onChange={(e) =>
                  handleStatusChange(props.id, e.target.value)
                }
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </label>
          <p>
            <strong>AI Summary:</strong> {props.ai_summary || "N/A"}
            </p>

            <span className={`risk-${props.escalation_risk?.toLowerCase()}`}>
              {props.escalation_risk}
            </span>

            <p>
            <strong>Suggested Action:</strong> {props.suggested_action || "N/A"}
            </p>
          </div> 
        );
      })}
    </div>
  );
}