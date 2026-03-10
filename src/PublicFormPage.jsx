import { useParams } from 'react-router-dom'
import FormDisplay from './FormDisplay'

function PublicFormPage() {
  const { formId } = useParams()

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
      <main
        className="public-main"
      >
        <div
          style={{
            width: '100%',
            borderRadius: '18px',
            background: 'rgba(255, 255, 255, 0.27)',
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 18px 60px rgba(0,0,0,0.22)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '18px 14px', color: '#333' }}>
            <FormDisplay formId={formId}/>
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
        <div style={{ opacity: 0.9, color: '#888' }}>Powered by Form Builder System</div>
      </footer>
    </div>
  )
}

export default PublicFormPage