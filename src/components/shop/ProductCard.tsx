import { Link } from 'react-router'
import { useI18n } from '../../i18n'
import { compatLabel, type Product } from '../../data/catalog'
import { AddToCart, FitBadge, Price, ProductImage, Stock } from './bits'

export const productPath = (p: Product) => `/product/${p.slug}`

function compatLine(p: Product, lang: 'ua' | 'ru') {
  if (!p.compat.length) return lang === 'ua' ? 'Сумісність уточнюйте в менеджера' : 'Совместимость уточняйте у менеджера'
  const more = p.compat.length > 1 ? ` +${p.compat.length - 1}` : ''
  return `${compatLabel(p.compat[0])}${more}`
}

export function ProductCard({ p, view = 'grid', i = 0 }: { p: Product; view?: 'grid' | 'list'; i?: number }) {
  const { lang } = useI18n()
  const image = (
    <Link to={productPath(p)} className="img-zoom relative block overflow-hidden rounded-2xl bg-[#e9e7e2]" tabIndex={-1} aria-hidden="true">
      <ProductImage p={p} className={view === 'grid' ? 'aspect-[4/3]' : 'aspect-square'} />
    </Link>
  )
  const meta = (
    <p className="flex flex-wrap items-center gap-x-2 text-[12.5px] text-ink/55">
      <span className="font-mono">{p.article || p.code}</span>
    </p>
  )
  const title = (
    <h3 className={`font-semibold leading-snug tracking-[-0.01em] ${view === 'grid' ? 'line-clamp-2 min-h-[2.6em] text-[15.5px]' : 'text-[17px]'}`}>
      <Link to={productPath(p)} className="hover:text-accent">
        {p.name[lang]}
      </Link>
    </h3>
  )

  if (view === 'list')
    return (
      <article data-product data-price={p.price} className="grid animate-[cardIn_.5s_var(--ease-out-expo)_both] grid-cols-[96px_1fr] gap-4 rounded-2xl border border-ink/8 bg-white p-3 sm:grid-cols-[140px_1fr_auto] sm:gap-6 sm:p-4" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
        {image}
        <div className="min-w-0 space-y-1.5">
          {meta}
          {title}
          <p className="text-[13.5px] text-ink/70">{compatLine(p, lang)}</p>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Stock p={p} />
            <FitBadge p={p} />
          </div>
        </div>
        <div className="col-span-2 flex items-center justify-between gap-4 border-t border-ink/8 pt-3 sm:col-span-1 sm:flex-col sm:items-end sm:justify-center sm:border-0 sm:pt-0">
          <Price p={p} />
          <AddToCart p={p} />
        </div>
      </article>
    )

  return (
    <article data-product data-price={p.price} className="flex h-full animate-[cardIn_.5s_var(--ease-out-expo)_both] flex-col rounded-[20px] border border-ink/8 bg-white p-3 transition-shadow duration-300 hover:shadow-[0_18px_40px_-24px_rgba(10,11,13,.35)]" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
      {image}
      <div className="flex flex-1 flex-col gap-1.5 px-1 pb-1 pt-3">
        {meta}
        {title}
        <p className="line-clamp-1 text-[13px] text-ink/65">{compatLine(p, lang)}</p>
        <div className="flex min-h-[26px] flex-wrap items-center gap-2">
          <FitBadge p={p} />
        </div>
        <div className="mt-auto space-y-3 pt-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-2">
            <Price p={p} />
            <Stock p={p} />
          </div>
          <AddToCart p={p} full />
        </div>
      </div>
    </article>
  )
}
