// Form endpoint: orders, call-back requests, VIN requests, questions. One handler, written
// against the standard Request/Response API, so it runs unchanged as a Cloudflare Pages Function
// (functions/api/[kind].ts) and inside the Vite dev/preview server (vite.config.ts).
//
// Every request is validated here — the browser is never trusted: order prices are recomputed
// from the catalogue, fields are length-limited and HTML-escaped, bots are filtered by a
// honeypot field and a minimum fill-in time, and each IP gets a few requests per minute.
// Mail goes through an HTTP mail API (Brevo or Resend); the key lives only in the server's
// environment variables (see .env.example), never in the site's code.
import catalog from '../src/data/catalog.json' with { type: 'json' }

export interface Env {
  /** 'brevo' (default) or 'resend' */
  MAIL_PROVIDER?: string
  MAIL_API_KEY?: string
  /** verified sender, e.g. "Asia Motor <info@asiamotor.com.ua>" */
  MAIL_FROM?: string
  /** shop inbox(es), comma separated */
  MAIL_TO?: string
  /** sites allowed to post from another origin, comma separated (e.g. https://k1s1l.github.io) */
  ALLOWED_ORIGINS?: string
  /** override of the provider's endpoint (tests) */
  MAIL_API_URL?: string
}

type Kind = 'order' | 'callback' | 'vin' | 'feedback' | 'product'
const KINDS: Kind[] = ['order', 'callback', 'vin', 'feedback', 'product']

type Fields = Record<string, string>
class Invalid extends Error {
  fields: Fields
  constructor(fields: Fields) {
    super('validation')
    this.fields = fields
  }
}

const products = new Map(catalog.products.map((p) => [p.id, p]))
const PREPAID = new Set(['kuzov', 'optyka'])

// ------------------------------------------------------------------ helpers
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const money = (n: number) => `${new Intl.NumberFormat('uk-UA').format(n)} грн`

function text(v: unknown, max: number) {
  if (v === undefined || v === null) return ''
  if (typeof v !== 'string' && typeof v !== 'number') return ''
  // drop control characters (keeps line breaks), collapse runs of spaces
  return String(v)
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, max)
}

/** Ukrainian phone → "+380XXXXXXXXX", or '' if it does not look like one */
function phone(v: unknown) {
  const d = text(v, 30).replace(/\D/g, '')
  const n = d.length === 10 && d.startsWith('0') ? `38${d}` : d.length === 9 ? `380${d}` : d
  return /^380\d{9}$/.test(n) ? `+${n}` : ''
}

const isEmail = (s: string) => /^[^\s@<>()",;:]{1,64}@[^\s@<>()",;:]+\.[a-z]{2,}$/i.test(s)

function orderId() {
  const d = new Date()
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`
  const rnd = crypto.getRandomValues(new Uint32Array(1))[0] % 9000
  return `AM-${ymd}-${1000 + rnd}`
}

// best effort, per server instance: 6 requests a minute per IP
const hits = new Map<string, number[]>()
function limited(ip: string) {
  const now = Date.now()
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000)
  list.push(now)
  hits.set(ip, list)
  if (hits.size > 5000) hits.clear()
  return list.length > 6
}

// ------------------------------------------------------------------ messages
interface Mail {
  subject: string
  rows: [string, string][]
  table?: { head: string[]; rows: string[][]; total?: string }
  replyTo?: string
  id: string
}

function build(kind: Kind, b: Record<string, unknown>): Mail {
  const errors: Fields = {}
  const name = text(b.name, 80)
  const tel = phone(b.phone)
  const email = text(b.email, 120)
  if (email && !isEmail(email)) errors.email = 'email'
  const page = text(b.page, 300)
  const id = kind === 'order' ? orderId() : `R-${Date.now().toString(36).toUpperCase()}`
  const contact: [string, string][] = [
    ['Ім’я', name || '—'],
    ['Телефон', tel || '—'],
    ['E-mail', email || '—'],
  ]

  if (kind === 'order') {
    if (!name) errors.name = 'required'
    if (!tel) errors.phone = 'phone'
    const method = text(b.method, 20)
    const methods: Record<string, string> = { np: '«Нова пошта» — відділення/поштомат', carrier: '«Інтайм» / «Автолюкс» — відділення', pickup: 'Самовивіз, Запоріжжя' }
    if (!methods[method]) errors.method = 'required'
    const city = text(b.city, 80)
    const branch = text(b.branch, 120)
    if (method !== 'pickup' && !city) errors.city = 'required'
    if (method !== 'pickup' && !branch) errors.branch = 'required'
    const payment = text(b.payment, 10)
    const payments: Record<string, string> = { card: 'Переказ на картку ПриватБанку', cod: 'Накладений платіж' }
    if (!payments[payment]) errors.payment = 'required'
    const raw = Array.isArray(b.items) ? b.items.slice(0, 60) : []
    const lines: string[][] = []
    let total = 0
    let prepaid = false
    for (const it of raw as { id?: unknown; qty?: unknown }[]) {
      const p = products.get(text(it?.id, 40))
      const qty = Math.floor(Number(it?.qty))
      if (!p || !(qty >= 1) || qty > 999) continue
      const q = Math.min(qty, p.qty)
      total += p.price * q
      if (PREPAID.has(p.cat)) prepaid = true
      lines.push([p.name, p.article || '—', p.code, String(q), money(p.price), money(p.price * q)])
    }
    if (!lines.length) errors.items = 'required'
    if (prepaid && payment === 'cod') errors.payment = 'prepaid'
    if (Object.keys(errors).length) throw new Invalid(errors)
    const comment = text(b.comment, 2000)
    return {
      id,
      subject: `Замовлення ${id} — ${lines.length} поз., ${money(total)} — ${name}`,
      replyTo: email || undefined,
      rows: [
        ['Номер замовлення', id],
        ...contact,
        ['Доставка', methods[method]],
        ...(method !== 'pickup' ? ([['Місто', city], ['Відділення', branch]] as [string, string][]) : []),
        ['Оплата', payments[payment]],
        ...(prepaid ? ([['Увага', 'У замовленні є кузовні деталі або оптика — 100% передоплата']] as [string, string][]) : []),
        ['Коментар', comment || '—'],
      ],
      table: { head: ['Товар', 'Артикул', 'Код 1С', 'К-сть', 'Ціна', 'Сума'], rows: lines, total: money(total) },
    }
  }

  if (kind === 'callback') {
    if (!tel) errors.phone = 'phone'
    if (Object.keys(errors).length) throw new Invalid(errors)
    const topic = text(b.message, 1000)
    return { id, subject: `Зворотний дзвінок: ${tel}${name ? ` — ${name}` : ''}`, rows: [...contact, ['Питання', topic || '—'], ['Сторінка', page || '—']] }
  }

  if (kind === 'vin') {
    const vin = text(b.vin, 20).toUpperCase().replace(/\s/g, '')
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) errors.vin = 'vin'
    if (!tel && !email) errors.phone = 'contact'
    const part = text(b.part, 500)
    if (!part) errors.part = 'required'
    if (Object.keys(errors).length) throw new Invalid(errors)
    return { id, subject: `Підбір за VIN ${vin}: ${part.slice(0, 60)}`, replyTo: email || undefined, rows: [...contact, ['VIN', vin], ['Деталь', part], ['Автомобіль', text(b.car, 120) || '—'], ['Сторінка', page || '—']] }
  }

  // feedback / product question
  const message = text(b.message, 3000)
  if (!message) errors.message = 'required'
  if (!tel && !email) errors.phone = 'contact'
  const p = kind === 'product' ? products.get(text(b.product, 40)) : undefined
  if (kind === 'product' && !p) errors.product = 'required'
  if (Object.keys(errors).length) throw new Invalid(errors)
  return {
    id,
    subject: p ? `Запитання щодо товару: ${p.name.slice(0, 70)}` : `Повідомлення з сайту${name ? ` — ${name}` : ''}`,
    replyTo: email || undefined,
    rows: [
      ...contact,
      ...(p ? ([['Товар', `${p.name} (арт. ${p.article || '—'}, код ${p.code}, ${money(p.price)})`]] as [string, string][]) : []),
      ['Повідомлення', message],
      ['Сторінка', page || '—'],
    ],
  }
}

function render(m: Mail) {
  const cell = 'padding:8px 10px;border-bottom:1px solid #e5e2dc;vertical-align:top;text-align:left'
  const rows = m.rows.map(([k, v]) => `<tr><th style="${cell};color:#6b6b6b;font-weight:500;width:170px">${esc(k)}</th><td style="${cell}">${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('')
  const table = m.table
    ? `<table style="border-collapse:collapse;width:100%;margin-top:18px;font-size:14px"><thead><tr>${m.table.head.map((h) => `<th style="${cell};background:#f3f1ed">${esc(h)}</th>`).join('')}</tr></thead><tbody>${m.table.rows
        .map((r) => `<tr>${r.map((c) => `<td style="${cell}">${esc(c)}</td>`).join('')}</tr>`)
        .join('')}</tbody>${m.table.total ? `<tfoot><tr><td colspan="${m.table.head.length - 1}" style="${cell};text-align:right;font-weight:700">Разом</td><td style="${cell};font-weight:700">${esc(m.table.total)}</td></tr></tfoot>` : ''}</table>`
    : ''
  const html = `<div style="font-family:Arial,sans-serif;color:#0a0b0d;max-width:720px"><h2 style="margin:0 0 14px">${esc(m.subject)}</h2><table style="border-collapse:collapse;width:100%;font-size:14px">${rows}</table>${table}<p style="color:#8a8a8a;font-size:12px;margin-top:20px">Заявка з сайту Asia Motor · ${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC</p></div>`
  const plain = [m.subject, '', ...m.rows.map(([k, v]) => `${k}: ${v}`), ...(m.table ? ['', ...m.table.rows.map((r) => r.join(' | ')), `Разом: ${m.table.total}`] : [])].join('\n')
  return { html, plain }
}

/** "Name <a@b.c>" → { name, email } */
function address(s: string) {
  const m = s.match(/^\s*(.*?)\s*<([^>]+)>\s*$/)
  return m ? { name: m[1] || undefined, email: m[2] } : { email: s.trim() }
}

async function sendMail(env: Env, m: Mail) {
  const { html, plain } = render(m)
  const to = (env.MAIL_TO ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const from = address(env.MAIL_FROM ?? '')
  const provider = (env.MAIL_PROVIDER ?? 'brevo').toLowerCase()
  let res: Response
  if (provider === 'resend') {
    res = await fetch(env.MAIL_API_URL ?? 'https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.MAIL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.MAIL_FROM, to, subject: m.subject, html, text: plain, reply_to: m.replyTo }),
    })
  } else {
    res = await fetch(env.MAIL_API_URL ?? 'https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': env.MAIL_API_KEY!, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: from.email, name: from.name ?? 'Asia Motor' },
        to: to.map((email) => ({ email })),
        subject: m.subject,
        htmlContent: html,
        textContent: plain,
        ...(m.replyTo ? { replyTo: { email: m.replyTo } } : {}),
      }),
    })
  }
  if (!res.ok) throw new Error(`mail provider answered ${res.status}: ${(await res.text()).slice(0, 300)}`)
}

// ------------------------------------------------------------------ entry
function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors } })
}

export async function handle(req: Request, env: Env, kindParam: string, ip = ''): Promise<Response> {
  const origin = req.headers.get('Origin') ?? ''
  const self = new URL(req.url).origin
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const crossOk = origin && allowed.includes(origin)
  const cors: Record<string, string> = crossOk ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}

  if (req.method === 'OPTIONS')
    return new Response(null, { status: crossOk ? 204 : 403, headers: { ...cors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } })
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405, cors)
  // only this site (or a listed one) may post: blocks other pages from using the form as a mail relay
  if (origin && origin !== self && !crossOk) return json({ ok: false, error: 'origin' }, 403, cors)
  const kind = kindParam as Kind
  if (!KINDS.includes(kind)) return json({ ok: false, error: 'kind' }, 404, cors)
  if (!(req.headers.get('Content-Type') ?? '').includes('application/json')) return json({ ok: false, error: 'type' }, 415, cors)
  if (limited(ip || req.headers.get('CF-Connecting-IP') || 'local')) return json({ ok: false, error: 'rate' }, 429, cors)

  let body: Record<string, unknown>
  try {
    const raw = await req.text()
    if (raw.length > 50_000) return json({ ok: false, error: 'size' }, 413, cors)
    body = JSON.parse(raw)
    if (!body || typeof body !== 'object') throw new Error()
  } catch {
    return json({ ok: false, error: 'json' }, 400, cors)
  }

  // bots: they fill the hidden "website" field and submit instantly. Answer as if it worked.
  if (text(body.website, 200) || Number(body.elapsed) < 1500) return json({ ok: true, id: 'R-0' }, 200, cors)

  let mail: Mail
  try {
    mail = build(kind, body)
  } catch (e) {
    if (e instanceof Invalid) return json({ ok: false, error: 'validation', fields: e.fields }, 422, cors)
    throw e
  }

  if (!env.MAIL_API_KEY || !env.MAIL_FROM || !env.MAIL_TO) {
    console.error('mail is not configured: set MAIL_API_KEY, MAIL_FROM and MAIL_TO')
    return json({ ok: false, error: 'config' }, 503, cors)
  }
  try {
    await sendMail(env, mail)
  } catch (e) {
    console.error(e)
    return json({ ok: false, error: 'mail' }, 502, cors)
  }
  return json({ ok: true, id: mail.id }, 200, cors)
}
