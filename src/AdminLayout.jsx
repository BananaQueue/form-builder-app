import { Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import { useState } from 'react'
import FormBuilder from './FormBuilder'
import FormList from './FormList'
import FormViewer from './FormViewer'
import ResponseList from './ResponseList'
import ResponseViewer from './ResponseViewer'

function AdminLayout() {
  const navigate = useNavigate()
  const [viewingFormId, setViewingFormId] = useState(null)
  const [editingFormId, setEditingFormId] = useState(null)
  const [responsesFormId, setResponsesFormId] = useState(null)
  const [viewingResponseId, setViewingResponseId] = useState(null)

  function handleViewForm(formId) {
    setViewingFormId(formId)
    navigate('/view')
  }

  function handleEditForm(formId) {
    setEditingFormId(formId)
    navigate('/edit')
  }

  function handleViewResponses(formId) {
    setResponsesFormId(formId)
    navigate('/responses')
  }

  function handleViewResponseDetail(responseId) {
    setViewingResponseId(responseId)
    navigate('/response-detail')
  }

  function handleBackToList() {
    navigate('/')
  }

  function handleDisplayForm(formId) {
    // Take the admin to the public form URL (no admin chrome)
    navigate(`/form/${formId}`)
  }

  function handleEditComplete() {
    setEditingFormId(null)
    navigate('/')
  }

  function handleBackToResponses() {
    setViewingResponseId(null)
    navigate('/responses')
  }

  return (
    <div>
      {/* Navigation Bar */}
      <nav style={{
        background: '#343a40',
        padding: '15px 30px',
        marginBottom: '20px'
      }}>
        <h2 style={{ color: 'white', margin: '0 0 15px 0' }}>Form Builder System - Admin</h2>
        
        <div>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '10px 20px',
              marginRight: '10px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '3px'
            }}
          >
            📋 My Forms
          </button>
          
          <button
            onClick={() => navigate('/create')}
            style={{
              padding: '10px 20px',
              background: '#28a745',
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
      <Routes>
        <Route path="/" element={
          <FormList 
            onViewForm={handleViewForm} 
            onViewResponses={handleViewResponses} 
            onEditForm={handleEditForm} 
          />
        } />
        
        <Route path="/create" element={<FormBuilder />} />
        
        <Route path="/edit" element={
          <FormBuilder 
            editFormId={editingFormId} 
            onSaveComplete={handleEditComplete} 
          />
        } />
        
        <Route path="/view" element={
          <FormViewer 
            formId={viewingFormId} 
            onBack={handleBackToList}
            onDisplayForm={handleDisplayForm}
          />
        } />
        
        <Route path="/responses" element={
          <ResponseList 
            formId={responsesFormId} 
            onBack={handleBackToList} 
            onViewResponse={handleViewResponseDetail} 
          />
        } />
        
        <Route path="/response-detail" element={
          <ResponseViewer 
            responseId={viewingResponseId} 
            onBack={handleBackToResponses} 
          />
        } />

        {/* Redirect any unknown admin routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default AdminLayout