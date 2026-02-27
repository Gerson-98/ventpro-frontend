import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// ✅ Configuración completa para Vite + React + Ngrok
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true, // Permite conexiones externas (necesario para ngrok)
    port: 5173, // Puerto local
    allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev'], // ✅ Permitir dominios ngrok
    headers: {
      'ngrok-skip-browser-warning': 'true', // ✅ Quita el banner de advertencia
    },
  },
})
