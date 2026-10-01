import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuración de Vite para React
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
})
