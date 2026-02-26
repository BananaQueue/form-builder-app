import { useState } from 'react'
import FormBuilder from './FormBuilder'
import FormList from './FormList'
import FormViewer from './FormViewer'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('list')
  const [viewingFormId, setViewingFormId] = useState(null)

  function handleViewForm(formId) {
    setViewingFormId(formId)
    setCurrentPage('view')
  }

  function handleBackToList() {
    setViewingFormId(null)
    setCurrentPage('list')
  }

  return (
    <div>
      {/* Navigation Bar */}
      <nav style={{
        background: '#343a40',
        padding: '15px 30px',
        marginBottom: '20px'
      }}>
        <h2 style={{ color: 'white', margin: '0 0 15px 0' }}>Form Builder System</h2>
        
        <div>
          <button
            onClick={() => setCurrentPage('list')}
            style={{
              padding: '10px 20px',
              marginRight: '10px',
              background: currentPage === 'list' ? '#007bff' : '#6c757d',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '3px'
            }}
          >
            📋 My Forms
          </button>
          
          <button
            onClick={() => setCurrentPage('create')}
            style={{
              padding: '10px 20px',
              background: currentPage === 'create' ? '#007bff' : '#6c757d',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '3px'
            }}
          >
            ➕ Create New Form
          </button>
        </div>
      </nav>

      {/* Page Content */}
      <div>
        {currentPage === 'list' && <FormList onViewForm={handleViewForm} />}
        {currentPage === 'create' && <FormBuilder />}
        {currentPage === 'view' && <FormViewer formId={viewingFormId} onBack={handleBackToList} />}
      </div>
    </div>
  )
}

export default App