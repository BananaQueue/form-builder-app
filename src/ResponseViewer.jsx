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
      // Keep animation visible for a moment
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    }
  }

  useEffect(() => {
    fetchResponseDetails()
    // we intentionally don't include fetchResponseDetails in deps
    // to avoid re-creating it on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responseId])

  if (loading) {
    return <div className="fv-shell">
      <p className="fv-meta">Loading response...</p>
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
    )
  }

  if (!response) {
    return <div className="fv-shell">
      <p className="fv-meta">Response not found</p>
    </div>
  }

  return (
    <div 
    className={`fv-shell ${isRefreshing ? 'refreshing-background' : ''}`}>
      {/* Header */}
      <div className="fv-action-bar">
        <button
          onClick={onBack}
          className="glass-button"
        >
          ← Back to Responses
        </button>
      </div>

      {/* Response Info */}
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

      {/* Answers */}
      <h2>Answers</h2>
      
      {response.answers.map((answer, index) => (
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
              Question {index + 1}:
            </strong>
            <span style={{ fontSize: '16px', marginLeft: '10px' }}>
              {answer.question_text}
            </span>
          </div>

          <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            Type: <em>{answer.question_type}</em>
          </div>

          <div
            style={{
              padding: '15px',
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: '4px',
              color: '#333',
              fontWeight: '500'
            }}
          >
            <strong>Answer:</strong>
            <p style={{ margin: '5px 0 0 0' }}>{answer.answer_text}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ResponseViewer