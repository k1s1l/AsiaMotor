// Cloudflare Pages Function: POST /api/<kind> → server/handler.ts.
// Mail settings are the project's environment variables (Settings → Variables and Secrets), see .env.example.
import { handle, type Env } from '../../server/handler.ts'

interface Context {
  request: Request
  env: Env
  params: { kind?: string | string[] }
}

export const onRequest = (ctx: Context) =>
  handle(ctx.request, ctx.env, String(ctx.params.kind ?? ''), ctx.request.headers.get('CF-Connecting-IP') ?? '')
