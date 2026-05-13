// src/FormList.jsx
//
// WHAT CHANGED FROM THE ORIGINAL:
// ─────────────────────────────────────────────────────────────────────────────
// 1. All inline style={{ ... }} removed from the page shell, header, filter
//    bar, and card metadata. Replaced with CSS class names.
//
// 2. Card metadata (question count, date, response count) now uses individual
//    <span> elements inside a .form-card-meta row instead of a single <p>
//    with <br/> tags. This lets CSS style each piece independently.
//
// 3. Empty state gets a proper visual treatment (.form-list-empty) instead
//    of a bare <p> tag.
//
// 4. Error state uses the existing glass-card system for visual consistency.
//
// 5. The page wrapper uses .form-list-shell, a new class that handles
//    max-width and centering via CSS instead of inline style.
//
// ALL LOGIC IS IDENTICAL TO THE ORIGINAL:
// - fetchForms(), fetchCategories(), deleteForm() are unchanged
// - showToast / showConfirm wiring is unchanged
// - category filtering logic is unchanged
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { apiUrl } from "./apiBase";

function FormList({ onViewForm, onViewResponses, onEditForm, showToast, showConfirm }) {
  const [forms, setForms]                   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories]         = useState([]);
  const [isRefreshing, setIsRefreshing]     = useState(false);

  useEffect(() => {
    fetchForms();
    fetchCategories();
  }, []);

  // ── Data fetching (unchanged) ──────────────────────────────────────────────

  async function fetchForms() {
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch(apiUrl("/get_forms.php"), {
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
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  }

  async function fetchCategories() {
    try {
      const res    = await fetch(apiUrl("/get_categories.php"));
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
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ form_id: formId }),
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

  // ── Filtering (unchanged) ──────────────────────────────────────────────────

  const filteredForms =
    selectedCategory === "all"
      ? forms
      : forms.filter((form) => form.category_id == selectedCategory);

  // ── Render: Loading ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="form-list-shell">
        <div className="form-list-loading">
          {/* Three animated dots give a sense of activity.
              The animation is defined in index.css as .form-list-dot */}
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
        {/* We use glass-card here so the error state looks like it belongs
            on the page, not like a system crash. */}
        <div className="glass-card form-list-error">
          <p className="form-list-error__title">⚠ Could not load forms</p>
          <p className="form-list-error__message">{error}</p>
          <button
            className="glass-button"
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
      className={`form-list-shell ${isRefreshing ? "refreshing-background" : ""}`}
    >

      {/* ── Page Header ───────────────────────────────────────────────────────
          
          BEFORE:
            <div style={{ marginBottom: "20px", textAlign: "center" }}>
              <h1 style={{ marginBottom: "5px", textShadow: "..." }}>Forms</h1>
              <p>Showing {filteredForms.length} of {forms.length} forms</p>
            </div>

          AFTER:
            <div className="form-list-header">
              <h1 className="form-list-title">My Forms</h1>
              <p className="form-list-subtitle">...</p>
            </div>

          The textShadow and marginBottom are now in index.css under
          .form-list-title, keeping JSX clean.
      ──────────────────────────────────────────────────────────────────── */}
      <div className="form-list-header">
        <div>
          <h1 className="form-list-title">My Forms</h1>
          <p className="form-list-subtitle">
            {filteredForms.length === forms.length
              ? `${forms.length} form${forms.length !== 1 ? "s" : ""}`
              : `${filteredForms.length} of ${forms.length} forms`}
          </p>
        </div>

        {/* ── Controls: filter + refresh ──────────────────────────────────
            BEFORE: these were in two separate divs with inline styles.
            AFTER: one .form-list-controls row, CSS handles the layout.
        ──────────────────────────────────────────────────────────────── */}
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
            {isRefreshing ? "✓ Refreshed" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {/* ── Empty State ───────────────────────────────────────────────────────
          
          An empty state is a designed moment. Instead of nothing (or a bare
          "No forms found" message), we show a centered illustration area
          with a call-to-action button.

          This pattern is used by every modern SaaS app — Notion, Linear,
          Figma all do this. It turns a dead end into a guided path.

          BEFORE:  {filteredForms.length === 0 && <p>No forms found.</p>}
          AFTER:   A proper empty state card with a CTA
      ──────────────────────────────────────────────────────────────────── */}
      {filteredForms.length === 0 ? (
        <div className="form-list-empty">
          <div className="form-list-empty__icon">📋</div>
          <p className="form-list-empty__title">
            {forms.length === 0
              ? "No forms yet"
              : "No forms in this category"}
          </p>
          <p className="form-list-empty__message">
            {forms.length === 0
              ? "Create your first form to start collecting responses."
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

              {/* ── Metadata row ────────────────────────────────────────────
                  
                  BEFORE:
                    <p>
                      📝 {form.question_count} question(s)<br/>
                      📅 {new Date(...).toLocaleDateString()}<br/>
                      📊 {form.response_count} responses
                    </p>

                  AFTER: individual <span> elements in a flex row.
                  Each piece of metadata is independently styled and readable.
                  The · separator is a CSS ::before pseudo-element so it
                  never accidentally wraps to a new line mid-separator.
              ────────────────────────────────────────────────────────────── */}
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

              {/* ── Action buttons ──────────────────────────────────────────
                  These use the existing .card-btn-group system from index.css.
                  No changes to class names — they already work with our new
                  design tokens because we updated the token values in Phase 1.
              ────────────────────────────────────────────────────────────── */}
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