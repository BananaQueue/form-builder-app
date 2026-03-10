import { BrowserRouter, Routes, Route } from 'react-router-dom'
import FormBuilder from './FormBuilder'
import FormList from './FormList'
import FormViewer from './FormViewer'
import FormDisplay from './FormDisplay'
import ResponseList from './ResponseList'
import ResponseViewer from './ResponseViewer'
import AdminLayout from './AdminLayout'
import PublicFormPage from './PublicFormPage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route - no admin interface */}
        <Route path="/form/:formId" element={<PublicFormPage />} />
        
        {/* Admin routes - with navigation */}
        <Route path="/*" element={<AdminLayout />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App