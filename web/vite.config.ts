import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // толкования идут через сервер web/server (npm run server)
  server: { proxy: { '/api': 'http://localhost:8787' } },
  test: { environment: 'node' },
})
