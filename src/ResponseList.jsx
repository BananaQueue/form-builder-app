import { useState, useEffect } from 'react'
import { apiUrl, API_BASE } from './apiBase'

function ResponseList({ formId, onBack, onViewResponse }) {
  const [form, setForm] = useState(null)
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchResponses() {
    try {
      const response = await fetch(apiUrl(`/get_responses.php?form_id=${formId}`))
      const result = await response.json()

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
    // we intentionally don't include fetchResponses in deps
    // to avoid re-creating it on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId])

  function handleExport() {
  // Create a link to the export endpoint
  const exportUrl = `${API_BASE}/export_responses.php?form_id=${formId}`
  
  // Open in new window to trigger download
  window.open(exportUrl, '_blank')
}

  if (loading) {
    return <div className="fv-shell">
      <p className="fv-meta">Loading responses...</p>
      </div>
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

  return (
    <div className="fv-shell">
      {/* Header */}
      <div className="fv-action-bar">
        <button
          className="glass-button"
          style={{ backgroundColor: "rgba(100,100,100,0.40)" }}
          onClick={onBack}
        >
          ← Back to List
        </button>
        <button
            onClick={handleExport}
            className="glass-button"
            disabled={responses.length === 0}
            style={{
            padding: '10px 20px',
            background: responses.length === 0 ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            cursor: responses.length === 0 ? 'not-allowed' : 'pointer',
            borderRadius: '3px'
            }}
        >
    📥 Export to CSV
        </button>
      </div>

      {/* Form Info */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ margin: '0 0 10px 0' }}>Responses: {form.title}</h1>
        <p style={{ color: '#ffffff', fontSize: '16px' }}>
          Total Responses: <strong>{responses.length}</strong>
        </p>
      </div>

      <hr />

      {/* Responses List */}
      {responses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p style={{ fontSize: '18px' }}>No responses yet.</p>
          <p>Share this form to start collecting responses!</p>
        </div>
      ) : (
        <div>
          {responses.map((response, index) => (
            <div
              key={response.id}
              style={{
                background: '#f9f9f9',
                padding: '20px',
                marginBottom: '15px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <strong style={{ fontSize: '16px', color: '#333' }}>Response #{index + 1}</strong>
                <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
                  Submitted: {new Date(response.submitted_at).toLocaleString()}
                </p>
                <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '14px' }}>
                  {response.answer_count} answer(s)
                </p>
              </div>

              <button
                onClick={() => onViewResponse(response.id)}
                style={{
                  padding: '10px 20px',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '3px'
                }}
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