// Small building blocks shared by the catalogue, product page, rails and cart.
import { useState } from 'react'
import { Link } from 'react-router'
import { Camera, Check, ChevronRight, CircleCheck, CircleX, Plus, ShoppingBag } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import { fit, formatPrice, type Product } from '../../data/catalog'
import { carLabel } from '../../data/vehicles'

export function Price({ p, size = 'md' }: { p: Product; size?: 'sm' | 'md' | 'lg' }) {
  const big = size === 'lg' ? 'text-[34px]' : size === 'md' ? 'text-[18px] sm:text-[21px]' : 'text-[17px]'
  return <span className={`font-display font-semibold tracking-tight tabular-nums ${big}`}>{formatPrice(p.price)}</span>
}

export function Stock({ p }: { p: Product }) {
  const { t } = useI18n()
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${p.stock === 'low' ? 'text-amber-700' : 'text-emerald-700'}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${p.stock === 'low' ? 'bg-amber-500' : 'bg-emerald-500'}`} aria-hidden="true" />
      {p.stock === 'low' ? t.product.stockLeft(p.qty) : t.product.inStock}
    </span>
  )
}

/** Only an explicit listing in the price list counts as "fits"; nothing is guessed. */
export function FitBadge({ p, full }: { p: Product; full?: boolean }) {
  const { t } = useI18n()
  const { car } = useStore()
  if (!car) return null
  const yes = fit(p, car) === 'yes'
  const Icon = yes ? CircleCheck : CircleX
  return (
    <span className={`inline-flex items-start gap-1.5 rounded-lg px-2 py-1 text-[12.5px] font-medium ring-1 ${yes ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-ink/[0.04] text-ink/60 ring-ink/10'}`}>
      <Icon size={14} className="mt-[1px] shrink-0" />
      <span>
        {yes ? t.product.fits.yes : t.product.fits.notListed}
        {full && <span className="font-normal opacity-70"> · {carLabel(car)}</span>}
      </span>
    </span>
  )
}

/** The product photo, or an honest placeholder when the store has not provided one. */
export function ProductImage({ p, className = '', eager, compact }: { p: Product; className?: string; eager?: boolean; compact?: boolean }) {
  const { t } = useI18n()
  if (p.images[0])
    return <img src={p.images[0]} alt={p.name.ua} loading={eager ? 'eager' : 'lazy'} decoding="async" className={`w-full bg-white object-contain ${className}`} />
  return (
    <span className={`flex w-full flex-col items-center justify-center gap-2 bg-[linear-gradient(145deg,#efede8,#e3e0d9)] p-3 text-center ${className}`}>
      <Camera size={compact ? 18 : 22} className="text-ink/30" aria-hidden="true" />
      {!compact && (
        <>
          <span className="max-w-full truncate font-mono text-[12px] font-semibold tracking-wide text-ink/55">{p.article || p.code}</span>
          <span className="text-[11.5px] text-ink/45">{t.product.photoOnRequest}</span>
        </>
      )}
    </span>
  )
}

export function AddToCart({ p, qty = 1, size = 'md', full }: { p: Product; qty?: number; size?: 'sm' | 'md' | 'lg'; full?: boolean }) {
  const { t } = useI18n()
  const { add, cart, notify } = useStore()
  const [pulse, setPulse] = useState(false)
  const inCart = !!cart[p.id]
  const full_ = (cart[p.id] ?? 0) >= p.qty
  const h = size === 'lg' ? 'min-h-[56px] px-7 text-[16px]' : size === 'sm' ? 'min-h-[40px] px-4 text-[13px]' : 'min-h-[46px] px-5 text-[14px]'
  return (
    <button
      disabled={full_}
      title={full_ ? t.product.allInCart : undefined}
      onClick={(e) => {
        add(p.id, qty, e.currentTarget.closest('[data-product]') as HTMLElement)
        notify(t.toast.added)
        setPulse(true)
        setTimeout(() => setPulse(false), 900)
      }}
      className={`btn ${h} ${full ? 'w-full' : ''} disabled:cursor-not-allowed disabled:opacity-60 ${inCart ? 'bg-ink text-white before:bg-accent' : 'btn-accent'} ${pulse ? 'scale-[0.96]' : ''}`}
      aria-label={`${t.product.add}: ${p.name.ua}`}
    >
      {pulse ? <Check size={17} /> : inCart ? <ShoppingBag size={17} /> : <Plus size={17} />}
      {inCart && !pulse ? `${t.product.added} · ${cart[p.id]}` : t.product.add}
    </button>
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
