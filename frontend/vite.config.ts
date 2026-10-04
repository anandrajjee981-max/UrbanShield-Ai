import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const frontendPort = Number(env.VITE_PORT || 5173)
  const apiTarget = env.VITE_API_PROXY_TARGET || `http://localhost:${env.VITE_API_PORT || 4000}`

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      port: frontendPort,
      strictPort: true,
      watch: {
        usePolling: true,
      },
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
