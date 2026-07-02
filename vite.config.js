import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const apiTarget = env.VITE_API_TARGET || 'http://127.0.0.1:8000'

  return {
    base: mode === 'production' ? '/app/' : '/',
    plugins: [react()],
    build: {
      outDir: '../form-builder-api/laravel/public/app',
      emptyOutDir: true,
    },
    server: {
      host: '0.0.0.0',
      proxy: {
        '/api': {
          // Forward frontend calls like /api/get_forms.php to local Laravel.
          // Override with VITE_API_TARGET=http://127.0.0.1:8001 for test DB smoke checks.
          target: apiTarget,
          changeOrigin: true,
          xfwd: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    }
  }
})

