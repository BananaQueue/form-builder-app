import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import FormBuilder from './FormBuilder'
import FormList from './FormList'
import FormViewer from './FormViewer'
import FormDisplay from './FormDisplay'
import ResponseList from './ResponseList'
import ResponseViewer from './ResponseViewer'
import AdminLayout from './AdminLayout'
import PublicFormPage from './PublicFormPage'
import LoginPage from './LoginPage'
import { apiUrl } from './apiBase'
import './App.css'

function App() {
  // null  = we don't know yet (still checking)
  // false = definitely not logged in
  // 'username' = logged in as this user
  const [authUser, setAuthUser] = useState(null)

  // When the app first loads, ask the server if there's an active session.
  // This handles page refreshes — without it, every refresh would log you out.
  useEffect(() => {
    fetch(apiUrl('/check_session.php'), {
      credentials: 'include',  // send the session cookie
    })
      .then(r => r.json())
      .then(data => {
        setAuthUser(data.logged_in ? data.username : false)
      })
      .catch(() => setAuthUser(false))
  }, [])

  async function handleLogout() {
    await fetch(apiUrl('/logout.php'), {
      method: 'POST',
      credentials: 'include',
    })
    setAuthUser(false)
  }

  // Still checking — show nothing (or a spinner) to avoid a flash of the login page
  if (authUser === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'white', fontSize: '1.1em' }}>Loading...</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public route — always accessible, no auth needed */}
        <Route path="/form/:formId" element={<PublicFormPage />} />

        {/* Admin routes — gated by login */}
        <Route
          path="/*"
          element={
            authUser
              ? <AdminLayout onLogout={handleLogout} currentUser={authUser} />
              : <LoginPage onLoginSuccess={username => setAuthUser(username)} />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App