export default function FilterPanel({ filters, setFilters, categories, total, visible }) {
  function handleChange(e) {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  }

  return (
    <div style={{ marginBottom: "20px", display: "flex", gap: "10px", alignItems: "center" }}>
      <select name="severity" value={filters.severity} onChange={handleChange}>
        <option value="All">All Severities</option>
        <option value="Low">Low</option>
        <option value="Medium">Medium</option>
        <option value="High">High</option>
        <option value="Critical">Critical</option>
      </select>

      <select name="status" value={filters.status} onChange={handleChange}>
        <option value="All">All Statuses</option>
        <option value="Open">Open</option>
        <option value="In Progress">In Progress</option>
        <option value="Resolved">Resolved</option>
      </select>

      <select name="category" value={filters.category} onChange={handleChange}>
        <option value="All">All Categories</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() =>
          setFilters({
            severity: "All",
            status: "All",
            category: "All",
          })
        }
      >
        Reset
      </button>

      <span>
        Showing {visible} of {total} incidents
      </span>
    </div>
  );
}