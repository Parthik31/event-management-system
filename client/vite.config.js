import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // New Tailwind 4 Plugin
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"), // Clean imports (optional but recommended)
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    // Avoid noisy chunk-size warnings for this project scale.
    chunkSizeWarningLimit: 2000
  }
})