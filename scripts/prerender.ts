// Post-build step: one static HTML file per route with its own <title>, description, canonical,
// Open Graph and JSON-LD, plus sitemap.xml, robots.txt and 404.html.
// Crawlers get correct metadata without running JavaScript, and deep links work on static hosting.
// Run after `vite build`: BASE_PATH=/AsiaMotor/ tsx scripts/prerender.ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { products, compatLabel, formatPrice } from '../src/data/catalog'
import { taxonomy } from '../src/data/taxonomy'
import { makes } from '../src/data/vehicles'
import { company } from '../src/data/company'
import { ORIGIN } from '../src/lib/seo'

const BASE = process.env.BASE_PATH ?? '/'
const DIST = join(import.meta.dirname, '..', 'dist')
const abs = (path: string) => ORIGIN + BASE.replace(/\/$/, '') + path
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const template = readFileSync(join(DIST, 'index.html'), 'utf8')

interface Page {
  path: string
  title: string
  description: string
  h1: string
  links?: [string, string][]
  jsonLd?: object[]
  noindex?: boolean
  priority?: number
}

const crumbs = (items: [string, string][]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(path) })),
})
const org = {
  '@context': 'https://schema.org',
  '@type': 'AutoPartsStore',
  name: 'Asia Motor',
  foundingDate: String(company.since),
  email: company.email,
  telephone: company.phones.map((p) => p.href.replace('tel:', '')),
  address: { '@type': 'PostalAddress', streetAddress: 'вул. Крива Бухта, 2', addressLocality: 'Запоріжжя', addressCountry: 'UA' },
  url: abs('/'),
}

const pages: Page[] = [
  {
    path: '/',
    title: 'Asia Motor — запчастини для китайських авто: Haval, Chery, Geely | Запоріжжя',
    description: 'Запчастини для Haval, Chery, Geely, Great Wall, BYD та Lifan. Підбір за вашим авто, власний склад у Запоріжжі й доставка по всій Україні.',
    h1: 'Запчастини для китайських автомобілів',
    links: taxonomy.map((c) => [`/catalog/${c.slug}`, c.ua]),
    jsonLd: [org],
    priority: 1,
  },
  {
    path: '/catalog',
    title: 'Каталог запчастин — купити в Україні | Asia Motor',
    description: `Каталог запчастин для китайських авто, позицій: ${products.length}. Підбір за авто, доставка по Україні.`,
    h1: 'Каталог запчастин',
    links: taxonomy.map((c) => [`/catalog/${c.slug}`, c.ua]),
    priority: 0.9,
  },
  ...taxonomy.flatMap((c) => {
    const n = products.filter((p) => p.cat === c.slug).length
    return [
      {
        path: `/catalog/${c.slug}`,
        title: `${c.ua} — купити в Україні | Asia Motor`,
        description: `${c.ua} для китайських авто: Haval, Chery, Geely, Great Wall, BYD, Lifan. Позицій: ${n}. Підбір за авто, доставка по Україні, склад у Запоріжжі.`,
        h1: c.ua,
        links: c.subs.map((s) => [`/catalog/${c.slug}/${s.slug}`, s.ua] as [string, string]),
        jsonLd: [crumbs([['Каталог запчастин', '/catalog'], [c.ua, `/catalog/${c.slug}`]])],
        priority: 0.8,
      },
      ...c.subs.map((s) => {
        const list = products.filter((p) => p.sub === s.slug)
        return {
          path: `/catalog/${c.slug}/${s.slug}`,
          title: `${s.ua} — купити в Україні | Asia Motor`,
          description: `${s.ua} для китайських авто: Haval, Chery, Geely, Great Wall, BYD, Lifan. Позицій: ${list.length}. Підбір за авто, доставка по Україні, склад у Запоріжжі.`,
          h1: s.ua,
          links: list.map((p) => [`/product/${p.slug}`, p.name.ua] as [string, string]),
          jsonLd: [crumbs([['Каталог запчастин', '/catalog'], [c.ua, `/catalog/${c.slug}`], [s.ua, `/catalog/${c.slug}/${s.slug}`]])],
          priority: 0.7,
        }
      }),
    ]
  }),
  ...makes.flatMap((mk) => [
    {
      path: `/cars/${mk.slug}`,
      title: `Запчастини для ${mk.name} — купити в Україні, ціни | Asia Motor`,
      description: `Запчастини для ${mk.name}: ${mk.models.map((m) => m.name).join(', ')}. Кузов, підвіска, гальма, двигун, оптика, ТО. Доставка по Україні.`,
      h1: `Запчастини для ${mk.name}`,
      links: mk.models.map((m) => [`/cars/${mk.slug}/${m.slug}`, `${mk.name} ${m.name}`] as [string, string]),
      priority: 0.7,
    },
    ...mk.models.map((md) => {
      const list = products.filter((p) => p.compat.some((c) => c.make === mk.slug && c.model === md.slug))
      const name = `${mk.name} ${md.name}`
      return {
        path: `/cars/${mk.slug}/${md.slug}`,
        title: `Запчастини для ${name} — купити в Україні, ціни | Asia Motor`,
        description: `Позицій для ${name} у каталозі: ${list.length} — кузов, підвіска, гальма, двигун, оптика та деталі для ТО. ${md.years[0]}–${md.years[1]}, ${md.engines.join(', ')}.`,
        h1: `Запчастини для ${name}`,
        links: list.map((p) => [`/product/${p.slug}`, p.name.ua] as [string, string]),
        jsonLd: [crumbs([[mk.name, `/cars/${mk.slug}`], [name, `/cars/${mk.slug}/${md.slug}`]])],
        priority: list.length ? 0.7 : 0.3,
      }
    }),
  ]),
  ...products.map((p) => {
    const cat = taxonomy.find((c) => c.slug === p.cat)!
    const sub = cat.subs.find((s) => s.slug === p.sub)!
    const availability = { in: 'InStock', low: 'LimitedAvailability', order: 'BackOrder', ask: 'InStoreOnly' }[p.stock]
    return {
      path: `/product/${p.slug}`,
      title: `${p.name.ua} — купити, ціна | Asia Motor`,
      description: `${p.name.ua}. Артикул ${p.article}. ${p.compat.map(compatLabel).join(', ')}. ${p.source === 'asiamotor' ? `Ціна ${formatPrice(p.price, p.currency)}. ` : ''}Доставка по Україні, склад у Запоріжжі.`,
      h1: p.name.ua,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: p.name.ua,
          sku: p.article,
          mpn: p.article,
          image: p.images.map((src) => abs(src)),
          description: p.description.ua,
          ...(p.manufacturer !== '—' ? { brand: { '@type': 'Brand', name: p.manufacturer } } : {}),
          category: `${cat.ua} / ${sub.ua}`,
          // demo items are not real offers
          ...(p.source === 'asiamotor' ? { offers: { '@type': 'Offer', price: p.price, priceCurrency: p.currency, availability: `https://schema.org/${availability}`, url: abs(`/product/${p.slug}`) } } : {}),
        },
        crumbs([['Каталог запчастин', '/catalog'], [cat.ua, `/catalog/${cat.slug}`], [sub.ua, `/catalog/${cat.slug}/${sub.slug}`]]),
      ],
      priority: p.source === 'asiamotor' ? 0.6 : 0.4,
    }
  }),
  { path: '/delivery', title: 'Доставка й оплата | Asia Motor', description: 'Доставка по Україні «Новою поштою» та Delivery, самовивіз у Запоріжжі, деталі під замовлення з Китаю.', h1: 'Доставка й оплата', priority: 0.5 },
  { path: '/contacts', title: 'Контакти | Asia Motor', description: `${company.address.ua}. ${company.phones.map((p) => p.display).join(', ')}. ${company.email}`, h1: 'Контакти', jsonLd: [org], priority: 0.5 },
  { path: '/cart', title: 'Кошик | Asia Motor', description: 'Кошик', h1: 'Кошик', noindex: true },
  { path: '/checkout', title: 'Оформлення замовлення | Asia Motor', description: 'Оформлення замовлення', h1: 'Оформлення замовлення', noindex: true },
  { path: '/admin/pricing', title: 'Конкурентне ціноутворення — концепт | Asia Motor', description: 'Внутрішня панель (демо).', h1: 'Конкурентне ціноутворення', noindex: true },
]

function render(pg: Page) {
  const head = [
    `<title>${esc(pg.title)}</title>`,
    `<meta name="description" content="${esc(pg.description)}" />`,
    `<meta name="robots" content="${pg.noindex ? 'noindex, nofollow' : 'index, follow'}" />`,
    `<link rel="canonical" href="${abs(pg.path)}" />`,
    `<meta property="og:type" content="${pg.path.startsWith('/product/') ? 'product' : 'website'}" />`,
    `<meta property="og:title" content="${esc(pg.title)}" />`,
    `<meta property="og:description" content="${esc(pg.description)}" />`,
    `<meta property="og:url" content="${abs(pg.path)}" />`,
    `<meta property="og:locale" content="uk_UA" />`,
    ...(pg.jsonLd ?? []).map((j, i) => `<script type="application/ld+json"${i === 0 ? ' id="ld-json"' : ''}>${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`),
  ].join('\n    ')
  const body = `<noscript><h1>${esc(pg.h1)}</h1><p>${esc(pg.description)}</p>${pg.links?.length ? `<ul>${pg.links.map(([href, label]) => `<li><a href="${BASE.replace(/\/$/, '')}${href}">${esc(label)}</a></li>`).join('')}</ul>` : ''}</noscript>`
  return template
    .replace(/<title>[\s\S]*?<\/title>\s*/, '')
    .replace(/<meta name="description"[^>]*>\s*/, '')
    .replace('</head>', `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root"></div>\n    ${body}`)
}

for (const pg of pages) {
  const file = pg.path === '/' ? join(DIST, 'index.html') : join(DIST, pg.path, 'index.html')
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, render(pg))
}
// unknown URLs: the app shows its own 404 page
writeFileSync(join(DIST, '404.html'), render({ path: '/404', title: 'Сторінку не знайдено | Asia Motor', description: 'Сторінку не знайдено', h1: 'Сторінку не знайдено', noindex: true }))

const today = new Date().toISOString().slice(0, 10)
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
    .filter((p) => !p.noindex)
    .map((p) => `  <url><loc>${abs(p.path)}</loc><lastmod>${today}</lastmod><priority>${(p.priority ?? 0.5).toFixed(1)}</priority></url>`)
    .join('\n')}\n</urlset>\n`,
)
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nDisallow: ${BASE}cart\nDisallow: ${BASE}checkout\nDisallow: ${BASE}admin/\n\nSitemap: ${abs('/sitemap.xml')}\n`)
console.log(`prerendered ${pages.length} pages, sitemap with ${pages.filter((p) => !p.noindex).length} URLs`)
