import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/navigation.css'
import './styles/login.css'
import './styles/form-cards.css'
import './styles/form-list.css'
import './styles/refreshing.css'
import './styles/form-viewer.css'
import './styles/responses.css'
import './styles/form-builder.css'
import './styles/form-display.css'
import './styles/user-management.css'
import './styles/banner-settings.css'
import './styles/notifications.css'
import './styles/admin-form-list.css'
import './styles/audit-log.css'
import './styles/responsive.css'
import './styles/theme.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
 
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
