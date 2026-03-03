import { useState, useEffect } from 'react'

function FormDisplay({ formId }) {
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetchFormDetails()
  }, [formId])

  async function fetchFormDetails() {
    try {
      const response = await fetch(`http://localhost/form-builder-api/get_form_details.php?id=${formId}`)
      const result = await response.json()

      if (result.success) {
        setForm(result.form)
        // Initialize answers object with empty values
        const initialAnswers = {}
        result.form.questions.forEach(q => {
          initialAnswers[q.id] = ''
        })
        setAnswers(initialAnswers)
      } else {
        setError(result.error || 'Failed to load form')
      }
    } catch (err) {
      setError('Could not connect to server: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleAnswerChange(questionId, value) {
    setAnswers({
      ...answers,
      [questionId]: value
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    // Validate that all questions are answered
    const unansweredQuestions = form.questions.filter(q => !answers[q.id] || answers[q.id].trim() === '')
    
    if (unansweredQuestions.length > 0) {
      alert('Please answer all questions before submitting.')
      return
    }

    setSubmitting(true)

    // Prepare data for submission
    const submissionData = {
      form_id: formId,
      answers: form.questions.map(q => ({
        question_id: q.id,
        answer_text: answers[q.id]
      }))
    }

    try {
      const response = await fetch('http://localhost/form-builder-api/submit_response.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      })

      const result = await response.json()

      if (result.success) {
        setSubmitted(true)
      } else {
        alert('Error submitting form: ' + (result.error || 'Unknown error'))
      }
    } catch (error) {
      alert('Failed to connect to server: ' + error.message)
      console.error('Error:', error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading form...</div>
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    )
  }

  if (!form) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Form not found</div>
  }

  if (submitted) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1 style={{ color: '#28a745' }}>✓ Thank You!</h1>
        <p style={{ fontSize: '18px', marginTop: '20px' }}>
          Your response has been submitted successfully.
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px', maxWidth: '700px', margin: '0 auto' }}>
      {/* Form Header */}
      <div style={{ marginBottom: '40px', borderBottom: '3px solid #007bff', paddingBottom: '20px' }}>
        <h1 style={{ margin: '0 0 10px 0' }}>{form.title}</h1>
        {form.description && (
          <p style={{ color: '#666', fontSize: '16px', margin: '0' }}>
            {form.description}
          </p>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {form.questions.map((question, index) => (
          <div
            key={question.id}
            style={{
              marginBottom: '30px',
              padding: '20px',
              background: '#f9f9f99b',
              borderRadius: '5px',
              border: '1px solid #ddd'
            }}
          >
            {/* Question Text */}
            <label style={{ display: 'block', marginBottom: '15px' }}>
              <strong style={{ fontSize: '16px' }}>
                {index + 1}. {question.question_text}
              </strong>
              <span style={{ color: 'red', marginLeft: '5px' }}>*</span>
            </label>

            {/* Text Input */}
            {question.question_type === 'text' && (
              <input
                type="text"
                value={answers[question.id] || ''}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                style={{
                  width: '80%',
                  padding: '10px',
                  fontSize: '14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  margin: 'auto',
                }}
                placeholder="Your answer"
              />
            )}

            {/* Multiple Choice (Radio) */}
            {question.question_type === 'checkbox' && (
              <div>
                {question.options.map((option, optIndex) => (
                  <div key={optIndex} style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name={`question_${question.id}`}
                        value={option}
                        checked={answers[question.id] === option}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        style={{ marginRight: '10px' }}
                      />
                      <span>{option}</span>
                    </label>
                  </div>
                ))}
              </div>
            )}

            {/* Checkbox (Multiple Selection) */}
            {question.question_type === 'multiple_choice' && (
              <div>
                {question.options.map((option, optIndex) => (
                  <div key={optIndex} style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        value={option}
                        checked={(answers[question.id] || '').split(',').includes(option)}
                        onChange={(e) => {
                          const currentAnswers = answers[question.id] ? answers[question.id].split(',') : []
                          let newAnswers
                          if (e.target.checked) {
                            newAnswers = [...currentAnswers, option]
                          } else {
                            newAnswers = currentAnswers.filter(a => a !== option)
                          }
                          handleAnswerChange(question.id, newAnswers.join(','))
                        }}
                        style={{ marginRight: '10px' }}
                      />
                      <span>{option}</span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '15px 40px',
            fontSize: '16px',
            background: submitting ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: submitting ? 'not-allowed' : 'pointer',
            width: '100%',
            fontWeight: 'bold'
          }}
        >
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  )
}

export default FormDisplay