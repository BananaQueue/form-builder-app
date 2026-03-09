import { useState } from 'react'
import FormBuilder from './FormBuilder'
import FormList from './FormList'
import FormViewer from './FormViewer'
import FormDisplay from './FormDisplay'
import ResponseList from './ResponseList'
import ResponseViewer from './ResponseViewer'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('list')
  const [viewingFormId, setViewingFormId] = useState(null)
  const [displayFormId, setDisplayFormId] = useState(null)
  const [responsesFormId, setResponsesFormId] = useState(null)
  const [viewingResponseId, setViewingResponseId] = useState(null)
  const [editingFormId, setEditingFormId] = useState(null)

  function handleDisplayForm(formId) {
  setDisplayFormId(formId)
  setCurrentPage('display')
  }

  function handleViewForm(formId) {
    setViewingFormId(formId)
    setCurrentPage('view')
  }

  function handleBackToList() {
    setViewingFormId(null)
    setCurrentPage('list')
  }

  function handleEditForm(formId) {
  setEditingFormId(formId)
  setCurrentPage('edit')
}

function handleEditComplete() {
  setEditingFormId(null)
  setCurrentPage('list')
}

function handleViewResponses(formId) {
  setResponsesFormId(formId)
  setCurrentPage('responses')
}

function handleViewResponseDetail(responseId) {
  setViewingResponseId(responseId)
  setCurrentPage('response-detail')
}

function handleBackToResponses() {
  setViewingResponseId(null)
  setCurrentPage('responses')
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
        {currentPage === 'list' && <FormList onViewForm={handleViewForm} onViewResponses={handleViewResponses} onEditForm={handleEditForm}   />}
        {currentPage === 'create' && <FormBuilder />}
        {currentPage === 'edit' && <FormBuilder editFormId={editingFormId} onSaveComplete={handleEditComplete} />}
        {currentPage === 'view' && <FormViewer formId={viewingFormId} onBack={handleBackToList} onDisplayForm={handleDisplayForm}/>}
        {currentPage === 'display' && <FormDisplay formId={displayFormId} />}
        {currentPage === 'responses' && <ResponseList formId={responsesFormId} onBack={handleBackToList} onViewResponse={handleViewResponseDetail} />}
        {currentPage === 'response-detail' && <ResponseViewer responseId={viewingResponseId} onBack={handleBackToResponses} />}
      </div>
    </div>
  )
}

export default App