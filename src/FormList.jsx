import { useState, useEffect } from "react";
import { apiUrl } from "./apiBase";

function FormList({ onViewForm, onViewResponses, onEditForm }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchForms();
    fetchCategories();
  }, []);

  async function fetchForms() {
    setIsRefreshing(true);

    try {
      const response = await fetch(apiUrl("/get_forms.php"));
      const result = await response.json();

      if (result.success) {
        setForms(result.forms);
      } else {
        setError("Failed to load forms");
      }
    } catch (err) {
      setError("Could not connect to server: " + err.message);
    } finally {
      setLoading(false);
      // Keep animation visible for a moment
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch(apiUrl("/get_categories.php"));
      const result = await res.json();

      if (result.success) {
        setCategories(result.categories);
      }
    } catch {
      console.err("Could not load categories", err);
    }
  }

  async function deleteForm(formId, title) {
    if (!window.confirm(`Delete "${title}" permanently?`)) return;

    try {
      const res = await fetch(apiUrl("/delete_form.php"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form_id: formId }),
      });

      const result = await res.json();

      if (result.success) {
        alert("Form deleted.");
        fetchForms();
      } else {
        alert("Error deleting form.");
      }
    } catch (err) {
      alert("Failed to connect: " + err.message);
    }
  }

  const filteredForms =
    selectedCategory === "all"
      ? forms
      : forms.filter((form) => form.category_id == selectedCategory);

  if (loading) return <div style={{ padding: "40px", fontWeight: "700" }}>Loading forms...</div>;

  if (error)
    return (
      <div style={{ padding: "20px", color: "red" }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button 
        className="glass-button refresh-button"
        style={{ color:"black"}}
        onClick={fetchForms}>Try Again</button>
      </div>
    );

  return (
    <div 
    className={isRefreshing ? 'refreshing-background' : ''}
    style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <h1 style={{ marginBottom: "5px" }}>My Forms</h1>
        <p>
          Showing {filteredForms.length} of {forms.length} forms
        </p>
      </div>

      {/* Filter */}
      <div style={{ textAlign: "right", marginBottom: "20px" }}>
        <select
          className="glass-select"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {filteredForms.length === 0 ? (
        <p>No forms found.</p>
      ) : (
        <div className="forms-grid">
          {filteredForms.map((form) => (
            <div key={form.id} className="glass-card">
              <div className="form-card-header">
                <h3 className="form-card-title">{form.title}</h3>
                <span
                  className={`category-badge ${form.category_name.toLowerCase()}`}
                >
                  {form.category_name}
                </span>
              </div>

              
                <p style={{ color: "#333", marginBottom: "10px" }}>
                  {form.description || "\u00A0"}
                </p>
              

              <p>
                📝 {form.question_count} question(s)
                <br />
                📅 {new Date(form.created_at).toLocaleDateString()}
                <br />
                📊 {form.response_count || 0} responses
              </p>

              <div className="card-btn-group">
                <button
                  className="card-btn card-btn-view"
                  onClick={() => onViewForm(form.id)}
                >
                  View
                </button>
                <button
                  className="card-btn card-btn-edit"
                  onClick={() => onEditForm(form.id)}
                >
                  Edit
                </button>
                <button
                  className="card-btn card-btn-delete"
                  onClick={() => deleteForm(form.id, form.title)}
                >
                  Delete
                </button>
              </div>
              <button
                className="card-btn-responses"
                onClick={() => onViewResponses(form.id)}
              >
                Responses
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: "30px" }}>
        <button
          className="glass-button refresh-button"
          disabled={isRefreshing}
          style={{
            
            background: isRefreshing ? "#28a7469f" : "#6c757d66",
            
            cursor: isRefreshing ? "not-allowed" : "pointer",
            
            fontWeight: "500",
          }}
          onClick={fetchForms}
        >
          {isRefreshing ? '✓ Refreshing...' : '↻ Refresh'}
        </button>
      </div>
    </div>
  );
}

export default FormList;
