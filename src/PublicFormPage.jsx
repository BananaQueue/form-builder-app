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
      <div className="public-form-page public-form-page--mobile">
        <div className="public-form-page__content">
          <FormDisplay formCode={formId} isMobile={true} showToast={showToast} />
        </div>
      </div>
    )
  }

  return (
    <div className="public-form-page">
      <main className="public-main">
        <div className="public-form-card">
          <div className="public-form-card__inner">
            <FormDisplay formCode={formId} isMobile={false} showToast={showToast} />
          </div>
        </div>
      </main>

      <footer className="public-form-footer">
        Powered by Form Builder System
      </footer>
    </div>
  )
}

export default PublicFormPage
