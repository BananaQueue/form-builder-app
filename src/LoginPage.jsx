// src/LoginPage.jsx
//
// WHAT CHANGED FROM THE ORIGINAL:
// ─────────────────────────────────────────────────────────────────────────────
// 1. Every inline style={{ ... }} removed. Replaced with CSS class names.
//    The component went from ~80 lines of mixed JSX+style-objects to clean
//    JSX that reads like a document, not a style sheet.
//
// 2. Added a .login-brand section at the top of the card with a logo mark
//    and app name. The original had just "Form Builder" as an <h1> with
//    no visual treatment. A proper brand mark grounds the page.
//
// 3. The error message uses .login-error instead of an inline style.
//    This means we can animate it (shake, slide-in) from CSS without
//    touching any JavaScript.
//
// 4. The submit button uses .login-btn and .login-btn--loading variant.
//    The --loading variant reduces opacity slightly instead of switching
//    to a grey background color — more polished than the original.
//
// ALL LOGIC IS IDENTICAL TO THE ORIGINAL:
// - handleSubmit() is unchanged
// - fetch to /login.php with credentials:"include" is unchanged
// - onLoginSuccess callback is unchanged
// - error/loading state management is unchanged
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { apiUrl } from './apiBase'

function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

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
    // ── Page shell ─────────────────────────────────────────────────────────
    // .login-shell centers the card vertically and horizontally.
    // It covers the full viewport height (min-height: 100vh in CSS).
    // The dark gradient background comes from the body styles in index.css —
    // we don't need to set it here because the body already has it.
    <div className="login-shell">

      <div className="login-card">

        {/* ── Brand mark ─────────────────────────────────────────────────────
            A small logo mark + app name at the top of the card.

            The logo mark is a CSS-only shape — a rounded square with a
            gradient background and a centered ✦ glyph. This is a common
            technique for apps that don't have a full SVG logo yet:
            use a distinctive character (✦ ✿ ◆ ⬡) styled as a brand mark.

            WHY A SEPARATE .login-brand SECTION:
            Separating the brand area from the form area means we can
            later swap in a real SVG logo without touching the form markup.
        ──────────────────────────────────────────────────────────────────── */}
        <div className="login-brand">
          <div className="login-logo-mark">✦</div>
          <span className="login-app-name">Form Builder</span>
        </div>

        {/* Heading and subtitle */}
        <h1 className="login-heading">Welcome back</h1>
        <p className="login-subtitle">Sign in to manage your forms</p>

        {/* ── Login form ─────────────────────────────────────────────────────
            The <form> tag with onSubmit means pressing Enter in any
            input field will trigger handleSubmit — standard HTML behavior.
            Without the <form> tag you'd need to manually handle keydown.
        ──────────────────────────────────────────────────────────────────── */}
        <form className="login-form" onSubmit={handleSubmit}>

          {/* Username field */}
          <div className="login-field">
            <label className="login-label" htmlFor="login-username">
              Username
            </label>
            {/* htmlFor="login-username" links this label to the input below.
                When a user clicks the label text, the input gets focus.
                This is an accessibility requirement — without it, clicking
                the label does nothing on some browsers and assistive tech
                can't associate the label with its field. */}
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

          {/* Password field */}
          <div className="login-field">
            <label className="login-label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="login-input"
              placeholder="Enter your password"
            />
          </div>

          {/* ── Error message ───────────────────────────────────────────────
              Only renders when the `error` state is not null.
              The login-error--visible class triggers a CSS slide-in
              animation, making the error feel less jarring than
              something that just snaps into existence.

              BEFORE:
                {error && (
                  <p style={{ color: '#c0392b', background: '#fdecea', ... }}>
                    {error}
                  </p>
                )}

              AFTER:
                {error && (
                  <p className="login-error login-error--visible">{error}</p>
                )}
          ──────────────────────────────────────────────────────────────── */}
          {error && (
            <p className="login-error login-error--visible">
              {error}
            </p>
          )}

          {/* ── Submit button ───────────────────────────────────────────────
              The loading state adds the --loading modifier class.
              CSS reduces its opacity and removes the pointer cursor —
              a subtle signal that something is happening.

              We keep the button text as "Signing in…" during loading
              so the user knows the form was submitted and the app
              is waiting for a response. Without feedback, users often
              click again, sending duplicate requests.
          ──────────────────────────────────────────────────────────────── */}
          <button
            type="submit"
            disabled={loading}
            className={`login-btn ${loading ? 'login-btn--loading' : ''}`}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

        </form>
      </div>
    </div>
  )
}

export default LoginPage