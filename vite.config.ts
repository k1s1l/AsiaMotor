import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  // absolute base so nested routes (/catalog/kuzov/krylya) resolve assets correctly;
  // the GitHub Pages build sets BASE_PATH=/AsiaMotor/ (see package.json "build:pages")
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  // the CGI studio in tools/ is a separate dev-only page and is never bundled
  build: { rollupOptions: { input: 'index.html' } },
})
