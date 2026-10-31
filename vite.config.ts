import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite'
import { handle, type Env } from './server/handler.ts'

/**
 * Serves the form endpoint (/api/<kind>, server/handler.ts) in `vite dev` and `vite preview`,
 * with the mail settings from .env — the same code that runs as a Cloudflare Pages Function.
 */
function formsApi(): Plugin {
  let env: Env = {}
  const middleware =
    (base: string): Connect.NextHandleFunction =>
    async (req, res, next) => {
      const prefix = `${base}api/`
      if (!req.url?.startsWith(prefix)) return next()
      try {
        const chunks: Buffer[] = []
        for await (const c of req) chunks.push(c as Buffer)
        const headers = new Headers()
        for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
        const request = new Request(`http://${req.headers.host}${req.url}`, {
          method: req.method,
          headers,
          body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
        })
        const r = await handle(request, env, req.url.slice(prefix.length).split(/[?#]/)[0], req.socket.remoteAddress ?? '')
        res.statusCode = r.status
        r.headers.forEach((v, k) => res.setHeader(k, v))
        res.end(Buffer.from(await r.arrayBuffer()))
      } catch (e) {
        next(e)
      }
    }
  return {
    name: 'forms-api',
    configResolved(c) {
      env = { ...loadEnv(c.mode, process.cwd(), ''), ...process.env } as Env
    },
    configureServer(s) {
      s.middlewares.use(middleware(s.config.base))
    },
    configurePreviewServer(s) {
      s.middlewares.use(middleware(s.config.base))
    },
  }
}

export default defineConfig({
  // absolute base so nested routes (/catalog/kuzov/krylya) resolve assets correctly;
  // the GitHub Pages build sets BASE_PATH=/AsiaMotor/ (see package.json "build:pages")
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss(), formsApi()],
  // the CGI studio in tools/ is a separate dev-only page and is never bundled
  build: {
    rollupOptions: {
      input: 'index.html',
      // the catalogue data changes with every price list: its own file, so the app code stays cached
      output: { advancedChunks: { groups: [{ name: 'catalog-data', test: /catalog\.json/ }] } },
    },
  },
  // ~1 MB of catalogue JSON parses faster as JSON.parse("…") than as a JS object literal
  json: { stringify: true },
})
