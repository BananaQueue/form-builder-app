import { useState, useEffect } from 'react'

function ResponseList({ formId, onBack, onViewResponse }) {
  const [form, setForm] = useState(null)
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchResponses()
  }, [formId])

  async function fetchResponses() {
    try {
      const response = await fetch(`http://localhost/form-builder-api/get_responses.php?form_id=${formId}`)
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

  function handleExport() {
  // Create a link to the export endpoint
  const exportUrl = `http://localhost/form-builder-api/export_responses.php?form_id=${formId}`
  
  // Open in new window to trigger download
  window.open(exportUrl, '_blank')
}

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading responses...</div>
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={onBack} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          Back to List
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '900px' }}>
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
          ← Back to List
        </button>
        <button
            onClick={handleExport}
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
        <p style={{ color: '#666', fontSize: '16px' }}>
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