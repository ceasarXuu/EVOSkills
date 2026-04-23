import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const DEFAULT_DASHBOARD_PROXY_TARGET = 'http://127.0.0.1:47432'

// https://vite.dev/config/
export default defineConfig({
  base: '/v3/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: process.env.ORNNSKILLS_DASHBOARD_PROXY_TARGET ?? DEFAULT_DASHBOARD_PROXY_TARGET,
        changeOrigin: true,
      },
      '/events': {
        target: process.env.ORNNSKILLS_DASHBOARD_PROXY_TARGET ?? DEFAULT_DASHBOARD_PROXY_TARGET,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: '../dist/dashboard-v3',
    emptyOutDir: true,
  },
})
