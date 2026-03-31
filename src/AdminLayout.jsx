import { Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import { useState } from 'react'
import FormBuilder from './FormBuilder'
import FormList from './FormList'
import FormViewer from './FormViewer'
import ResponseList from './ResponseList'
import ResponseViewer from './ResponseViewer'
import { useLocation } from 'react-router-dom'

function AdminLayout() {
  const navigate = useNavigate()
  const [viewingFormId, setViewingFormId] = useState(null)
  const [editingFormId, setEditingFormId] = useState(null)
  const [responsesFormId, setResponsesFormId] = useState(null)
  const [viewingResponseId, setViewingResponseId] = useState(null)

  const location = useLocation()

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

  function handleDisplayForm(formId) {
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
    <div style={{ paddingBottom: '40px' }}>
      
      {/* Glass Navigation */}
      <div
        className="glass-nav"
        style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          marginTop: '30px'
        }}
      >
        <button
          onClick={() => navigate('/')}
          className="glass-button"
          style={{ backgroundColor: 
              location.pathname === '/' ? 'rgba(0,0,255)' : 'rgba(52,152,219,0.45)' }}
        >
          My Forms
        </button>

        <button
          onClick={() => navigate('/create')}
          className="glass-button"
          style={{ backgroundColor:
             location.pathname === '/create' ? 'rgb(62, 197, 118)' : 'rgba(46,204,113,0.45)' }}
        >
          Create New Form
        </button>
      </div>

      {/* Page Content */}
      <Routes>
        <Route
          path="/"
          element={
            <FormList
              onViewForm={handleViewForm}
              onEditForm={handleEditForm}
              onViewResponses={handleViewResponses}
            />
          }
        />

        <Route path="/create" element={<FormBuilder />} />

        <Route
          path="/view"
          element={
            viewingFormId ? (
              <FormViewer
                formId={viewingFormId}
                onBack={() => navigate('/')}
                onDisplayForm={handleDisplayForm}
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route
          path="/edit"
          element={
            editingFormId ? (
              <FormBuilder
                editFormId={editingFormId}
                onSaveComplete={handleEditComplete}
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route
          path="/responses"
          element={
            responsesFormId ? (
              <ResponseList
                formId={responsesFormId}
                onBack={() => navigate('/')}
                onViewResponse={handleViewResponseDetail}
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route
          path="/response-detail"
          element={
            viewingResponseId ? (
              <ResponseViewer
                responseId={viewingResponseId}
                onBack={handleBackToResponses}
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  )
}

export default AdminLayout