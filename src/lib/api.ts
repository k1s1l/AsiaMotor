// Sends forms to the server endpoint (server/handler.ts). Nothing is "sent" unless the server
// confirms it: any failure reaches the caller as an ApiError.
import { BASE } from './asset'

export type FormKind = 'order' | 'callback' | 'vin' | 'feedback' | 'product'

/** where /api lives: same host by default, or VITE_API_URL when the site is hosted elsewhere */
const API = ((import.meta.env?.VITE_API_URL as string | undefined) || `${BASE}api`).replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  code: string
  fields: Record<string, string>
  constructor(status: number, code: string, fields: Record<string, string> = {}) {
    super(code)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

export async function send(kind: FormKind, data: Record<string, unknown>): Promise<{ id: string }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20000)
  try {
    const res = await fetch(`${API}/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, page: location.href }),
      signal: ctrl.signal,
    })
    const body = (await res.json().catch(() => null)) as { ok?: boolean; id?: string; error?: string; fields?: Record<string, string> } | null
    if (!res.ok || !body?.ok || !body.id) throw new ApiError(res.status, body?.error ?? 'network', body?.fields)
    return { id: body.id }
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError(0, 'network')
  } finally {
    clearTimeout(timer)
  }
}

/** UA phone check used by all forms: 0XX XXX XX XX, with or without +38 */
export function validPhone(v: string) {
  const d = v.replace(/\D/g, '')
  return /^(380\d{9}|0\d{9})$/.test(d)
}

export const validEmail = (v: string) => /^[^\s@<>()",;:]{1,64}@[^\s@<>()",;:]+\.[a-z]{2,}$/i.test(v.trim())
