import { useState, useEffect } from 'react'


function FormList( {onViewForm}) {
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [categories, setCategories] = useState([])

  // Fetch forms and categories when component loads
  useEffect(() => {
    fetchForms()
    fetchCategories()
  }, [])

  async function fetchForms() {
    try {
      const response = await fetch('http://localhost/form-builder-api/get_forms.php')
      const result = await response.json()

      if (result.success) {
        setForms(result.forms)
      } else {
        setError('Failed to load forms')
      }
    } catch (err) {
      setError('Could not connect to server: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchCategories() {
    try {
      const response = await fetch('http://localhost/form-builder-api/get_categories.php')
      const result = await response.json()
      
      if (result.success) {
        setCategories(result.categories)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  async function deleteForm(formId, formTitle) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${formTitle}"?\n\nThis will permanently delete the form and all its responses. This action cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    try {
      const response = await fetch('http://localhost/form-builder-api/delete_form.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ form_id: formId })
      })

      const result = await response.json()

      if (result.success) {
        alert('Form deleted successfully!')
        fetchForms()
      } else {
        alert('Error deleting form: ' + (result.error || 'Unknown error'))
      }

    } catch (error) {
      alert('Failed to connect to server: ' + error.message)
      console.error('Error:', error)
    }
  }

  // Filter forms by category
  const filteredForms = selectedCategory === 'all' 
    ? forms 
    : forms.filter(form => form.category_id == selectedCategory)

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading forms...</div>
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={fetchForms}>Try Again</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <div style={{alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0 }}>My Forms</h1>
          <p style={{ margin: '5px 0 0 0' }}>
            {selectedCategory === 'all' 
              ? `Showing all ${forms.length} form(s)` 
              : `Showing ${filteredForms.length} of ${forms.length} form(s)`
            }
          </p>
        </div>
        
        <div style={{display:'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <label>
            <strong>Filter by Category:</strong>
            <br />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ padding: '4px', fontSize: '14px', minWidth: '150px' }}
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {filteredForms.length === 0 ? (
  <p style={{ color: '#666' }}>No forms in this category.</p>
) : (
  <div className="forms-grid">
    {filteredForms.map((form) => (
      <div key={form.id} className="form-card">
        <div>
          <div className="form-card-header">
            <h3 className="form-card-title">{form.title}</h3>
            <span className={`category-badge ${form.category_name.toLowerCase()}`}>
              {form.category_name}
            </span>
          </div>
          
          {form.description && (
            <p className="form-card-description">
              {form.description}
            </p>
          )}
          
          <div className="form-card-meta">
            <div>📝 {form.question_count} question(s)</div>
            <div>🕐 {new Date(form.created_at).toLocaleDateString()}</div>
          </div>
        </div>

        <div className="form-card-buttons">
          <button className="btn-view" onClick={() => onViewForm(form.id)}>
            View
          </button>
          <button className="btn-edit">
            Edit
          </button>
          <button 
            className="btn-delete"
            onClick={() => deleteForm(form.id, form.title)}
          >
            Delete
          </button>
        </div>
      </div>
    ))}
  </div>
)}
      

      <button
        onClick={fetchForms}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          background: '#6c757d',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          borderRadius: '3px'
        }}
      >
        🔄 Refresh
      </button>
    </div>
  )
}

export default FormList