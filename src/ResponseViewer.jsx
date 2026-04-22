import { useState, useEffect } from 'react'
import { apiUrl } from './apiBase'

function ResponseViewer({ responseId, onBack }) {
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function fetchResponseDetails() {
    setIsRefreshing(true);
    try {
      const res = await fetch(apiUrl(`/get_response_details.php?id=${responseId}`))
      const result = await res.json()
      if (result.success) {
        setResponse(result.response)
      } else {
        setError(result.error || 'Failed to load response')
      }
    } catch (err) {
      setError('Could not connect to server: ' + err.message)
    } finally {
      setLoading(false)
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  }

  useEffect(() => {
    fetchResponseDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responseId])

  if (loading) {
    return <div className="fv-shell"><p className="fv-meta">Loading response...</p></div>
  }

  if (error) {
    return (
      <div className="fv-shell">
        <div className="fv-paper">
          <p style={{ color: "#c0392b" }}>{error}</p>
          <button className="glass-button" onClick={onBack}>← Back to List</button>
        </div>
      </div>
    )
  }

  if (!response) {
    return <div className="fv-shell"><p className="fv-meta">Response not found</p></div>
  }

  // Separate counter so section blocks don't affect question numbering
  let questionCounter = 0;

  return (
    <div className={`fv-shell ${isRefreshing ? 'refreshing-background' : ''}`}>

      {/* Header */}
      <div className="fv-action-bar">
        <button onClick={onBack} className="glass-button">← Back to Responses</button>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ margin: '0 0 10px 0' }}>Response Details</h1>
        <p style={{ color: '#ffffff', fontSize: '14px' }}>
          Form: <strong>{response.form_title}</strong>
        </p>
        <p style={{ color: '#ffffff', fontSize: '14px' }}>
          Submitted: <strong>{new Date(response.submitted_at).toLocaleString()}</strong>
        </p>
      </div>

      <hr />

      <h2>Answers</h2>

      {response.answers.map((answer) => {

        // ── Section block ───────────────────────────────────────────────
        // Sections have no answer to display. We render them as a
        // glassmorphism divider that mirrors the public form appearance,
        // so the response viewer feels visually consistent with the form.
        if (answer.question_type === 'section') {
          return (
            <div
              key={answer.id}
              style={{
                marginBottom: '20px',
                marginTop: '10px',
                padding: '14px 20px',
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.30)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
              }}
            >
              {/* Small SECTION label */}
              <span style={{
                display: 'block',
                fontSize: '0.65em',
                fontWeight: '700',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgb(2, 29, 129)',
                marginBottom: '4px',
              }}>
                Section Block/ Divider
              </span>
              {/* Section title */}
              <span style={{
                fontSize: '1em',
                fontWeight: '700',
                color: '#ffffff',
              }}>
                {answer.question_text}
              </span>
            </div>
          );
        }

        // ── Regular answer ──────────────────────────────────────────────
        // Only real questions get a number
        questionCounter++;

        return (
          <div
            key={answer.id}
            style={{
              background: '#f9f9f994',
              padding: '20px',
              marginBottom: '20px',
              border: '1px solid #ddd',
              borderRadius: '5px'
            }}
          >
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ fontSize: '16px' }}>
                Question {questionCounter}:
              </strong>
              <span style={{ fontSize: '16px', marginLeft: '10px' }}>
                {answer.question_text}
              </span>
            </div>

            <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
              Type: <em>{answer.question_type}</em>
            </div>

            <div style={{
              padding: '15px',
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: '4px',
              color: '#333',
              fontWeight: '500'
            }}>
              <strong>Answer:</strong>
              <p style={{ margin: '5px 0 0 0' }}>
                {answer.answer_text || <em style={{ color: '#aaa' }}>No answer provided</em>}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  )
}

export default ResponseViewer