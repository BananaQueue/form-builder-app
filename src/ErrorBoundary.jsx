// src/ErrorBoundary.jsx
//
// ── WHAT IS AN ERROR BOUNDARY? ────────────────────────────────────────────
//
// Normally, if a React component throws a JavaScript error during rendering,
// React will unmount the ENTIRE component tree and show a blank white page.
// From the user's perspective, the app has simply disappeared with no
// explanation.
//
// An Error Boundary is a special React component that sits above other
// components in the tree and "catches" those crashes before they reach
// the top. When a crash happens inside it, instead of a blank screen,
// it renders a fallback UI — a helpful message that tells the user
// something went wrong and gives them a way to recover.
//
// ── WHY A CLASS COMPONENT? ────────────────────────────────────────────────
//
// React hooks (useState, useEffect, etc.) are the modern way to write
// React components, but Error Boundaries are one of the few remaining cases
// that require a class component. This is because the error-catching
// lifecycle methods (getDerivedStateFromError and componentDidCatch) have
// not been given hook equivalents by the React team yet.
//
// A class component is just another way to write a React component.
// Instead of a function that returns JSX, it is a JavaScript class with
// a render() method that returns JSX. The logic is the same — it is just
// an older syntax.
//
// ── HOW IT WORKS ─────────────────────────────────────────────────────────
//
// React calls getDerivedStateFromError() when any child component throws.
// We use it to flip hasError to true, which causes render() to show the
// fallback UI instead of the crashed children.
//
// React calls componentDidCatch() with the error and a stack trace.
// We use it to log the error so developers can find it in the console.
// In a production app you would send this to an error tracking service
// (like Sentry) instead of console.error.
//
// ── WHAT IT CATCHES AND WHAT IT DOES NOT ─────────────────────────────────
//
// Catches:
//   - Errors that happen during rendering (a component trying to read a
//     property of undefined, for example)
//   - Errors inside lifecycle methods of class components
//   - Errors in constructors of child class components
//
// Does NOT catch:
//   - Errors inside event handlers (use try/catch there instead)
//   - Errors in asynchronous code (async/await, setTimeout)
//   - Errors in the Error Boundary component itself
//
// ─────────────────────────────────────────────────────────────────────────

import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    // super(props) is required in every class component constructor.
    // It calls the parent class (Component) constructor and passes props
    // to it. Without this line, `this.props` would be undefined inside
    // the constructor, which would cause its own error.
    super(props)

    // this.state is how class components store state.
    // It is the equivalent of calling useState() in a function component.
    // We start with hasError: false because nothing has crashed yet.
    this.state = {
      hasError: false,
      error: null,       // we store the actual error object
      errorInfo: null,   // we store the component stack trace
    }
  }

  // ── getDerivedStateFromError ────────────────────────────────────────────
  //
  // React calls this static method when a child component throws an error
  // during rendering.
  //
  // "static" means it belongs to the class itself, not to an instance.
  // This method cannot use `this` — React calls it before the component
  // instance is updated.
  //
  // It receives the error that was thrown and must return an object that
  // will be MERGED into this.state. Returning { hasError: true } tells
  // React to re-render with hasError set to true, which triggers the
  // fallback UI in render() below.
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    }
  }

  // ── componentDidCatch ───────────────────────────────────────────────────
  //
  // React calls this method AFTER getDerivedStateFromError, once the
  // component has re-rendered with the fallback UI.
  //
  // `error`     — the JavaScript Error object that was thrown
  // `errorInfo` — an object with a componentStack property: a string
  //               showing which components were rendering when the crash
  //               happened. This is invaluable for debugging.
  //
  // This is where you would send the error to a monitoring service in
  // a production application.
  componentDidCatch(error, errorInfo) {
    console.error(
      '╔══════════════════════════════════════════════════╗\n' +
      '║  ErrorBoundary caught an unhandled React error   ║\n' +
      '╚══════════════════════════════════════════════════╝',
    )
    console.error('Error:', error)
    console.error('Component stack:', errorInfo.componentStack)

    // Save errorInfo to state so we can show the component stack in the
    // fallback UI during development — helps identify which component crashed.
    this.setState({ errorInfo })
  }

  // ── handleReset ────────────────────────────────────────────────────────
  //
  // When the user clicks "Try Again", we reset hasError to false.
  // React will then attempt to re-render the children. If the underlying
  // problem is gone (e.g. a network blip that caused null data), this will
  // recover successfully. If the bug is still there, the boundary will
  // catch it again and show the fallback UI once more.
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    // ── Fallback UI ───────────────────────────────────────────────────────
    // Shown when hasError is true (i.e. a child component crashed).
    //
    // We check process.env.NODE_ENV to decide how much detail to show.
    // In development (npm run dev), we show the full error and component
    // stack so developers can debug quickly.
    // In production (npm run build), we show only a friendly user message
    // without technical details that could reveal internal code structure.
    if (this.state.hasError) {
      const isDevelopment = import.meta.env.DEV

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          fontFamily: 'system-ui, sans-serif',
          background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 45%, #24243e 100%)',
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '18px',
            padding: '48px 40px',
            maxWidth: '560px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
            textAlign: 'center',
          }}>
            {/* Icon */}
            <div style={{
              fontSize: '3rem',
              marginBottom: '16px',
              lineHeight: 1,
            }}>
              ⚠️
            </div>

            {/* Heading */}
            <h1 style={{
              margin: '0 0 12px',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#1a1a2e',
            }}>
              Something went wrong
            </h1>

            {/* User-facing message */}
            <p style={{
              margin: '0 0 28px',
              fontSize: '0.95rem',
              color: '#555',
              lineHeight: 1.6,
            }}>
              The application encountered an unexpected error. You can try
              reloading the page. If the problem persists, please contact
              your system administrator.
            </p>

            {/* Action buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '11px 28px',
                  background: '#6c63ff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>

              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '11px 28px',
                  background: '#f0f0f8',
                  color: '#444',
                  border: '1.5px solid #ddd',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reload Page
              </button>
            </div>

            {/* Development-only error details ─────────────────────────────
                This block is stripped out in production builds by Vite.
                import.meta.env.DEV is true during `npm run dev` and false
                after `npm run build`. We show the raw error message and
                component stack here so developers can pinpoint the crash
                without needing to open DevTools. */}
            {isDevelopment && this.state.error && (
              <details style={{
                marginTop: '28px',
                textAlign: 'left',
                background: '#fff5f5',
                border: '1px solid #fcc',
                borderRadius: '8px',
                padding: '16px',
              }}>
                <summary style={{
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: '#c0392b',
                  fontSize: '0.85rem',
                  userSelect: 'none',
                }}>
                  Developer details (not shown in production)
                </summary>

                {/* The error message */}
                <pre style={{
                  margin: '12px 0 0',
                  fontSize: '0.78rem',
                  color: '#c0392b',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.5,
                }}>
                  {this.state.error.toString()}
                </pre>

                {/* The component stack trace */}
                {this.state.errorInfo && (
                  <pre style={{
                    margin: '8px 0 0',
                    fontSize: '0.75rem',
                    color: '#888',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    lineHeight: 1.5,
                  }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
          </div>
        </div>
      )
    }

    // ── Normal render ─────────────────────────────────────────────────────
    // When there is no error, render children exactly as if this component
    // was not here at all. this.props.children is whatever JSX was nested
    // inside <ErrorBoundary> in the parent component.
    return this.props.children
  }
}

export default ErrorBoundary