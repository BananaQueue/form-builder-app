import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        // Forward frontend calls like /api/get_forms.php to local Laravel.
        // Run it with: php artisan serve --host=127.0.0.1 --port=8000
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        xfwd: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})