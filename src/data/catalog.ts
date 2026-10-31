// Product catalogue — the store's real assortment.
//
// Source: the price list exported from 1C ("Asia_Motor_price_current_stock.xls"), converted by
// `npm run catalog:import` into catalog.json: name, article, 1C code, retail price in UAH,
// stock and the makes/models each product is listed under. Nothing here is made up: what the
// price list does not contain (descriptions, manufacturer, years) is simply not shown.
import data from './catalog.json'
import { findMake, findModel, type Car } from './vehicles'
import { asset } from '../lib/asset'

export type Lang = 'ua' | 'ru'
type L = { ua: string; ru: string }

export interface Compat {
  make: string
  model: string
}

/** 'low' = one or two pieces left */
export type Stock = 'in' | 'low'

export interface Product {
  id: string
  slug: string
  /** the price list has one name per product; the same text is shown in both languages */
  name: L
  article: string
  /** 1C item code */
  code: string
  cat: string
  sub: string
  /** retail price, UAH */
  price: number
  currency: 'UAH'
  qty: number
  stock: Stock
  compat: Compat[]
  images: string[]
}

/** date of the price list the catalogue was built from (YYYY-MM-DD) */
export const priceDate: string = data.priceDate

// ------------------------------------------------------------------ helpers
export const norm = (s: string) => s.toLowerCase().replace(/[\s\-_.()/\\,+*]/g, '')

const translit: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', ы: 'y', э: 'e', ё: 'e', ъ: '',
}
export function slugify(s: string) {
  return s
    .toLowerCase()
    .split('')
    .map((ch) => translit[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const products: Product[] = data.products.map((p) => ({
  id: p.id,
  slug: p.slug,
  name: { ua: p.name, ru: p.name },
  article: p.article,
  code: p.code,
  cat: p.cat,
  sub: p.sub,
  price: p.price,
  currency: 'UAH',
  qty: p.qty,
  stock: p.qty <= 2 ? 'low' : 'in',
  compat: p.cars.map((c) => {
    const [make, model] = c.split('/')
    return { make, model }
  }),
  // local files are served from public/, links from the price list are used as they are
  images: p.images.map((src) => (/^https:\/\//.test(src) ? src : asset(src))),
}))

const bySlug = new Map(products.map((p) => [p.slug, p]))
const byId = new Map(products.map((p) => [p.id, p]))
export const getProduct = (slug: string) => bySlug.get(slug)
export const getProductById = (id: string) => byId.get(id)

// ------------------------------------------------------------------ compatibility
export type Fit = 'yes' | 'no'

/** Listed for this car in the price list? Nothing else counts as a fit. */
export function fit(p: Product, car: Car): Fit {
  return p.compat.some((c) => c.make === car.make && c.model === car.model) ? 'yes' : 'no'
}

export function compatLabel(c: Compat) {
  const mk = findMake(c.make)
  const md = findModel(mk, c.model)
  return `${mk?.name ?? c.make} ${md?.name ?? c.model}`
}

/** compatibility grouped by make: "Haval: H6, H6-2gr" */
export function compatByMake(p: Product) {
  const m = new Map<string, string[]>()
  for (const c of p.compat) {
    const mk = findMake(c.make)
    const name = mk?.name ?? c.make
    m.set(name, [...(m.get(name) ?? []), findModel(mk, c.model)?.name ?? c.model])
  }
  return [...m.entries()]
}

// ------------------------------------------------------------------ querying
export type Sort = 'relevance' | 'price-asc' | 'price-desc' | 'name'

export interface Query {
  cat?: string
  sub?: string
  q?: string
  car?: Car | null
  make?: string
  priceMin?: number
  priceMax?: number
  sort?: Sort
}

export function searchText(p: Product) {
  return norm([p.name.ua, p.article, p.code, ...p.compat.map(compatLabel)].join(' '))
}
const haystack = new Map(products.map((p) => [p.id, searchText(p)]))

export function query(q: Query): Product[] {
  const terms = (q.q ?? '').toLowerCase().split(/\s+/).map(norm).filter(Boolean)
  const whole = norm(q.q ?? '')
  const list = products.filter((p) => {
    if (q.cat && p.cat !== q.cat) return false
    if (q.sub && p.sub !== q.sub) return false
    if (q.car && fit(p, q.car) === 'no') return false
    if (q.make && !p.compat.some((c) => c.make === q.make)) return false
    if (q.priceMin && p.price < q.priceMin) return false
    if (q.priceMax && p.price > q.priceMax) return false
    if (terms.length) {
      const h = haystack.get(p.id)!
      if (!terms.every((t) => h.includes(t))) return false
    }
    return true
  })
  const s = q.sort ?? 'relevance'
  // relevance: an exact article or code match first, then alphabetical
  const exact = (p: Product) => (whole && (norm(p.article) === whole || norm(p.code) === whole) ? 0 : 1)
  const byName = (a: Product, b: Product) => a.name.ua.localeCompare(b.name.ua, 'uk')
  return [...list].sort((a, b) =>
    s === 'price-asc' ? a.price - b.price : s === 'price-desc' ? b.price - a.price : s === 'name' ? byName(a, b) : exact(a) - exact(b) || byName(a, b),
  )
}

export function similar(p: Product, n = 8) {
  const shared = (x: Product) => x.compat.filter((c) => p.compat.some((d) => d.make === c.make && d.model === c.model)).length
  return products
    .filter((x) => x.id !== p.id && x.sub === p.sub)
    .map((x) => ({ x, s: shared(x) }))
    .sort((a, b) => b.s - a.s || a.x.price - b.x.price)
    .slice(0, n)
    .map(({ x }) => x)
}

export function countBy(list: Product[], key: (p: Product) => string) {
  const m = new Map<string, number>()
  for (const p of list) m.set(key(p), (m.get(key(p)) ?? 0) + 1)
  return m
}

export function formatPrice(price: number) {
  const n = new Intl.NumberFormat('uk-UA', { minimumFractionDigits: price % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(price)
  return `${n} грн`
}
