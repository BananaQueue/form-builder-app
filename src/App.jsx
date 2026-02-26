import { useState } from 'react'
import FormBuilder from './FormBuilder'
import FormList from './FormList'
import './App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('list')

  return (
    <div>
      {/* Navigation Bar */}
      <nav style={{
        background: '#343a40',
        padding: '15px 30px',
        width: '500px',
        margin: '20px auto 0 auto',
      }}>
        <h2 style={{ color: 'white', margin: '0 0 15px 0' }}>Form Builder System</h2>
        
        <div>
          <button
            onClick={() => setCurrentPage('list')}
            style={{
              padding: '10px 20px',
              marginRight: '10px',
              background: currentPage === 'list' ? '#007bff' : '#6c757d',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '3px'
            }}
          >
            📋 My Forms
          </button>
          
          <button
            onClick={() => setCurrentPage('create')}
            style={{
              padding: '10px 20px',
              background: currentPage === 'create' ? '#007bff' : '#6c757d',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '3px'
            }}
          >
            ➕ Create New Form
          </button>
        </div>
      </nav>

      {/* Page Content */}
      <div>
        {currentPage === 'list' && <FormList />}
        {currentPage === 'create' && <FormBuilder />}
      </div>
    </div>
  )
}

export default App