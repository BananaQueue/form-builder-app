import { useState, useEffect } from 'react'

function ResponseViewer({ responseId, onBack }) {
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchResponseDetails()
  }, [responseId])

  async function fetchResponseDetails() {
    try {
      const res = await fetch(`http://localhost/form-builder-api/get_response_details.php?id=${responseId}`)
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
    }
  }

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading response...</div>
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={onBack} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          Back
        </button>
      </div>
    )
  }

  if (!response) {
    return <div style={{ padding: '20px' }}>Response not found</div>
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={onBack}
          style={{
            padding: '10px 20px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '3px'
          }}
        >
          ← Back to Responses
        </button>
      </div>

      {/* Response Info */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ margin: '0 0 10px 0' }}>Response Details</h1>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Form: <strong>{response.form_title}</strong>
        </p>
        <p style={{ color: '#666', fontSize: '14px' }}>
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