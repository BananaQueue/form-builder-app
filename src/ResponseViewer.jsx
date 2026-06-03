// src/ResponseViewer.jsx
//
// WHAT CHANGED FROM THE ORIGINAL:
// ─────────────────────────────────────────────────────────────────────────────
// 1. All inline style={{ ... }} replaced with CSS class names.
//    Uses the new .rv-* namespace (Response Viewer).
//
// 2. The section block rendering uses .rv-section-block instead of
//    a large inline style object (background, backdropFilter, borderRadius,
//    border, boxShadow, and three nested span styles).
//
// 3. Each answer card uses .rv-answer-card instead of an inline style
//    object. The answer value area uses .rv-answer-value.
//
// 4. The question counter (let questionCounter = 0) logic is unchanged —
//    it still correctly skips section blocks when numbering questions.
//
// 5. The isRefreshing state and refreshing-background class are unchanged —
//    this was already using a CSS class correctly in the original.
//
// ALL LOGIC IS IDENTICAL TO THE ORIGINAL:
// - fetchResponseDetails() is unchanged
// - useEffect with responseId dependency is unchanged
// - onBack prop wiring is unchanged
// - The section vs regular answer branching logic is unchanged
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { apiUrl } from './apiBase'

function ResponseViewer({ responseId, onBack, isSuperAdmin = false }) {
  const [response, setResponse]       = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // ── Data fetching (unchanged) ──────────────────────────────────────────────

  useEffect(() => {
    const controller = new AbortController()

    async function fetchResponseDetails() {
      setLoading(true)
      setError(null)
      setResponse(null)
      setIsRefreshing(true)

      try {
        const res = await fetch(
          apiUrl(`/get_response_details.php?id=${responseId}${isSuperAdmin ? '&admin_override=1' : ''}`),
          { credentials: 'include', signal: controller.signal }
        )
        const result = await res.json()
        if (result.success) {
          setResponse(result.response)
        } else {
          setError(result.error || 'Failed to load response')
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError('Could not connect to server: ' + err.message)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
          setTimeout(() => setIsRefreshing(false), 1000)
        }
      }
    }

    if (responseId) fetchResponseDetails()
    return () => controller.abort()
  }, [responseId, isSuperAdmin])

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="rv-shell">
        <p className="rv-meta">Loading response…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rv-shell">
        <div className="rv-error">
          <p className="rv-error__text">{error}</p>
          <button className="glass-button" onClick={onBack}>← Back</button>
        </div>
      </div>
    )
  }

  if (!response) {
    return (
      <div className="rv-shell">
        <p className="rv-meta">Response not found.</p>
      </div>
    )
  }

  // ── Main render ────────────────────────────────────────────────────────────

  const answers = Array.isArray(response?.answers) ? response.answers : []

  // This counter tracks the question number shown to the user.
  // It increments only for real questions, not section blocks.
  // Declared here (outside the map) so it persists across iterations.
  let questionCounter = 0

  return (
    <div className={`rv-shell ${isRefreshing ? 'refreshing-background' : ''}`}>

      {/* ── Action bar ──────────────────────────────────────────────────── */}
      <div className="rv-action-bar">
        <button className="glass-button" onClick={onBack}>
          ← Back to Responses
        </button>
      </div>

      {/* ── Response header ─────────────────────────────────────────────── */}
      <div className="rv-header">
        <h1 className="rv-title">Response Details</h1>
        <div className="rv-header__meta">
          <span className="rv-header__item">
            Form: <strong>{response.form_title}</strong>
          </span>
          <span className="rv-header__divider">·</span>
          <span className="rv-header__item">
            Submitted: <strong>
              {new Date(response.submitted_at).toLocaleString()}
            </strong>
          </span>
        </div>
      </div>

      <hr className="rv-divider" />

      <h2 className="rv-answers-heading">Answers</h2>

      {answers.length === 0 ? (
        <p className="rv-meta">
          No answers were found for this response. The submission record exists,
          but there are no linked rows in the answers table for response #{response.id}.
        </p>
      ) : (
      <div className="rv-answer-list">
        {answers.map((answer) => {

          // ── Section block ────────────────────────────────────────────────
          // Section blocks appear as visual dividers between groups of
          // answers. They have no answer data to show — just the section
          // title. They don't get a question number.
          //
          // BEFORE: a div with ~10 inline style properties
          // AFTER:  <div className="rv-section-block">
          if (answer.question_type === 'section') {
            return (
              <div key={answer.id} className="rv-section-block">
                <span className="rv-section-block__label">
                  Section
                </span>
                <span className="rv-section-block__title">
                  {answer.question_text}
                </span>
              </div>
            )
          }

          // ── Regular answer card ──────────────────────────────────────────
          // Only real questions get a number — section blocks are skipped.
          questionCounter++

          return (
            <div key={answer.id} className="rv-answer-card">

              {/* Question number + text */}
              <div className="rv-answer-card__question">
                <span className="rv-answer-card__number">
                  Q{questionCounter}
                </span>
                <span className="rv-answer-card__text">
                  {answer.question_text}
                </span>
              </div>

              {/* Question type label */}
              <div className="rv-answer-card__type">
                {answer.question_type}
              </div>

              {/* Answer value */}
              <div className="rv-answer-value">
                <span className="rv-answer-value__label">Answer</span>
                <p className="rv-answer-value__text">
                  {answer.answer_text
                    ? answer.answer_text
                    : <em className="rv-answer-value__empty">No answer provided</em>
                  }
                </p>
              </div>

            </div>
          )
        })}
      </div>
      )}

    </div>
  )
}

export default ResponseViewer