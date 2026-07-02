import { useState, useEffect, useRef } from "react";
import { apiUrl, csrfHeaders } from "./apiBase";

function FormList({ onViewForm, onViewResponses, onEditForm, showToast, showConfirm, scopedUserId = null, isSuperAdmin = false }) {
  const [forms, setForms]                   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories]         = useState([]);
  const [isRefreshing, setIsRefreshing]     = useState(false);
  const [searchQuery, setSearchQuery]       = useState("");
  const hasLoadedRef                        = useRef(false);

  useEffect(() => {
    fetchForms();
    fetchCategories();
  }, [scopedUserId]);

  // ── Data fetching ──────────────────────────────────────────────────────────

  async function fetchForms() {
    const showSoftRefresh = hasLoadedRef.current;
    if (showSoftRefresh) setIsRefreshing(true);
    setError(null);

    try {
      const url = scopedUserId
        ? apiUrl(`/api/forms?user_id=${scopedUserId}${isSuperAdmin ? '&admin_override=1' : ''}`)
        : apiUrl("/api/forms");
      const response = await fetch(url, {
        credentials: "include",
      });
      const result = await response.json();

      if (result.success) {
        setForms(result.forms);
        setError(null);
      } else {
        setError("Failed to load forms");
      }
    } catch (err) {
      setError("Could not connect to server: " + err.message);
    } finally {
      setLoading(false);
      hasLoadedRef.current = true;
      if (showSoftRefresh) {
        setTimeout(() => setIsRefreshing(false), 220);
      }
    }
  }

  async function fetchCategories() {
    try {
      const res    = await fetch(apiUrl("/api/categories"));
      const result = await res.json();
      if (result.success) setCategories(result.categories);
    } catch (err) {
      console.error("Could not load categories", err);
    }
  }

  function retryLoad() {
    fetchForms();
    fetchCategories();
  }

  // ── Delete form (unchanged logic, same showConfirm/showToast wiring) ───────

  async function deleteForm(formId, title) {
    showConfirm(
      `Delete "${title}" permanently? This cannot be undone.`,
      async () => {
        try {
          const res = await fetch(apiUrl("/delete_form.php"), {
            method:  "POST",
            headers: csrfHeaders({ "Content-Type": "application/json" }),
            body:    JSON.stringify({ form_id: formId }),
            credentials: "include",
          });

          const result = await res.json();

          if (result.success) {
            showToast("Form deleted successfully.", "success");
            fetchForms();
          } else {
            showToast("Error deleting form.", "error");
          }
        } catch (err) {
          showToast("Failed to connect: " + err.message, "error");
        }
      }
    );
  }

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filteredForms = forms.filter((form) => {
    const matchesCategory =
      selectedCategory === "all" || form.category_id == selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      form.title?.toLowerCase().includes(q) ||
      form.description?.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  // ── Render: Loading ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="form-list-shell">
        <div className="form-list-loading">
          <div className="form-list-loading__dots">
            <span className="form-list-dot" />
            <span className="form-list-dot" />
            <span className="form-list-dot" />
          </div>
          <p>Loading your forms…</p>
        </div>
      </div>
    );
  }

  // ── Render: Error ──────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="form-list-shell">
        <div className="glass-card form-list-error">
          <p className="form-list-error__title">⚠ Could not load forms</p>
          <p className="form-list-error__message">{error}</p>
          <button
            className="glass-button glass-button--error"
            onClick={retryLoad}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Render: Main ───────────────────────────────────────────────────────────

  return (
    <div
      className={`form-list-shell ${isRefreshing ? "form-list-shell--refreshing" : ""}`}
    >

      <div className="form-list-header">
        <div>
          <h1 className="form-list-title">My Forms</h1>
          <p className="form-list-subtitle">
            {filteredForms.length === forms.length
              ? `${forms.length} form${forms.length !== 1 ? "s" : ""}`
              : `${filteredForms.length} of ${forms.length} forms`}
          </p>
        </div>

        <div className="form-list-controls">
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

          <button
            className={`glass-button refresh-button ${isRefreshing ? "refresh-button--active" : ""}`}
            disabled={isRefreshing}
            onClick={fetchForms}
          >
            {isRefreshing && <span className="refresh-button__spinner" aria-hidden="true" />}
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="form-list-search">
        <span className="form-list-search__icon">🔍</span>
        <input
          className="form-list-search__input"
          type="search"
          placeholder="Search forms by title or description…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="form-list-search__clear"
            onClick={() => setSearchQuery("")}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {filteredForms.length === 0 ? (
        <div className="form-list-empty">
          <div className="form-list-empty__icon">📋</div>
          <p className="form-list-empty__title">
            {forms.length === 0
              ? "No forms yet"
              : searchQuery.trim()
              ? "No forms match your search"
              : "No forms in this category"}
          </p>
          <p className="form-list-empty__message">
            {forms.length === 0
              ? "Create your first form to start collecting responses."
              : searchQuery.trim()
              ? "Try a different search term or clear the search."
              : "Try selecting a different category, or create a new form."}
          </p>
        </div>
      ) : (

        // ── Forms Grid ──────────────────────────────────────────────────────
        <div className="forms-grid">
          {filteredForms.map((form) => (
            <div key={form.id} className="glass-card">

              {/* Card header: title + category badge */}
              <div className="form-card-header">
                <h3 className="form-card-title">{form.title}</h3>
                <span
                  className={`category-badge ${
                    form.category_name
                      ? form.category_name.toLowerCase()
                      : "general"
                  }`}
                >
                  {form.category_name}
                </span>
              </div>

              {/* Description
                  We use a non-breaking space (\u00A0) as fallback so the
                  description area doesn't collapse when empty — keeps card
                  heights consistent across the grid. */}
              <p className="form-card-description">
                {form.description || "\u00A0"}
              </p>

              <div className="form-card-meta">
                <span className="form-card-meta__item">
                  📝 {form.question_count}{" "}
                  {form.question_count === 1 ? "question" : "questions"}
                </span>
                <span className="form-card-meta__divider">·</span>
                <span className="form-card-meta__item">
                  📅 {new Date(form.created_at).toLocaleDateString()}
                </span>
                <span className="form-card-meta__divider">·</span>
                <span className="form-card-meta__item">
                  📊 {form.response_count || 0}{" "}
                  {(form.response_count || 0) === 1 ? "response" : "responses"}
                </span>
              </div>

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
                View Responses
              </button>

            </div>
          ))}
        </div>
      )}

    </div>
  );
}

export default FormList;
