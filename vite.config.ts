import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // amazon-cognito-identity-js expects Node's `global` in the browser
    global: 'globalThis',
  },
  server: {
    port: 5173,
  },
})
