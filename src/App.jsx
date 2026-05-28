// src/App.jsx
//
// App is the root of your entire React tree — every other component
// lives inside it. That's exactly why we put the notification system here.
//
// HOW THE WIRING WORKS:
//
// 1. We call useNotification() here. It returns state (toast, confirm)
//    and functions (showToast, showConfirm, hideToast, hideConfirm).
//
// 2. We render <NotificationHost /> here, passing it the state and
//    hide-functions. It watches the state and renders/removes the banner
//    and modal accordingly.
//
// 3. We pass showToast and showConfirm DOWN to child components as props.
//    Each child that needs to notify the user receives these functions and
//    calls them instead of calling alert() or window.confirm().
//
// This pattern is called "lifting state up" — the state lives at the
// highest level that needs to share it, and gets passed downward.

import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import PublicFormPage from './PublicFormPage'
import LoginPage from './LoginPage'
import NotificationHost from './NotificationHost'      // NEW
import { useNotification } from './useNotification'   // NEW
import { apiUrl } from './apiBase'
import './App.css'

function isIosSafari() {
  if (typeof navigator === 'undefined' || typeof document === 'undefined') return false
  const ua = navigator.userAgent
  const isIos = /\b(iP(ad|hone|od))\b/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document)
  const isWebkit = /AppleWebKit/.test(ua)
  const isNotChromium = !/\b(CriOS|Chrome|FxiOS|EdgiOS|OPiOS|OPR|SamsungBrowser)\b/.test(ua)
  return isIos && isWebkit && isNotChromium
}

function parseViewportContent(content) {
  return content
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, entry) => {
      const [key, ...rest] = entry.split('=')
      if (!key) return acc
      acc[key.trim()] = rest.join('=').trim()
      return acc
    }, {})
}

function serializeViewportContent(entries) {
  return Object.entries(entries)
    .map(([key, value]) => (value === '' ? key : `${key}=${value}`))
    .join(', ')
}

function normalizeViewportForZoomLock(originalContent) {
  const viewport = parseViewportContent(originalContent)
  viewport.width = 'device-width'
  viewport['initial-scale'] = '1'
  viewport['maximum-scale'] = '1'
  return serializeViewportContent(viewport)
}

function App() {
  // ── Existing auth state (unchanged) ──────────────────────────────────────
  const [authUser, setAuthUser] = useState(null)

  // ── NEW: notification system ──────────────────────────────────────────────
  // Destructure everything the hook returns so we can use it below.
  const {
    toast,
    confirm,
    showToast,
    showConfirm,
    hideToast,
    hideConfirm,
  } = useNotification()

  // ── Existing session check (unchanged) ───────────────────────────────────
  useEffect(() => {
    fetch(apiUrl('/check_session.php'), { credentials: 'include' })
      .then(r => r.json())
      .then(data => setAuthUser(data.logged_in ? { username: data.username, role: data.role } : false))
      .catch(() => setAuthUser(false))
  }, [])

  useEffect(() => {
    if (!isIosSafari()) return

    const meta = document.querySelector('meta[name=viewport]')
    if (!meta) return

    const originalContent = meta.getAttribute('content') || ''
    let locked = false

    function isInputControl(element) {
      return (
        element instanceof Element &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)
      )
    }

    function handleFocusIn(event) {
      if (!isInputControl(event.target)) return
      if (locked) return
      meta.setAttribute('content', normalizeViewportForZoomLock(originalContent))
      locked = true
    }

    function handleFocusOut(event) {
      const next = event.relatedTarget
      if (next && isInputControl(next)) return
      if (!locked) return
      meta.setAttribute('content', originalContent)
      locked = false
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)

    return () => {
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
      if (locked) {
        meta.setAttribute('content', originalContent)
      }
    }
  }, [])

  async function handleLogout() {
    await fetch(apiUrl('/logout.php'), {
      method: 'POST',
      credentials: 'include',
    })
    setAuthUser(false)
  }

  if (authUser === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'white', fontSize: '1.1em' }}>Loading...</p>
      </div>
    )
  }

  return (
    <BrowserRouter>

      {/* ── NotificationHost sits OUTSIDE <Routes> ──────────────────────────
          It needs to be always present, not swapped out when routes change.
          It uses position: fixed so it floats above everything anyway,
          but it needs to be in the DOM at all times to catch notifications
          triggered from any route.
          We pass it the state to display, and the functions to dismiss.
      ──────────────────────────────────────────────────────────────────── */}
      <NotificationHost
        toast={toast}
        confirm={confirm}
        hideToast={hideToast}
        hideConfirm={hideConfirm}
      />

      <Routes>
        {/* Public route — pass showToast so FormDisplay can notify the user */}
        <Route
          path="/form/:formId"
          element={<PublicFormPage showToast={showToast} />}
        />

        {/* Admin routes — pass both showToast and showConfirm */}
        <Route
          path="/*"
          element={
            authUser
              ? <AdminLayout
                  onLogout={handleLogout}
                  currentUser={authUser.username}
                  userRole={authUser.role}
                  showToast={showToast}
                  showConfirm={showConfirm}
                />
              : <LoginPage
                  onLoginSuccess={(username, role) => setAuthUser({ username, role })}
                  showToast={showToast}
                />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App