import { useState, useEffect } from 'react'

function FormViewer({ formId, onBack }) {
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchFormDetails()
  }, [formId])

  async function fetchFormDetails() {
    try {
      const response = await fetch(`http://localhost/form-builder-api/get_form_details.php?id=${formId}`)
      const result = await response.json()

      if (result.success) {
        setForm(result.form)
      } else {
        setError(result.error || 'Failed to load form')
      }
    } catch (err) {
      setError('Could not connect to server: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading form...</div>
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

  if (!form) {
    return <div style={{ padding: '20px' }}>Form not found</div>
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      {/* Header with Back Button */}
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
      </div>

      {/* Form Title and Info */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h1 style={{ margin: 0 }}>{form.title}</h1>
          <span style={{
            padding: '6px 12px',
            background: form.category_name === 'External' ? '#007bff' : 
                        form.category_name === 'Internal' ? '#28a745' : '#6c757d',
            color: 'white',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            {form.category_name}
          </span>
        </div>

        {form.description && (
          <p style={{ color: '#666', fontSize: '16px', margin: '10px 0' }}>
            {form.description}
          </p>
        )}

        <p style={{ color: '#888', fontSize: '14px', margin: '10px 0' }}>
          Created: {new Date(form.created_at).toLocaleString()}
        </p>
      </div>

      <hr />

      {/* Questions */}
      <h2>Questions ({form.questions.length})</h2>

      {form.questions.length === 0 ? (
        <p style={{ color: '#666' }}>No questions in this form.</p>
      ) : (
        <div>
          {form.questions.map((question, index) => (
            <div
              key={question.id}
              style={{
                background: '#f9f9f9',
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
                  {question.question_text}
                </span>
              </div>

              <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                Type: <em>{question.question_type}</em>
              </div>

              {question.options && question.options.length > 0 && (
                <div>
                  <strong style={{ fontSize: '14px' }}>Options:</strong>
                  <div style={{ marginTop: '8px' }}>
                    {question.options.map((option, optIndex) => (
                      <div
                        key={optIndex}
                        style={{
                          padding: '8px 12px',
                          background: '#fff',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          marginBottom: '5px',
                          display: 'inline-block',
                          marginRight: '10px'
                        }}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default FormViewer