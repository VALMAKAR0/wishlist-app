import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' damit der Build sowohl unter GitHub Pages (Unterpfad) als auch in Capacitor läuft.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true, port: 5173 },
})
