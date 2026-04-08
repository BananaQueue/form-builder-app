import { useState, useEffect } from "react";
import { apiUrl } from "./apiBase";

function FormViewer({ formId, onBack, onDisplayForm }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function copyPublicLink() {
    const publicUrl = `${window.location.origin}/form/${form.form_code || formId}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicUrl);
        alert("Link copied!\n\n" + publicUrl);1
        return;
      }
      throw new Error("Clipboard API unavailable");
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = publicUrl;
        textarea.setAttribute("readonly", "");
        textarea.style.cssText = "position:fixed;top:0;left:0;opacity:0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        alert(
          ok
            ? "Link copied!\n\n" + publicUrl
            : "Copy failed. Copy manually:\n\n" + publicUrl,
        );
      } catch {
        alert("Copy failed. Copy manually:\n\n" + publicUrl);
      }
    }
  }

  async function fetchFormDetails() {
    try {
      const response = await fetch(
        apiUrl(`/get_form_details.php?id=${formId}`),
      );
      const result = await response.json();
      if (result.success) {
        setForm(result.form);
        console.log("Question sample:", result.form.questions[0]); // 👈 temporary
      } else {
        setError(result.error || "Failed to load form");
      }
    } catch (err) {
      setError("Could not connect to server: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (formId) fetchFormDetails();
  }, [formId]);

  // ── Loading / error / empty states ──────────────────────────────────────────
  // These three guards run before the main render.
  // If any of them match, we return early — the main JSX below never runs.

  if (loading) {
    return (
      <div className="fv-shell">
        <p className="fv-meta">Loading form...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fv-shell">
        <div className="fv-paper">
          <p style={{ color: "#c0392b" }}>{error}</p>
          <button className="glass-button" onClick={onBack}>
            ← Back to List
          </button>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="fv-shell">
        <p className="fv-meta">Form not found.</p>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    // fv-shell: centers the paper card on the page with breathing room
    <div className="fv-shell">
      {/* Action bar — sits ABOVE the paper, outside it intentionally.
          These are navigation/utility actions, not form content. */}
      <div className="fv-action-bar">
        <button
          className="glass-button"
          style={{ backgroundColor: "rgba(100,100,100,0.40)" }}
          onClick={onBack}
        >
          ← Back
        </button>
        <button
          className="glass-button"
          style={{ backgroundColor: "rgba(46,204,113,0.55)" }}
          onClick={() => {
            const publicUrl = `${window.location.origin}/form/${form.form_code || formId}`;
            window.open(publicUrl, '_blank');
          }}
        >
          📝 Fill Out
        </button>
        <button
          className="glass-button"
          style={{ backgroundColor: "rgba(52,152,219,0.55)" }}
          onClick={copyPublicLink}
        >
          🔗 Copy Link
        </button>
      </div>

      {/* fv-paper: the white "sheet of paper" that holds all form content */}
      <div className="fv-paper">
        {/* ── Form header ── */}
        <div className="fv-header">
          <div className="fv-title-row">
            <h1 className="fv-title">{form.title}</h1>
            {/* Reusing the category-badge class we already built */}
            {form.category_name && (
              <span
                className={`category-badge ${form.category_name.toLowerCase()}`}
              >
                {form.category_name}
              </span>
            )}
          </div>

          {form.description && (
            <p className="fv-description">{form.description}</p>
          )}

          <p className="fv-meta">
            Created: {new Date(form.created_at).toLocaleString()}
          </p>
        </div>

        {/* ── Divider ── */}
        <div className="fv-divider" />

        {/* ── Questions ── */}
        <div className="fv-questions-header">
          <h2 className="fv-section-title">Questions</h2>
          <span
            style={{ backgroundColor: "#ffffff" }}
            className="fv-question-count"
          >
            {form.questions.length}
          </span>
        </div>

        {form.questions.length === 0 ? (
          <p className="fv-meta">No questions in this form yet.</p>
        ) : (
          <div className="fv-question-list">
            {form.questions.map((question, index) => (
              // Each question is its own self-contained block.
              // The left accent border is the visual signal that this is one unit.
              <div key={question.id} className="fv-question-card">
                {/* Top row: question number + text */}
                <div className="fv-question-top">
                  <div style={{ flex: 1, display: "flex", gap: "12px", alignItems: "center" }}>
                  <span className="fv-question-number">Q{index + 1}</span>
                  <span className="fv-question-text">
                    {question.question_text}
                  </span>
                  </div>
                  <span className="fv-question-type">Type: {question.question_type}</span>
                </div>

                {/* Badges row — required and/or condition */}
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    marginBottom: "10px",
                  }}
                >
                  {/* Required badge — only shows if is_required is 1 */}
                  {question.is_required === 1 && (
                    <span className="fv-badge fv-badge-required">Required</span>
                  )}

                  {/* Condition badge — only shows if this question depends on another */}
                  {question.condition_question_id !== null && (
                    <span className="fv-badge fv-badge-condition">
                      {(() => {
                        // Find which question in the list has the matching id
                        const referencedIndex = form.questions.findIndex(
                          (q) => q.id === question.condition_question_id,
                        );
                        // findIndex returns -1 if nothing matched — guard against that
                        const label =
                          referencedIndex !== -1
                            ? `Q${referencedIndex + 1}`
                            : "another question";
                        return `Shown when ${label} ${question.condition_type} "${question.condition_value}"`;
                      })()}
                    </span>
                  )}
                </div>

                {/* Options — only for question types that have them */}
                {question.options && question.options.length > 0 && (
                  <div className="fv-options">
                    {question.options.map((option, optIndex) => (
                      <span key={optIndex} className="fv-option-pill">
                        {option}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FormViewer;
