import { useEffect, useRef, useState } from 'react'
import { apiUrl, setCsrfToken } from './apiBase'
import PasswordInput from './PasswordInput'

function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [leaving, setLeaving]   = useState(false)
  const loginTimerRef           = useRef(null)

  useEffect(() => {
    return () => window.clearTimeout(loginTimerRef.current)
  }, [])

  // ── Form submission (unchanged) ────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch(apiUrl('/login.php'), {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({ username, password }),
      })

      const result = await response.json()

      if (result.success) {
        setCsrfToken(result.csrf_token)
        setLeaving(true)
        window.clearTimeout(loginTimerRef.current)
        loginTimerRef.current = window.setTimeout(() => {
          onLoginSuccess(result.username, result.role)
        }, 260)
      } else {
        setError(result.error || 'Login failed')
      }
    } catch (err) {
      setError('Could not connect to server: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`login-shell ${leaving ? 'login-shell--leaving' : ''}`}>

      <div className="login-agency-banner">
        <img
          src="/EMB1-LOGO-WITH-NAME-BAGONG-PILIPINAS.png"
          alt="DENR Environmental Management Bureau Region I"
        />
      </div>

      <div className="login-card">

        <div className="login-brand">
          <div className="login-logo-mark">✦☰</div>
          <span className="login-app-name">Form Builder</span>
        </div>

        {/* Heading and subtitle */}
        <h1 className="login-heading">Welcome back</h1>
        <p className="login-subtitle">Sign in to manage your forms</p>

        <form className="login-form" onSubmit={handleSubmit}>

          <div className="login-field">
            <label className="login-label" htmlFor="login-username">
              Username
            </label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="login-input"
              placeholder="Enter your username"
            />
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="login-password">
              Password
            </label>
            <PasswordInput
              id="login-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="login-input"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <p className="login-error login-error--visible">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || leaving}
            className={`login-btn ${loading ? 'login-btn--loading' : ''}`}
          >
            {loading ? (
              <>
                <span className="login-btn__spinner" aria-hidden="true" />
                Signing in...
              </>
            ) : 'Sign In'}
          </button>

        </form>
      </div>
    </div>
  )
}

export default LoginPage

