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
      // Proxy für Garmin SSO Login - Enhanced für OAuth
      '/api/garmin-sso': {
        target: 'https://sso.garmin.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/garmin-sso/, ''),
        secure: true,
        followRedirects: true,
        // Wichtig: Cookies zwischen Client und Server weiterleiten
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Forward cookies from client
            if (req.headers.cookie) {
              proxyReq.setHeader('Cookie', req.headers.cookie);
            }
            // Forward OAuth headers
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization);
            }
            // Wichtige Garmin Headers
            proxyReq.setHeader('Origin', 'https://sso.garmin.com');
            proxyReq.setHeader('Referer', 'https://sso.garmin.com/');
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');
          });

          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Forward Set-Cookie headers from Garmin to client
            const setCookie = proxyRes.headers['set-cookie'];
            if (setCookie) {
              res.setHeader('Set-Cookie', setCookie);
            }
          });
        },
      },
      // Proxy für Garmin Connect API - Enhanced für OAuth
      '/api/garmin': {
        target: 'https://connect.garmin.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/garmin/, ''),
        secure: true,
        followRedirects: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Forward cookies from client
            if (req.headers.cookie) {
              proxyReq.setHeader('Cookie', req.headers.cookie);
            }
            // Forward OAuth headers
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization);
            }
            // Wichtige Garmin Headers
            proxyReq.setHeader('Origin', 'https://connect.garmin.com');
            proxyReq.setHeader('Referer', 'https://connect.garmin.com/');
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');
          });

          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Forward Set-Cookie headers from Garmin to client
            const setCookie = proxyRes.headers['set-cookie'];
            if (setCookie) {
              res.setHeader('Set-Cookie', setCookie);
            }
          });
        },
      },
      // Proxy für OAuth Consumer Credentials
      '/api/oauth-consumer': {
        target: 'https://thegarth.s3.amazonaws.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/oauth-consumer/, '/oauth_consumer.json'),
        secure: true,
      },
    },
  },
})
