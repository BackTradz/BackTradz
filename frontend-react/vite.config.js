import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    port: 5173,
    proxy: {
      // tout ce que le front appelle (ex: /profile/update) sera préfixé en /api/... par apiClient (voir plus bas),
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/auth': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
})
