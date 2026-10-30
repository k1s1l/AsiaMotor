import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Check, Copy, ExternalLink, Info, Minus, Phone, Plus, Truck } from 'lucide-react'
import { useI18n } from '../i18n'
import { useStore } from '../store'
import { compatLabel, getProduct, getProductById, similar, type Product } from '../data/catalog'
import { findCat, findSub } from '../data/taxonomy'
import { company } from '../data/company'
import { AddToCart, Crumbs, DemoTag, FitBadge, Price, Stock } from '../components/shop/bits'
import { ProductRail } from '../components/shop/ProductRail'
import { CarPicker } from '../components/shop/CarPicker'
import { absUrl, useSeo } from '../lib/seo'
import { NotFound } from './NotFound'

function Gallery({ p }: { p: Product }) {
  const { t } = useI18n()
  const [i, setI] = useState(0)
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null)
  useEffect(() => setI(0), [p.id])
  return (
    <div className="lg:sticky lg:top-24">
      <div
        className="relative cursor-zoom-in overflow-hidden rounded-[24px] bg-[#e9e7e2]"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
        }}
        onMouseLeave={() => setZoom(null)}
      >
        <img
          key={p.images[i]}
          src={p.images[i]}
          alt={p.name.ua}
          className="aspect-square w-full animate-[fadeIn_.4s_ease] object-cover transition-transform duration-300 ease-out"
          style={zoom ? { transform: 'scale(1.8)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
        />
        <span className="absolute left-4 top-4 flex gap-1.5">
          <DemoTag p={p} />
          <span className="rounded-md bg-white/80 px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider text-ink/60 backdrop-blur">{t.common.illustration}</span>
        </span>
      </div>
      {p.images.length > 1 && (
        <div className="mt-3 flex gap-2">
          {p.images.map((src, n) => (
            <button key={src + n} onClick={() => setI(n)} aria-label={`${n + 1}`} aria-pressed={i === n} className={`overflow-hidden rounded-xl ring-2 transition ${i === n ? 'ring-accent' : 'ring-transparent opacity-70 hover:opacity-100'}`}>
              <img src={src} alt="" className="h-20 w-20 bg-[#e9e7e2] object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      <p className="mt-3 flex gap-2 text-[12.5px] leading-relaxed text-ink/50">
        <Info size={14} className="mt-0.5 shrink-0" /> {t.product.photoNote}
      </p>
    </div>
  )
}

export function ProductPage() {
  const { slug = '' } = useParams()
  const p = getProduct(slug)
  return p ? <ProductView key={p.id} p={p} /> : <NotFound />
}

function ProductView({ p }: { p: Product }) {
  const { t, lang } = useI18n()
  const { car, viewed, recent } = useStore()
  const [qty, setQty] = useState(1)
  const [copied, setCopied] = useState(false)
  const cat = findCat(p.cat)!
  const sub = findSub(cat, p.sub)!
  const name = p.name[lang]

  useEffect(() => viewed(p.id), [p.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const path = `/product/${p.slug}`
  const availability = { in: 'InStock', low: 'LimitedAvailability', order: 'BackOrder', ask: 'InStoreOnly' }[p.stock]
  useSeo({
    title: `${name} — ${lang === 'ua' ? 'купити' : 'купить'}, ${lang === 'ua' ? 'ціна' : 'цена'} | Asia Motor`,
    description: `${name}. ${t.product.article} ${p.article}. ${p.compat.map(compatLabel).join(', ')}. ${lang === 'ua' ? 'Доставка по Україні, склад у Запоріжжі.' : 'Доставка по Украине, склад в Запорожье.'}`,
    path,
    // demo items are not real offers: no Offer markup for them
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name,
        sku: p.article,
        mpn: p.article,
        image: p.images.map((src) => absUrl(src.replace(import.meta.env.BASE_URL, '/'))),
        description: p.description[lang],
        brand: p.manufacturer !== '—' ? { '@type': 'Brand', name: p.manufacturer } : undefined,
        category: `${cat[lang]} / ${sub[lang]}`,
        ...(p.source === 'asiamotor'
          ? { offers: { '@type': 'Offer', price: p.price, priceCurrency: p.currency, availability: `https://schema.org/${availability}`, url: absUrl(path), seller: { '@type': 'Organization', name: 'Asia Motor' } } }
          : {}),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: t.catalog.title, item: absUrl('/catalog') },
          { '@type': 'ListItem', position: 2, name: cat[lang], item: absUrl(`/catalog/${cat.slug}`) },
          { '@type': 'ListItem', position: 3, name: sub[lang], item: absUrl(`/catalog/${cat.slug}/${sub.slug}`) },
        ],
      },
    ],
  })

  const copy = () => {
    navigator.clipboard?.writeText(p.article).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      },
      () => {},
    )
  }

  const recentItems = recent
    .filter((id) => id !== p.id)
    .map(getProductById)
    .filter(Boolean) as Product[]

  return (
    <div className="bg-paper pb-24 pt-[96px] text-ink lg:pt-[136px]">
      <div className="container-x">
        <Crumbs items={[{ to: '/', label: t.common.home }, { to: '/catalog', label: t.catalog.title }, { to: `/catalog/${cat.slug}`, label: cat[lang] }, { to: `/catalog/${cat.slug}/${sub.slug}`, label: sub[lang] }, { label: p.article }]} />

        <div data-product className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14">
          <Gallery p={p} />

          <div className="min-w-0 animate-[cardIn_.6s_var(--ease-out-expo)_both]">
            <p className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[13px] ${p.source === 'demo' ? 'bg-ink/5 text-ink/65' : 'bg-emerald-50 text-emerald-900'}`}>
              <Info size={15} className="mt-0.5 shrink-0" />
              {p.source === 'demo' ? t.product.demoProduct : t.product.realProduct}
            </p>
            <h1 className="mt-5 text-[clamp(24px,2.6vw,34px)] font-bold leading-[1.15] tracking-[-0.02em]">{name}</h1>
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
              <div className="flex items-center gap-2">
                <dt className="text-ink/55">{t.product.article}:</dt>
                <dd className="flex items-center gap-1.5 font-mono font-medium">
                  {p.article}
                  <button onClick={copy} className="text-ink/40 hover:text-ink" aria-label={t.common.copy} title={copied ? t.common.copied : t.common.copy}>
                    {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-ink/55">{t.product.manufacturer}:</dt>
                <dd className="font-medium">{p.manufacturer === '—' ? t.catalog.qualities.unknown : p.manufacturer}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-ink/55">{t.product.quality}:</dt>
                <dd className="font-medium">{t.catalog.qualities[p.quality]}</dd>
              </div>
            </dl>

            {/* buy box */}
            <div className="mt-6 rounded-[22px] border border-ink/10 bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <Price p={p} size="lg" />
                <Stock p={p} />
              </div>
              <div className="mt-5 flex gap-2">
                <div className="flex items-center rounded-xl border border-ink/15" role="group" aria-label={t.product.qty}>
                  <button className="grid h-14 w-11 place-items-center" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="−1">
                    <Minus size={15} />
                  </button>
                  <span className="w-7 text-center text-[16px] font-semibold tabular-nums" aria-live="polite">
                    {qty}
                  </span>
                  <button className="grid h-14 w-11 place-items-center" onClick={() => setQty(Math.min(99, qty + 1))} aria-label="+1">
                    <Plus size={15} />
                  </button>
                </div>
                <div className="flex-1">
                  <AddToCart p={p} qty={qty} size="lg" full />
                </div>
              </div>
              <a href={company.phones[0].href} className="btn btn-line mt-2 w-full min-h-[48px] text-[14px]">
                <Phone size={15} /> {t.product.callback}: {company.phones[0].display}
              </a>
              <div className="mt-5 border-t border-ink/8 pt-4">
                {car ? (
                  <div className="space-y-2">
                    <FitBadge p={p} full />
                  </div>
                ) : (
                  <details className="group">
                    <summary className="cursor-pointer list-none text-[14px] font-semibold text-accent">{t.product.fits.none} →</summary>
                    <div className="mt-3">
                      <CarPicker idPrefix="pdp-car" />
                    </div>
                  </details>
                )}
              </div>
            </div>

            <ul className="mt-5 space-y-2 text-[14px] text-ink/70">
              {t.product.deliveryList.slice(0, 3).map((d) => (
                <li key={d} className="flex gap-2.5">
                  <Truck size={16} className="mt-0.5 shrink-0 text-ink/40" /> {d}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* details */}
        <div className="mt-14 grid gap-10 lg:grid-cols-2">
          <section>
            <h2 className="font-display text-xl font-semibold uppercase tracking-tight">{t.product.compat}</h2>
            {p.compat.length ? (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-ink/10 bg-white">
                <table className="w-full text-left text-[14px]">
                  <thead className="bg-ink/[0.03] text-[12.5px] text-ink/55">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t.product.compatTable.car}</th>
                      <th className="px-4 py-3 font-medium">{t.product.compatTable.years}</th>
                      <th className="px-4 py-3 font-medium">{t.product.compatTable.engines}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.compat.map((c, i) => (
                      <tr key={i} className="border-t border-ink/8">
                        <td className="px-4 py-3 font-semibold">
                          <Link to={`/cars/${c.make}/${c.model}`} className="link-u">
                            {compatLabel(c)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 tabular-nums">{c.years ? `${c.years[0]}–${c.years[1]}` : <span className="text-ink/45">{t.product.compatTable.notSpecified}</span>}</td>
                        <td className="px-4 py-3">{c.engines ? c.engines.join(', ') : <span className="text-ink/45">{t.product.compatTable.all}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-ink/60">{t.product.noCompat}</p>
            )}

            <h2 className="mt-10 font-display text-xl font-semibold uppercase tracking-tight">{t.product.description}</h2>
            <p className="mt-4 max-w-[62ch] text-[16px] leading-relaxed text-ink/75">{p.description[lang]}</p>
            {p.url && (
              <a href={p.url} target="_blank" rel="noreferrer" className="link-u mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold">
                {t.product.source} <ExternalLink size={14} />
              </a>
            )}
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold uppercase tracking-tight">{t.product.specs}</h2>
            <dl className="mt-4 divide-y divide-ink/8 rounded-2xl border border-ink/10 bg-white text-[14px]">
              {[{ k: { ua: 'Артикул', ru: 'Артикул' }, v: { ua: p.article, ru: p.article } }, ...p.specs.filter((s) => s.k.ua !== 'Артикул')].map((s, i) => (
                <div key={i} className="flex justify-between gap-6 px-4 py-3">
                  <dt className="text-ink/55">{s.k[lang]}</dt>
                  <dd className="text-right font-medium">{s.v[lang]}</dd>
                </div>
              ))}
            </dl>

            <h2 className="mt-10 font-display text-xl font-semibold uppercase tracking-tight">{t.product.delivery}</h2>
            <ul className="mt-4 space-y-2.5 text-[15px] text-ink/75">
              {t.product.deliveryList.map((d) => (
                <li key={d} className="flex gap-2.5">
                  <Check size={17} className="mt-0.5 shrink-0 text-accent" /> {d}
                </li>
              ))}
            </ul>
            <Link to="/delivery" className="link-u mt-3 inline-block text-[14px] font-semibold">
              {t.info.deliveryTitle} →
            </Link>
          </section>
        </div>

        <div className="mt-16 space-y-16">
          <ProductRail title={t.product.similar} items={similar(p)} to={`/catalog/${cat.slug}/${sub.slug}`} />
          <ProductRail title={t.home.recent} items={recentItems} />
        </div>
      </div>
    </div>
  )
}
