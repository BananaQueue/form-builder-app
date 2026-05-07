// src/PublicFormPage.jsx
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import FormDisplay from './FormDisplay'
import { useIsMobile } from './useIsMobile.js'

function PublicFormPage() {
  const { formId } = useParams()
  const isMobile = useIsMobile()
  
  // Override the body background on mobile so the gradient
// from index.css doesn't bleed through
useEffect(() => {
  if (isMobile) {
    document.body.style.background = '#ffffff'
  }
  return () => {
    // Clean up when leaving the page — restore the gradient
    document.body.style.background = ''
  }
}, [isMobile])

  

  // ── Mobile layout ──────────────────────────────────────────────────────
  // The outer wrapper becomes a plain white full-screen container.
  // We pass isMobile={true} into FormDisplay so it can remove its own
  // internal padding and max-width — without that, the form content would
  // still be constrained even if the shell is full-width.
  if (isMobile) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ flex: 1 }}>
          <FormDisplay formCode={formId} isMobile={true} />
        </div>
      </div>
    )
  }

  

  // ── Desktop layout ─────────────────────────────────────────────────────
  // Original layout, completely unchanged.
  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '28px 16px 40px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
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
            <FormDisplay formCode={formId} isMobile={false} />
          </div>
        </div>
      </main>

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