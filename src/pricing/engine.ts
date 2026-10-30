// Competitive pricing engine — pure functions, no I/O.
// The same module is meant to run on the server (scheduled job) in production; the admin
// console in this demo calls it in the browser on sample data. See spec/03-pricing.md.

export type Mode = 'manual' | 'confirm' | 'auto'
export type Side = 'left' | 'right' | null

export interface OurItem {
  sku: string
  name: string
  /** manufacturer of OUR item, normalised on compare */
  brand: string
  article: string
  /** confirmed cross-references (OEM numbers / analog articles) */
  crossRefs?: string[]
  side?: Side
  /** purchase price, UAH */
  cost: number
  /** list price set by the manager — the reference for "max discount" */
  basePrice: number
  /** current selling price */
  price: number
  /** per-item overrides */
  rules?: Partial<Rules>
  /** last automatic or approved change, ISO date */
  lastChangeAt?: string
}

export interface Offer {
  competitor: string
  source: 'api' | 'feed' | 'csv' | 'monitor'
  title: string
  brand: string
  article: string
  side?: Side
  price: number
  currency: string
  inStock: boolean
  observedAt: string
  url?: string
}

export interface Rules {
  mode: Mode
  /** how much cheaper than the best competitor, UAH */
  step: number
  /** absolute floor, UAH (0 = not set) */
  minPrice: number
  /** minimum margin over cost, % */
  minMarginPct: number
  /** maximum discount from the base (list) price, % */
  maxDropPct: number
  /** never go above base price when raising back */
  capAtBase: boolean
  /** offers older than this are ignored, hours */
  staleHours: number
  /** minimum time between two changes of one item, hours */
  cooldownHours: number
  /** offers cheaper than this share of the offers' median are treated as errors, % */
  outlierPct: number
  /** item excluded from repricing */
  excluded: boolean
  /** price fixed manually — engine only reports */
  frozen: boolean
  /** auto mode applies a change only if it is within this many % of the current price */
  autoMaxStepPct: number
}

export const defaultRules: Rules = {
  mode: 'confirm',
  step: 1,
  minPrice: 0,
  minMarginPct: 12,
  maxDropPct: 15,
  capAtBase: true,
  staleHours: 48,
  cooldownHours: 12,
  outlierPct: 60,
  excluded: false,
  frozen: false,
  autoMaxStepPct: 5,
}

// ------------------------------------------------------------------ matching
export type MatchKind = 'exact' | 'cross' | 'review' | 'rejected'

export interface Match {
  offer: Offer
  kind: MatchKind
  score: number
  reasons: string[]
}

export const normArticle = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')
const normBrand = (s: string) => s.toLowerCase().replace(/\(oem\)|oem|[^a-zа-яіїє0-9]/gi, '')

const tokens = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-zа-яіїєґ0-9]+/gi, ' ')
    .split(' ')
    .filter((w) => w.length > 1)

function jaccard(a: string, b: string) {
  const A = new Set(tokens(a))
  const B = new Set(tokens(b))
  const inter = [...A].filter((x) => B.has(x)).length
  return inter / Math.max(1, new Set([...A, ...B]).size)
}

/**
 * Identity first: only the same article from the same manufacturer, or an article from the
 * confirmed cross-reference table, may drive the price automatically. Everything else goes to review.
 */
export function matchOffer(item: OurItem, offer: Offer): Match {
  const reasons: string[] = []
  const a = normArticle(item.article)
  const b = normArticle(offer.article)
  const sideClash = !!item.side && !!offer.side && item.side !== offer.side
  const related = (a && a === b) || item.crossRefs?.some((x) => normArticle(x) === b) || jaccard(item.name, offer.title) >= 0.5
  // a left part never matches a right one, even with the same catalogue number
  if (related && sideClash) return { offer, kind: 'rejected', score: 0, reasons: ['side-mismatch'] }
  if (a && a === b) {
    if (normBrand(item.brand) === normBrand(offer.brand)) return { offer, kind: 'exact', score: 1, reasons: ['article+brand'] }
    reasons.push('article-same-brand-differs')
    return { offer, kind: 'review', score: 0.8, reasons }
  }
  if (item.crossRefs?.some((x) => normArticle(x) === b)) return { offer, kind: 'cross', score: 0.95, reasons: ['confirmed-cross-ref'] }
  const sim = jaccard(item.name, offer.title)
  if (sim >= 0.5) return { offer, kind: 'review', score: sim, reasons: ['title-similar-no-article-match'] }
  return { offer, kind: 'rejected', score: sim, reasons: ['no-match'] }
}

// ------------------------------------------------------------------ pricing
export type Action = 'keep' | 'lower' | 'raise' | 'hold-floor' | 'review' | 'skip'
export type Alert = 'below-floor' | 'no-valid-offers' | 'needs-review' | 'outlier-ignored' | 'stale-ignored' | 'out-of-stock-ignored' | 'cooldown' | 'frozen' | 'excluded' | 'large-change'

export interface Decision {
  sku: string
  current: number
  recommended: number
  floor: number
  action: Action
  /** best valid competitor offer, if any */
  best?: Offer
  marginPct: number
  alerts: Alert[]
  matches: Match[]
  /** may the engine apply it without a human in the current mode? */
  autoApply: boolean
  explain: string
}

const hoursBetween = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0
}
export const margin = (price: number, cost: number) => (price > 0 ? ((price - cost) / price) * 100 : 0)

export function floorPrice(item: OurItem, r: Rules) {
  return Math.ceil(Math.max(r.minPrice || 0, item.cost * (1 + r.minMarginPct / 100), item.basePrice * (1 - r.maxDropPct / 100)))
}

export function decide(item: OurItem, offers: Offer[], global: Rules, now: string): Decision {
  const r: Rules = { ...global, ...item.rules }
  const matches = offers.map((o) => matchOffer(item, o))
  const alerts: Alert[] = []
  const floor = floorPrice(item, r)
  const base = { sku: item.sku, current: item.price, floor, matches, marginPct: margin(item.price, item.cost) }

  if (r.excluded) return { ...base, recommended: item.price, action: 'skip', alerts: ['excluded'], autoApply: false, explain: 'Товар виключено з автоматичного ціноутворення.' }
  if (r.frozen) return { ...base, recommended: item.price, action: 'skip', alerts: ['frozen'], autoApply: false, explain: 'Ціну зафіксовано вручну.' }

  // only identical items or confirmed analogs; in stock, fresh, in UAH
  let valid = matches.filter((m) => m.kind === 'exact' || m.kind === 'cross')
  if (matches.some((m) => m.kind === 'review')) alerts.push('needs-review')
  const before = valid.length
  valid = valid.filter((m) => m.offer.inStock)
  if (valid.length < before) alerts.push('out-of-stock-ignored')
  const fresh = valid.filter((m) => hoursBetween(m.offer.observedAt, now) <= r.staleHours && m.offer.currency === 'UAH')
  if (fresh.length < valid.length) alerts.push('stale-ignored')
  // a price far below the others is more likely an error than a real offer
  const med = median(fresh.map((m) => m.offer.price))
  const sane = fresh.filter((m) => fresh.length < 2 || m.offer.price >= med * (r.outlierPct / 100))
  if (sane.length < fresh.length) alerts.push('outlier-ignored')

  if (!sane.length) {
    alerts.push('no-valid-offers')
    const back = r.capAtBase ? Math.min(item.basePrice, Math.max(item.price, floor)) : item.price
    const action: Action = back > item.price ? 'raise' : 'keep'
    return { ...base, recommended: back, action, alerts, autoApply: false, explain: action === 'raise' ? 'Немає підтверджених пропозицій конкурентів — повернення до базової ціни.' : 'Немає підтверджених пропозицій конкурентів — ціна без змін.' }
  }

  const best = sane.reduce((a, b) => (b.offer.price < a.offer.price ? b : a)).offer
  let target = Math.round(best.price - r.step)
  if (r.capAtBase) target = Math.min(target, item.basePrice)

  let action: Action
  let recommended: number
  let explain: string
  if (target < floor) {
    // never below the floor; the most the engine may suggest is the floor itself, and only with approval
    recommended = Math.min(item.price, floor)
    action = 'hold-floor'
    alerts.push('below-floor')
    explain = `${best.competitor}: ${best.price} грн — нижче мінімально допустимої ціни ${floor} грн. Нижче порогу не знижуємо; потрібне рішення адміністратора.`
  } else if (target < item.price) {
    recommended = target
    action = 'lower'
    explain = `${best.competitor}: ${best.price} грн → наша ціна ${target} грн (на ${r.step} грн нижче).`
  } else if (target > item.price) {
    recommended = target
    action = 'raise'
    explain = `Найнижча ціна конкурентів ${best.price} грн — можна підняти до ${target} грн і зберегти перевагу ${r.step} грн.`
  } else {
    recommended = item.price
    action = 'keep'
    explain = 'Ціна вже оптимальна.'
  }

  if (action !== 'keep' && item.lastChangeAt && hoursBetween(item.lastChangeAt, now) < r.cooldownHours) {
    alerts.push('cooldown')
    return { ...base, best, recommended, action: 'skip', alerts, autoApply: false, explain: `${explain} Відкладено: остання зміна була менш ніж ${r.cooldownHours} год тому.` }
  }

  const bigChange = Math.abs(recommended - item.price) / item.price > r.autoMaxStepPct / 100
  if (bigChange && action !== 'keep') alerts.push('large-change')
  const autoApply = r.mode === 'auto' && (action === 'lower' || action === 'raise') && !bigChange && !alerts.includes('needs-review') && !alerts.includes('below-floor')
  return { ...base, best, recommended, action, alerts, autoApply, explain }
}

// ------------------------------------------------------------------ history
export interface Change {
  at: string
  sku: string
  from: number
  to: number
  by: 'auto' | 'admin'
  reason: string
  competitor?: string
  competitorPrice?: number
}

export function applyDecision(item: OurItem, d: Decision, by: Change['by'], at: string): { item: OurItem; change: Change } | null {
  if (d.recommended === item.price) return null
  return {
    item: { ...item, price: d.recommended, lastChangeAt: at },
    change: { at, sku: item.sku, from: item.price, to: d.recommended, by, reason: d.explain, competitor: d.best?.competitor, competitorPrice: d.best?.price },
  }
}

// ------------------------------------------------------------------ CSV import (manual price lists)
/** competitor;article;brand;title;price;in_stock;side — separator ; or , ; header row required */
export function parseCsv(text: string, observedAt: string): { offers: Offer[]; errors: string[] } {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  const errors: string[] = []
  if (lines.length < 2) return { offers: [], errors: ['Порожній файл або немає рядків з даними'] }
  const sep = lines[0].includes(';') ? ';' : ','
  const head = lines[0].split(sep).map((h) => h.trim().toLowerCase())
  const col = (name: string) => head.indexOf(name)
  const need = ['competitor', 'article', 'price']
  const missing = need.filter((n) => col(n) < 0)
  if (missing.length) return { offers: [], errors: [`Немає колонок: ${missing.join(', ')}`] }
  const offers: Offer[] = []
  lines.slice(1).forEach((line, i) => {
    const c = line.split(sep).map((x) => x.trim())
    const price = Number((c[col('price')] ?? '').replace(',', '.').replace(/\s/g, ''))
    if (!c[col('article')] || !Number.isFinite(price) || price <= 0) {
      errors.push(`Рядок ${i + 2}: немає артикула або ціни`)
      return
    }
    const side = (c[col('side')] ?? '').toLowerCase()
    offers.push({
      competitor: c[col('competitor')] || 'CSV',
      source: 'csv',
      article: c[col('article')],
      brand: col('brand') >= 0 ? c[col('brand')] : '',
      title: col('title') >= 0 ? c[col('title')] : '',
      price,
      currency: 'UAH',
      inStock: col('in_stock') < 0 || !/^(0|no|ні|нет|false)$/i.test(c[col('in_stock')] ?? ''),
      side: side.startsWith('l') || side.startsWith('лів') ? 'left' : side.startsWith('r') || side.startsWith('прав') ? 'right' : null,
      observedAt,
    })
  })
  return { offers, errors }
}
