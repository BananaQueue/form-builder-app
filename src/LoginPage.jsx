import { useState } from 'react'
import { apiUrl } from './apiBase'

function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch(apiUrl('/login.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // credentials: 'include' tells the browser to send and receive cookies.
        // Without this, the session cookie is never stored and every request
        // looks like a fresh anonymous visit.
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      })

      const result = await response.json()

      if (result.success) {
        onLoginSuccess(result.username)
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(18px)',
        borderRadius: '22px',
        border: '1px solid rgba(255,255,255,0.6)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
        padding: '48px 40px',
        width: '100%',
        maxWidth: '400px',
      }}>
        <h1 style={{ margin: '0 0 6px', fontSize: '1.6em', color: '#1a1a2e' }}>
          Form Builder
        </h1>
        <p style={{ margin: '0 0 32px', color: '#888', fontSize: '0.9em' }}>
          Sign in to manage your forms
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.85em',
              fontWeight: '600',
              color: '#555',
              marginBottom: '6px',
            }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '0.95em',
                border: '1.5px solid #e0e0e0',
                borderRadius: '10px',
                background: '#fafafa',
                boxSizing: 'border-box',
                color: '#333',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.85em',
              fontWeight: '600',
              color: '#555',
              marginBottom: '6px',
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '0.95em',
                border: '1.5px solid #e0e0e0',
                borderRadius: '10px',
                background: '#fafafa',
                boxSizing: 'border-box',
                color: '#333',
              }}
            />
          </div>

          {error && (
            <p style={{
              color: '#c0392b',
              fontSize: '0.88em',
              margin: '-12px 0 16px',
              background: '#fdecea',
              padding: '8px 12px',
              borderRadius: '8px',
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1em',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginPage