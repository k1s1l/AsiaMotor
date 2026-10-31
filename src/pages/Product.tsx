import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Check, Copy, Info, MessageCircle, Minus, Phone, Plus, Truck } from 'lucide-react'
import { useI18n } from '../i18n'
import { useStore } from '../store'
import { compatByMake, compatLabel, getProduct, getProductById, priceDate, similar, type Product } from '../data/catalog'
import { findMake } from '../data/vehicles'
import { findCat, findSub } from '../data/taxonomy'
import { company } from '../data/company'
import { AddToCart, Crumbs, FitBadge, Price, ProductImage, Stock } from '../components/shop/bits'
import { ProductRail } from '../components/shop/ProductRail'
import { CarPicker } from '../components/shop/CarPicker'
import { absUrl, useSeo } from '../lib/seo'
import { NotFound } from './NotFound'

function Gallery({ p }: { p: Product }) {
  const { t } = useI18n()
  const [i, setI] = useState(0)
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null)
  useEffect(() => setI(0), [p.id])
  if (!p.images.length)
    return (
      <div className="lg:sticky lg:top-24">
        <ProductImage p={p} className="aspect-[5/2] rounded-[24px] lg:aspect-square" />
        <p className="mt-3 flex gap-2 text-[12.5px] leading-relaxed text-ink/50">
          <Info size={14} className="mt-0.5 shrink-0" /> {t.product.photoNote}
        </p>
      </div>
    )
  return (
    <div className="lg:sticky lg:top-24">
      <div
        className="relative cursor-zoom-in overflow-hidden rounded-[24px] bg-white"
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
          className="aspect-square w-full animate-[fadeIn_.4s_ease] object-contain transition-transform duration-300 ease-out"
          style={zoom ? { transform: 'scale(1.8)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
        />
      </div>
      {p.images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {p.images.map((src, n) => (
            <button key={src + n} onClick={() => setI(n)} aria-label={`${n + 1}`} aria-pressed={i === n} className={`shrink-0 overflow-hidden rounded-xl ring-2 transition ${i === n ? 'ring-accent' : 'ring-transparent opacity-70 hover:opacity-100'}`}>
              <img src={src} alt="" className="h-20 w-20 bg-white object-contain" loading="lazy" />
            </button>
          ))}
        </div>
      )}
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
  const { car, viewed, recent, ask } = useStore()
  const [qty, setQty] = useState(1)
  const [copied, setCopied] = useState(false)
  const cat = findCat(p.cat)!
  const sub = findSub(cat, p.sub)!
  const name = p.name[lang]

  useEffect(() => viewed(p.id), [p.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const path = `/product/${p.slug}`
  const availability = p.stock === 'low' ? 'LimitedAvailability' : 'InStock'
  const cars = compatByMake(p)
  useSeo({
    title: `${name} — ${lang === 'ua' ? 'купити' : 'купить'}, ${lang === 'ua' ? 'ціна' : 'цена'} | Asia Motor`,
    description: `${name}. ${t.product.article} ${p.article || p.code}. ${p.compat.slice(0, 6).map(compatLabel).join(', ')}${p.compat.length > 6 ? '…' : ''}. ${lang === 'ua' ? 'В наявності на складі в Запоріжжі, доставка по Україні.' : 'В наличии на складе в Запорожье, доставка по Украине.'}`,
    path,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name,
        sku: p.code,
        mpn: p.article || undefined,
        image: p.images.length ? p.images.map((src) => (/^https:/.test(src) ? src : absUrl(src.replace(import.meta.env?.BASE_URL ?? '/', '/')))) : undefined,
        category: `${cat[lang]} / ${sub[lang]}`,
        offers: { '@type': 'Offer', price: p.price, priceCurrency: p.currency, availability: `https://schema.org/${availability}`, url: absUrl(path), seller: { '@type': 'Organization', name: 'Asia Motor' } },
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
    navigator.clipboard?.writeText(p.article || p.code).then(
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
        <Crumbs items={[{ to: '/', label: t.common.home }, { to: '/catalog', label: t.catalog.title }, { to: `/catalog/${cat.slug}`, label: cat[lang] }, { to: `/catalog/${cat.slug}/${sub.slug}`, label: sub[lang] }, { label: p.article || p.code }]} />

        <div data-product className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14">
          <Gallery p={p} />

          <div className="min-w-0 animate-[cardIn_.6s_var(--ease-out-expo)_both]">
            <h1 className="text-[clamp(24px,2.6vw,34px)] font-bold leading-[1.15] tracking-[-0.02em]">{name}</h1>
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
              <div className="flex items-center gap-2">
                <dt className="text-ink/55">{t.product.article}:</dt>
                <dd className="flex items-center gap-1.5 font-mono font-medium">
                  {p.article || '—'}
                  <button onClick={copy} className="text-ink/40 hover:text-ink" aria-label={t.common.copy} title={copied ? t.common.copied : t.common.copy}>
                    {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-ink/55">{t.product.code}:</dt>
                <dd className="font-mono font-medium">{p.code}</dd>
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
                  <button className="grid h-14 w-11 place-items-center disabled:opacity-30" disabled={qty >= p.qty} title={t.cart.maxQty(p.qty)} onClick={() => setQty(Math.min(p.qty, qty + 1))} aria-label="+1">
                    <Plus size={15} />
                  </button>
                </div>
                <div className="flex-1">
                  <AddToCart p={p} qty={qty} size="lg" full />
                </div>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <button onClick={() => ask('product', p.id)} className="btn btn-line min-h-[48px] text-[14px]">
                  <MessageCircle size={15} /> {t.product.callback}
                </button>
                <a href={company.phones[0].href} className="btn btn-line min-h-[48px] text-[14px]">
                  <Phone size={15} /> {company.phones[0].display}
                </a>
              </div>
              <p className="mt-3 text-[12.5px] text-ink/45">{t.catalog.updated(priceDate.split('-').reverse().join('.'))}</p>
              {(p.cat === 'kuzov' || p.cat === 'optyka') && (
                <p className="mt-2 flex gap-2 text-[13px] text-amber-800">
                  <Info size={15} className="mt-0.5 shrink-0" /> {t.product.prepay}
                </p>
              )}
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
            {cars.length ? (
              <>
                <p className="mt-2 text-[14px] text-ink/55">{t.product.compatCount(p.compat.length)}</p>
                <div className="mt-4 divide-y divide-ink/8 rounded-2xl border border-ink/10 bg-white">
                  {cars.map(([make, models]) => {
                    const mk = findMake(p.compat.find((c) => (findMake(c.make)?.name ?? c.make) === make)?.make)
                    return (
                      <div key={make} className="grid gap-2 px-4 py-3 sm:grid-cols-[130px_1fr]">
                        <p className="font-semibold">{make}</p>
                        <ul className="flex flex-wrap gap-1.5">
                          {p.compat
                            .filter((c) => c.make === mk?.slug)
                            .map((c, i) => (
                              <li key={c.model}>
                                <Link to={`/cars/${c.make}/${c.model}`} className="inline-block rounded-lg bg-ink/[0.05] px-2.5 py-1 text-[13.5px] hover:bg-accent hover:text-white">
                                  {models[i]}
                                </Link>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )
                  })}
                </div>
                <p className="mt-3 flex gap-2 text-[13px] text-ink/55">
                  <Info size={14} className="mt-0.5 shrink-0" /> {t.product.compatNote}
                </p>
              </>
            ) : (
              <p className="mt-4 text-ink/60">{t.product.noCompat}</p>
            )}
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold uppercase tracking-tight">{t.product.specs}</h2>
            <dl className="mt-4 divide-y divide-ink/8 rounded-2xl border border-ink/10 bg-white text-[14px]">
              {(
                [
                  [t.product.article, p.article || '—'],
                  [t.product.code, p.code],
                  [t.product.category, `${cat[lang]} / ${sub[lang]}`],
                  [t.catalog.price.split(',')[0], `${p.price.toLocaleString('uk-UA')} грн`],
                  [t.product.qty, p.stock === 'low' ? t.product.stockLeft(p.qty) : t.product.inStock],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 px-4 py-3">
                  <dt className="text-ink/55">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
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
