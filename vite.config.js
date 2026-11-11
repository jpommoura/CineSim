import dns from 'node:dns'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// No `npm run dev`, a função /api/data roda aqui mesmo (no Vercel ela roda como serverless).
function devApi() {
  return {
    name: 'cinesim-dev-api',
    configureServer(server) {
      // Alguns roteadores (comum no Windows) não respondem à consulta DNS "SRV" que o
      // endereço mongodb+srv:// precisa (erro querySrv ECONNREFUSED). No ambiente local,
      // usamos DNS públicos pra essa resolução. No Vercel isso não é necessário.
      try { dns.setServers(['1.1.1.1', '8.8.8.8', ...dns.getServers()]) } catch { /* mantém o padrão */ }
      server.middlewares.use('/api/data', async (req, res) => {
        try {
          const mod = await server.ssrLoadModule('/api/data.js')
          await mod.default(req, res)
        } catch (e) {
          console.error('[cinesim dev api]', e)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'server_error' }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Disponibiliza MONGODB_URI e APP_PASSWORD do .env para a API local.
  // (Só variáveis com prefixo VITE_ vão para o navegador.)
  const env = loadEnv(mode, process.cwd(), '')
  for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v

  return {
    plugins: [react(), devApi()],
  }
})
