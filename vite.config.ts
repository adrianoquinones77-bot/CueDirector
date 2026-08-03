import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths so dist/ works from any local folder (USB, venue laptop).
  base: './',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ["**/*.cues", "**/*.mp4", "**/*.csv", "**/*.cuedirector"],
    },
  },
  preview: {
    // Bind to localhost only — no external network exposure at the venue.
    host: '127.0.0.1',
    port: 4173,
  },
})
