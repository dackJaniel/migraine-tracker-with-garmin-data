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
          });

          proxy.on('proxyRes', (proxyRes, _req, res) => {
            // Forward Set-Cookie headers from Garmin to client
            const setCookie = proxyRes.headers['set-cookie'];
            if (setCookie) {
              res.setHeader('Set-Cookie', setCookie);
            }
          });
        },
      },
      // Proxy für Garmin Connect API - Enhanced für OAuth
      // WICHTIG: Garmin verwendet Cloudflare-Schutz, der im Browser-Dev-Modus
      // oft 403 "Just a moment..." Challenges auslöst.
      // Für volle Funktionalität auf Android testen (nativer HTTP-Client).
      '/api/garmin': {
        target: 'https://connect.garmin.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/garmin/, ''),
        secure: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Setze Browser-typische Headers um Cloudflare zu umgehen
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36');
            proxyReq.setHeader('Accept', 'application/json, text/plain, */*');
            proxyReq.setHeader('Accept-Language', 'en-US,en;q=0.9,de;q=0.8');
            proxyReq.setHeader('Accept-Encoding', 'gzip, deflate, br');
            proxyReq.setHeader('Origin', 'https://connect.garmin.com');
            proxyReq.setHeader('Referer', 'https://connect.garmin.com/');
            proxyReq.setHeader('Sec-Fetch-Dest', 'empty');
            proxyReq.setHeader('Sec-Fetch-Mode', 'cors');
            proxyReq.setHeader('Sec-Fetch-Site', 'same-origin');

            // Forward cookies from client
            if (req.headers.cookie) {
              proxyReq.setHeader('Cookie', req.headers.cookie);
            }
            // Forward OAuth headers
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization);
            }
          });

          proxy.on('proxyRes', (proxyRes, _req, res) => {
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
