// src/PublicFormPage.jsx
//
// This is the page that public (non-logged-in) users see when they visit
// a form link like /form/my-form-abc1234.
//
// WHAT CHANGED FROM THE ORIGINAL:
// - We import our new useIsMobile hook.
// - Based on isMobile, the outer wrapper changes between:
//     • Mobile: plain white background, no card, form fills the full screen.
//     • Desktop: the existing gradient + floating card look, unchanged.
// - The footer is hidden on mobile (extra screen space saved).

import { useParams } from 'react-router-dom'
import FormDisplay from './FormDisplay'
import { useIsMobile } from './useIsMobile'

function PublicFormPage() {
  const { formId } = useParams()

  // Call our hook. isMobile will be true on narrow screens, false on wide ones.
  // Whenever the user resizes the window past the breakpoint, React will
  // automatically re-render this component with the new value.
  const isMobile = useIsMobile()

  // ── Mobile layout ─────────────────────────────────────────────────────────
  // The form gets the entire screen with no decoration.
  // We use a plain white background so the gradient from index.css is covered.
  // minHeight: '100vh' makes the page at least as tall as the viewport.
  if (isMobile) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#ffffff',       // white: completely hides the gradient
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
        }}
      >
        {/* FormDisplay takes up all available vertical space.
            flex: 1 means "grow to fill whatever space is left in the parent". */}
        <div style={{ flex: 1 }}>
          <FormDisplay formCode={formId} />
        </div>
      </div>
    )
  }

  // ── Desktop layout ────────────────────────────────────────────────────────
  // This is the ORIGINAL layout, completely unchanged.
  // The gradient background shows through the padding around the card.
  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '28px 16px 40px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Main content */}
      <main className="public-main">
        <div
          style={{
            width: '100%',
            borderRadius: '18px',
            background: 'rgb(255, 250, 245)',
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 18px 60px rgba(0,0,0,0.22)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '18px 14px', color: '#333' }}>
            <FormDisplay formCode={formId} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          textAlign: 'center',
          marginTop: '16px',
          color: 'rgba(255,255,255,0.88)',
          fontSize: '13px',
        }}
      >
        <div style={{ opacity: 0.9, color: '#c7c5c5' }}>
          Powered by Form Builder System
        </div>
      </footer>
    </div>
  )
}

export default PublicFormPage