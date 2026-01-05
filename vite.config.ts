import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      // Proxy für Garmin SSO Login
      '/api/garmin-sso': {
        target: 'https://sso.garmin.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/garmin-sso/, ''),
        secure: true,
        headers: {
          'Origin': 'https://sso.garmin.com',
        },
      },
      // Proxy für Garmin Connect API
      '/api/garmin': {
        target: 'https://connect.garmin.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/garmin/, ''),
        secure: true,
        headers: {
          'Origin': 'https://connect.garmin.com',
        },
      },
    },
  },
})
