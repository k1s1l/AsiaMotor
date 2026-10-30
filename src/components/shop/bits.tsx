// Small building blocks shared by the catalogue, product page, rails and cart.
import { useState } from 'react'
import { Link } from 'react-router'
import { Check, ChevronRight, CircleAlert, CircleCheck, CircleX, Plus, ShoppingBag } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import { fit, formatPrice, type Product } from '../../data/catalog'
import { carLabel } from '../../data/vehicles'

export function Price({ p, size = 'md' }: { p: Product; size?: 'sm' | 'md' | 'lg' }) {
  const { t } = useI18n()
  const big = size === 'lg' ? 'text-[34px]' : size === 'md' ? 'text-[18px] sm:text-[21px]' : 'text-[17px]'
  const off = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className={`font-display font-semibold tracking-tight tabular-nums ${big} ${p.oldPrice ? 'text-accent' : ''}`}>{formatPrice(p.price, p.currency)}</span>
        {p.oldPrice && (
          <>
            <s className="text-[14px] text-ink/45 tabular-nums">{formatPrice(p.oldPrice, p.currency)}</s>
            <span className="rounded-md bg-accent px-1.5 py-0.5 text-[12px] font-bold text-white">−{off}%</span>
          </>
        )}
      </div>
      {p.oldPrice && size === 'lg' && <p className="mt-1 text-[14px] text-accent">{t.product.saving(formatPrice(p.oldPrice - p.price, p.currency))}</p>}
    </div>
  )
}

export function Stock({ p, compact }: { p: Product; compact?: boolean }) {
  const { t } = useI18n()
  const tone = { in: 'bg-emerald-500', low: 'bg-amber-500', order: 'bg-sky-500', ask: 'bg-ink/30' }[p.stock]
  const text = { in: 'text-emerald-700', low: 'text-amber-700', order: 'text-sky-700', ask: 'text-ink/55' }[p.stock]
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${text}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${tone}`} aria-hidden="true" />
      {t.product.stock[p.stock]}
      {p.stock === 'order' && p.lead && !compact && <span className="font-normal text-ink/55">· {t.product.lead(p.lead[0], p.lead[1])}</span>}
    </span>
  )
}

export function FitBadge({ p, full }: { p: Product; full?: boolean }) {
  const { t } = useI18n()
  const { car } = useStore()
  if (!car) return null
  const f = fit(p, car)
  const map = {
    yes: { Icon: CircleCheck, cls: 'text-emerald-700 bg-emerald-50 ring-emerald-200', label: t.product.fits.yes },
    maybe: { Icon: CircleAlert, cls: 'text-amber-800 bg-amber-50 ring-amber-200', label: t.product.fits.maybe },
    no: { Icon: CircleX, cls: 'text-red-700 bg-red-50 ring-red-200', label: t.product.fits.no },
  }[f]
  return (
    <span className={`inline-flex items-start gap-1.5 rounded-lg px-2 py-1 text-[12.5px] font-medium ring-1 ${map.cls}`}>
      <map.Icon size={14} className="mt-[1px] shrink-0" />
      <span>
        {full || f !== 'maybe' ? map.label : t.product.compatTable.notSpecified}
        {full && <span className="font-normal opacity-70"> · {carLabel(car)}</span>}
      </span>
    </span>
  )
}

export function AddToCart({ p, qty = 1, size = 'md', full }: { p: Product; qty?: number; size?: 'sm' | 'md' | 'lg'; full?: boolean }) {
  const { t } = useI18n()
  const { add, cart, notify } = useStore()
  const [pulse, setPulse] = useState(false)
  const inCart = !!cart[p.id]
  const h = size === 'lg' ? 'min-h-[56px] px-7 text-[16px]' : size === 'sm' ? 'min-h-[40px] px-4 text-[13px]' : 'min-h-[46px] px-5 text-[14px]'
  return (
    <button
      onClick={(e) => {
        add(p.id, qty, e.currentTarget.closest('[data-product]') as HTMLElement)
        notify(t.toast.added)
        setPulse(true)
        setTimeout(() => setPulse(false), 900)
      }}
      className={`btn ${h} ${full ? 'w-full' : ''} ${inCart ? 'bg-ink text-white before:bg-accent' : 'btn-accent'} ${pulse ? 'scale-[0.96]' : ''}`}
      aria-label={`${t.product.add}: ${p.name.ua}`}
    >
      {pulse ? <Check size={17} /> : inCart ? <ShoppingBag size={17} /> : <Plus size={17} />}
      {inCart && !pulse ? `${t.product.added} · ${cart[p.id]}` : t.product.add}
    </button>
  )
}

export function DemoTag({ p }: { p: Product }) {
  const { t } = useI18n()
  if (p.source !== 'demo') return null
  return (
    <span className="rounded-md bg-ink/80 px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider text-white" title={t.product.demoProduct}>
      {t.common.demo}
    </span>
  )
}

export function Crumbs({ items }: { items: { to?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="no-scrollbar -mx-4 overflow-x-auto px-4">
      <ol className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-ink/55">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={13} className="text-ink/30" />}
            {it.to ? (
              <Link to={it.to} className="hover:text-ink">
                {it.label}
              </Link>
            ) : (
              <span className="text-ink" aria-current="page">
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
