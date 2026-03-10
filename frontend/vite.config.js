import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:8000',
      '/patient': 'http://localhost:8000',
      '/qrcode': 'http://localhost:8000',
      '/emergency': 'http://localhost:8000',
      '/chatbot/': 'http://localhost:8000',
      '/records': 'http://localhost:8000',
      '/doctor': 'http://localhost:8000',
      '/uploads': 'http://localhost:8000',
    },
  },
})
