// src/App.jsx
//
// CHANGES FROM ORIGINAL:
// ─────────────────────────────────────────────────────────────────────────
// 1. Import `useTheme` from './useTheme'
// 2. Import `ThemeToggle` from './ThemeToggle'
// 3. Call useTheme() and destructure { theme, toggleTheme }
// 4. Pass `theme` and `toggleTheme` to AdminLayout
//    (AdminLayout renders the nav bar where the toggle button lives)
//
// WHY IS THE HOOK CALLED HERE AND NOT IN AdminLayout?
// The theme must be initialized as early as possible — before the page
// renders — to avoid a "flash of wrong theme" (FOWT).
// App.jsx is the root component, so it runs first. useTheme() applies
// the theme to document.documentElement immediately via its useEffect.
//
// The public form page (/form/:id) uses the browser/OS color scheme
// directly, so it is not affected by the admin theme toggle.
// ─────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import PublicFormPage from './PublicFormPage'
import LoginPage from './LoginPage'
import NotificationHost from './NotificationHost'
import NotificationGate from './NotificationGate'
import { useNotification } from './useNotification'
import { useSystemTheme, useTheme } from './useTheme'             // NEW
import { useIsMobile } from './useIsMobile'
import { apiUrl, csrfHeaders, setCsrfToken } from './apiBase'
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

function PublicFormRoute({ showToast }) {
  const systemTheme = useSystemTheme()
  const isMobile = useIsMobile()
  const publicTheme = isMobile ? 'light' : systemTheme

  return (
    <div className="theme-scope" data-theme={publicTheme}>
      <PublicFormPage showToast={showToast} />
    </div>
  )
}

function App() {
  const [authUser, setAuthUser] = useState(null)
  const [notificationGateComplete, setNotificationGateComplete] = useState(false)
  const [authTransition, setAuthTransition] = useState('idle')
  const logoutTimerRef = useRef(null)

  // ── Notification system (unchanged) ──────────────────────────────────
  const {
    toast,
    confirm,
    showToast,
    showConfirm,
    hideToast,
    hideConfirm,
  } = useNotification()

  // ── Theme system (NEW) ────────────────────────────────────────────────
  //
  // We call useTheme() here at the root level.
  //
  // useTheme() does two things immediately (via useEffect on mount):
  //   1. Sets document.documentElement.dataset.theme = 'dark' or 'light'
  //   2. This triggers the CSS variable overrides in THEME_ADDITIONS.css
  //
  // We only need to pass theme and toggleTheme to AdminLayout because
  // that's the only place the toggle button is rendered (in the nav bar).
  const { theme, toggleTheme } = useTheme()

  // ── Session check (unchanged) ─────────────────────────────────────────
  useEffect(() => {
    fetch(apiUrl('/check_session.php'), { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setCsrfToken(data.csrf_token)
        setAuthUser(
          data.logged_in
            ? { username: data.username, role: data.role, userId: data.user_id }
            : false
        )
      })
      .catch(() => {
        setCsrfToken(null)
        setAuthUser(false)
      })
  }, [])

  // ── iOS Safari viewport zoom lock (unchanged) ─────────────────────────
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
    window.clearTimeout(logoutTimerRef.current)
    setAuthTransition('signingOut')
    logoutTimerRef.current = window.setTimeout(async () => {
      try {
        await fetch(apiUrl('/logout.php'), {
          method: 'POST',
          headers: csrfHeaders(),
          credentials: 'include',
        })
      } finally {
        setCsrfToken(null)
        setNotificationGateComplete(false)
        setAuthUser(false)
        setAuthTransition('idle')
      }
    }, 220)
  }

  useEffect(() => {
    return () => window.clearTimeout(logoutTimerRef.current)
  }, [])

  const needsNotificationGate =
    authUser &&
    authUser.role !== 'super_admin' &&
    !notificationGateComplete

  const themedStageClass = `theme-scope auth-stage ${authTransition === 'signingOut' ? 'auth-stage--leaving' : ''}`.trim()

  if (authUser === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'white', fontSize: '1.1em' }}>Loading...</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <NotificationHost
        toast={toast}
        confirm={confirm}
        hideToast={hideToast}
        hideConfirm={hideConfirm}
      />

      <Routes>
        {/* Public route — theme applies automatically via CSS variables */}
        <Route
          path="/form/:formId"
          element={
            <PublicFormRoute showToast={showToast} />
          }
        />

        {/* Admin routes — pass theme and toggleTheme for the nav toggle button */}
        <Route
          path="/*"
          element={
            authUser
              ? needsNotificationGate
                ? <div className="theme-scope" data-theme={theme}>
                    <NotificationGate
                      showToast={showToast}
                      onComplete={() => setNotificationGateComplete(true)}
                    />
                  </div>
                : <div className={themedStageClass} data-theme={theme}>
                  <AdminLayout
                    onLogout={handleLogout}
                    currentUser={authUser.username}
                    userRole={authUser.role}
                    showToast={showToast}
                    showConfirm={showConfirm}
                    theme={theme}
                    toggleTheme={toggleTheme}
                    signingOut={authTransition === 'signingOut'}
                  />
                </div>
              : <LoginPage
                  onLoginSuccess={(username, role) => {
                    setNotificationGateComplete(false)
                    setAuthUser({ username, role })
                    setAuthTransition('idle')
                  }}
                  showToast={showToast}
                />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
