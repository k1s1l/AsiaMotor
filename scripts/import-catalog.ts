// Imports the store's price list (Excel export from 1C, "Asia_Motor_price_current_stock.xls")
// into src/data/catalog.json — the catalogue the site is built from.
//
//   npm run catalog:import -- path/to/price.xls
//
// What it reads: groups "make → model → products" (Excel outline levels), and per product the
// name, article, 1C code, stock and the retail price in UAH. Wholesale prices, the payment
// details and anything else in the file are NOT copied: the JSON is published with the site.
// A product listed under several models becomes one product with several compatible cars.
// Photos: put files into public/products/ named by the article or the 1C code
// (1301100XKZ36A.jpg, 1301100XKZ36A-2.jpg …), or add a column "Фото" with links to the sheet.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import XLSX from 'xlsx'
import { rules, fold, notVehicles, modelNames } from './catalog-rules'
import { allCategories as taxonomy } from '../src/data/taxonomy'

const file = process.argv[2]
if (!file || !existsSync(file)) {
  console.error('usage: npm run catalog:import -- path/to/price.xls')
  process.exit(1)
}

const translit: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', ы: 'y', э: 'e', ё: 'e', ъ: '',
}
const slugify = (s: string) =>
  s
    .toLowerCase()
    .split('')
    .map((ch) => translit[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
const str = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim())
const photoKey = (s: string) => s.toUpperCase().replace(/[^A-Z0-9А-ЯІЇЄҐ]/g, '')

// ------------------------------------------------------------------ read the sheet
const wb = XLSX.readFile(file, { cellStyles: true })
const ws = wb.Sheets[wb.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: true, defval: '' })
const levels = (ws['!rows'] ?? []).map((r) => r?.level ?? 0)

const headerRow = rows.findIndex((r) => r.some((c) => str(c) === 'Артикул'))
if (headerRow < 0) throw new Error('header row with "Артикул" not found')
const head = rows[headerRow].map(str)
const col = (name: string) => {
  const i = head.findIndex((h) => h === name)
  if (i < 0) throw new Error(`column "${name}" not found`)
  return i
}
const cName = 0
const cArticle = col('Артикул')
const cCode = col('Номенклатура.Код')
const cStock = col('Наличие')
// the retail UAH price: the column under "Розница грн" two rows above the header
const cRetail = rows[headerRow - 2].findIndex((c) => /розница грн/i.test(str(c)))
if (cRetail < 0) throw new Error('column "Розница грн" not found')
const cPhoto = head.findIndex((h) => /^фото$/i.test(h))
const dateCell = rows.slice(0, headerRow).flat().map(str).find((c) => /^\d{2}\.\d{2}\.\d{4}$/.test(c))
const priceDate = dateCell ? dateCell.split('.').reverse().join('-') : new Date().toISOString().slice(0, 10)

// ------------------------------------------------------------------ photos on disk
const photoDir = 'public/products'
const photos = new Map<string, string[]>()
if (existsSync(photoDir))
  for (const f of readdirSync(photoDir).sort()) {
    const m = f.match(/^(.+?)(?:-(\d+))?\.(jpe?g|png|webp|avif)$/i)
    if (!m) continue
    const k = photoKey(m[1])
    photos.set(k, [...(photos.get(k) ?? []), `products/${f}`])
  }

// ------------------------------------------------------------------ walk the groups
interface Out {
  id: string
  slug: string
  name: string
  article: string
  code: string
  cat: string
  sub: string
  price: number
  qty: number
  cars: string[]
  images: string[]
}
const products = new Map<string, Out>()
const makes = new Map<string, { slug: string; name: string; models: Map<string, { slug: string; name: string }> }>()
const unmatched: string[] = []
const conflicts: string[] = []
let make = ''
let model = ''
let lines = 0

const cleanName = (s: string) =>
  s
    .replace(/\s+/g, ' ')
    .replace(/,\s*шт\.?$/i, '')
    .replace(/,\s*(компл\.?|к-т|комплект)$/i, ' (комплект)')
    .replace(/,\s*пара$/i, ' (пара)')
    .trim()

for (let r = headerRow + 1; r < rows.length; r++) {
  const row = rows[r]
  const level = levels[r] ?? 0
  const first = str(row[cName])
  if (level === 0 && !str(row[cCode])) {
    make = first
    continue
  }
  if (level === 1 && !str(row[cCode])) {
    model = modelNames[make]?.[first] ?? first
    continue
  }
  const code = str(row[cCode])
  if (!code || !first) continue
  lines++
  const price = Number(row[cRetail])
  const qty = Number(row[cStock]) || 0
  const name = cleanName(first)
  let p = products.get(code)
  if (!p) {
    const f = fold(name)
    const hit = rules.find(([re]) => re.test(f))
    if (!hit) unmatched.push(name)
    const [cat, sub] = (hit?.[1] ?? '/').split('/')
    if (hit && !hit[1]) continue
    const article = str(row[cArticle])
    const own = [...(photos.get(photoKey(article)) ?? []), ...(photos.get(photoKey(code)) ?? [])]
    const links = cPhoto >= 0 ? str(row[cPhoto]).split(/[\s;,]+/).filter((u) => /^https:\/\//.test(u)) : []
    p = { id: code, slug: '', name, article, code, cat, sub, price, qty, cars: [], images: [...new Set([...own, ...links])] }
    products.set(code, p)
  } else if (p.price !== price || p.name !== name) {
    conflicts.push(`${code}: "${p.name}" ${p.price} ≠ "${name}" ${price}`)
  }
  if (!notVehicles.some((re) => re.test(make)) && !notVehicles.some((re) => re.test(model))) {
    const mkSlug = slugify(make)
    const mk = makes.get(mkSlug) ?? { slug: mkSlug, name: make, models: new Map() }
    makes.set(mkSlug, mk)
    // different names can share a slug ("Pure RWD" / "Pure+ RWD"): number the later ones
    let mdSlug = slugify(model) || 'model'
    for (let n = 2; mk.models.has(mdSlug) && mk.models.get(mdSlug)!.name !== model; n++) mdSlug = `${slugify(model) || 'model'}-${n}`
    if (!mk.models.has(mdSlug)) mk.models.set(mdSlug, { slug: mdSlug, name: model })
    const key = `${mkSlug}/${mdSlug}`
    if (!p.cars.includes(key)) p.cars.push(key)
  }
}

// ------------------------------------------------------------------ slugs, checks, output
const used = new Set<string>()
for (const p of products.values()) {
  let s = slugify(p.name).slice(0, 90).replace(/-$/, '')
  if (used.has(s)) s = `${s}-${slugify(p.code)}`
  used.add(s)
  p.slug = s
}
const known = new Set(taxonomy.flatMap((c) => c.subs.map((s) => `${c.slug}/${s.slug}`)))
const badRule = [...new Set([...products.values()].map((p) => `${p.cat}/${p.sub}`))].filter((k) => k !== '/' && !known.has(k))
if (badRule.length) throw new Error(`rules point to unknown categories: ${badRule.join(', ')}`)
const invalid = [...products.values()].filter((p) => !(p.price > 0) || !p.name)
const list = [...products.values()].filter((p) => p.cat).sort((a, b) => a.name.localeCompare(b.name, 'uk'))

const out = {
  source: file.split('/').pop(),
  priceDate,
  imported: new Date().toISOString(),
  makes: [...makes.values()]
    .map((m) => ({ slug: m.slug, name: m.name, models: [...m.models.values()].sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true })) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en')),
  products: list,
}
writeFileSync('src/data/catalog.json', JSON.stringify(out))

const perCat = new Map<string, number>()
for (const p of list) perCat.set(p.cat, (perCat.get(p.cat) ?? 0) + 1)
console.log(`price list: ${file} (${priceDate})`)
console.log(`lines: ${lines}, unique products: ${products.size}, published: ${list.length}`)
console.log(`makes: ${out.makes.length}, models: ${out.makes.reduce((n, m) => n + m.models.length, 0)}`)
console.log(`with photos: ${list.filter((p) => p.images.length).length}, without compatibility (universal): ${list.filter((p) => !p.cars.length).length}`)
console.log('per category:', Object.fromEntries(taxonomy.map((c) => [c.slug, perCat.get(c.slug) ?? 0])))
if (invalid.length) console.log(`\nwithout a price or name (${invalid.length}):\n  ` + invalid.map((p) => p.code).join('\n  '))
if (conflicts.length) console.log(`\nsame code, different name/price (${conflicts.length}):\n  ` + conflicts.slice(0, 30).join('\n  '))
if (unmatched.length) console.log(`\nnot sorted into a category — NOT published (${unmatched.length}), add rules in scripts/catalog-rules.ts:\n  ` + unmatched.join('\n  '))
