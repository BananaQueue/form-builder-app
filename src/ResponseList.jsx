// src/ResponseList.jsx
//
// WHAT CHANGED FROM THE ORIGINAL:
// ─────────────────────────────────────────────────────────────────────────────
// 1. All inline style={{ ... }} replaced with CSS class names.
//    Uses the new .rl-* namespace (Response List).
//
// 2. The export button no longer uses inline style for its disabled/active
//    color states. Instead it uses .rl-export-btn and
//    .rl-export-btn--disabled modifier classes.
//
// 3. Each response row uses .rl-response-row instead of an inline style
//    object with display, justifyContent, background, padding, etc.
//
// 4. The empty state gets a proper .rl-empty treatment instead of a
//    bare centered <div> with inline padding and color.
//
// ALL LOGIC IS IDENTICAL TO THE ORIGINAL:
// - fetchResponses() is unchanged
// - handleExport() (window.open to export URL) is unchanged
// - onBack / onViewResponse prop wiring is unchanged
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { apiUrl, API_BASE } from './apiBase'

function ResponseList({ formId, onBack, onViewResponse, isSuperAdmin = false }) {
  const [form, setForm]           = useState(null)
  const [responses, setResponses] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  // ── Data fetching (unchanged) ──────────────────────────────────────────────

  async function fetchResponses() {
    try {
      const response = await fetch(apiUrl(`/get_responses.php?form_id=${formId}${isSuperAdmin ? '&admin_override=1' : ''}`), { credentials: 'include' })
      const result   = await response.json()

      if (result.success) {
        setForm(result.form)
        setResponses(result.responses)
      } else {
        setError(result.error || 'Failed to load responses')
      }
    } catch (err) {
      setError('Could not connect to server: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResponses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId])

  // ── Export handler (unchanged) ─────────────────────────────────────────────

  function handleExport() {
    const exportUrl = `${API_BASE}/export_responses.php?form_id=${formId}${isSuperAdmin ? '&admin_override=1' : ''}`
    window.open(exportUrl, '_blank')
  }

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="rl-shell">
        <div className="form-list-loading">
          <div className="form-list-loading__dots">
            <span className="form-list-dot" />
            <span className="form-list-dot" />
            <span className="form-list-dot" />
          </div>
          <p>Loading responses...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rl-shell">
        <div className="rl-error">
          <p className="rl-error__text">{error}</p>
          <button className="glass-button" onClick={onBack}>← Back</button>
        </div>
      </div>
    )
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="rl-shell">

      {/* ── Action bar ──────────────────────────────────────────────────────
          Two buttons: Back (left) and Export CSV (right).
          The export button is disabled when there are no responses.

          BEFORE:
            <button style={{
              padding: '10px 20px',
              background: responses.length === 0 ? '#ccc' : '#28a745',
              color: 'white',
              ...
            }}>

          AFTER:
            <button className={`rl-export-btn ${
              responses.length === 0 ? 'rl-export-btn--disabled' : ''
            }`}>

          The disabled/active appearance is now in CSS, not JSX.
      ──────────────────────────────────────────────────────────────────── */}
      <div className="rl-action-bar">
        <button className="glass-button" onClick={onBack}>
          ← Back
        </button>

        <button
          className={`rl-export-btn ${
            responses.length === 0 ? 'rl-export-btn--disabled' : ''
          }`}
          onClick={handleExport}
          disabled={responses.length === 0}
        >
          📥 Export CSV
        </button>
      </div>

      {/* ── Page header ─────────────────────────────────────────────────────
          Form title and total response count.
          The hr acts as a visual break between header and content.
      ──────────────────────────────────────────────────────────────────── */}
      <div className="rl-header">
        <h1 className="rl-title">
          {form.title}
        </h1>
        <p className="rl-subtitle">
          {responses.length === 0
            ? 'No responses yet'
            : `${responses.length} ${responses.length === 1 ? 'response' : 'responses'}`
          }
        </p>
      </div>

      <hr className="rl-divider" />

      {/* ── Response list or empty state ─────────────────────────────────── */}
      {responses.length === 0 ? (

        // ── Empty state ─────────────────────────────────────────────────────
        <div className="rl-empty">
          <div className="rl-empty__icon">📭</div>
          <p className="rl-empty__title">No responses yet</p>
          <p className="rl-empty__message">
            Share the form link to start collecting responses.
          </p>
        </div>

      ) : (

        // ── Response rows ───────────────────────────────────────────────────
        <div className="rl-response-list">
          {responses.map((response, index) => (

            // Each row shows: response number, date, and a View Details button
            <div key={response.id} className="rl-response-row">

              <div className="rl-response-row__info">
                <span className="rl-response-row__number">
                  Response #{index + 1}
                </span>
                <span className="rl-response-row__date">
                  {new Date(response.submitted_at).toLocaleString()}
                </span>
              </div>

              <button
                className="rl-view-btn"
                onClick={() => onViewResponse(response.id)}
              >
                View Details
              </button>

            </div>
          ))}
        </div>
      )}

    </div>
  )
}

export default ResponseList
