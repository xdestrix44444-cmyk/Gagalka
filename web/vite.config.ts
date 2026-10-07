import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// номер сборки: зашивается в код и кладётся рядом в version.json — так приложение узнаёт, что вышла новая версия
const BUILD = Date.now().toString(36)

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'nit-version',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD }) })
      },
    },
  ],
  define: { __BUILD__: JSON.stringify(BUILD) },
  // толкования идут через сервер web/server (npm run server)
  server: { proxy: { '/api': 'http://localhost:8787' } },
  test: { environment: 'node' },
})
