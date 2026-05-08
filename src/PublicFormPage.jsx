// src/PublicFormPage.jsx
//
// CHANGES FROM ORIGINAL:
// - Accepts showToast as a prop (passed from App.jsx)
// - Passes showToast into both FormDisplay instances (mobile + desktop)
// - Removed the duplicate `const isMobile = useIsMobile()` call that
//   was inside the if(isMobile) branch (that was a React rules violation —
//   you can't call hooks conditionally or inside branches)

import { useParams } from 'react-router-dom'
import FormDisplay from './FormDisplay'
import { useIsMobile } from './useIsMobile.js'

function PublicFormPage({ showToast }) {
  const { formId } = useParams()
  const isMobile = useIsMobile()

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
          <FormDisplay formCode={formId} isMobile={true} showToast={showToast} />
        </div>
      </div>
    )
  }

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
            <FormDisplay formCode={formId} isMobile={false} showToast={showToast} />
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