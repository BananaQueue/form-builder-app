import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': {
        // Forward frontend calls like /api/get_forms.php to your local PHP backend
        // hosted at http://localhost/form-builder-api/get_forms.php
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/form-builder-api')
      }
    }
  }
})