import { useRef } from 'react'
import { Link } from 'react-router'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '../../i18n'
import type { Product } from '../../data/catalog'
import { ProductCard } from './ProductCard'

/** Horizontal, swipeable row of product cards with an optional "view all" link. */
export function ProductRail({ title, lead, items, to, dark, onOpen }: { title: string; lead?: string; items: Product[]; to?: string; dark?: boolean; onOpen?: () => void }) {
  const { t } = useI18n()
  const row = useRef<HTMLUListElement>(null)
  if (!items.length) return null
  const scroll = (d: number) => row.current?.scrollBy({ left: d * row.current.clientWidth * 0.8, behavior: 'smooth' })
  return (
    <section className={dark ? 'text-white' : ''}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-[clamp(22px,2.6vw,34px)] font-semibold uppercase leading-none tracking-[-0.02em]">{title}</h2>
          {lead && <p className={`mt-2 text-[15px] ${dark ? 'text-white/60' : 'text-ink/60'}`}>{lead}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {to && (
            <Link to={to} onClick={onOpen} className="link-u mr-2 hidden items-center gap-1.5 text-[14px] font-semibold sm:flex">
              {t.common.viewAll} <ArrowRight size={15} />
            </Link>
          )}
          {(['l', 'r'] as const).map((d) => (
            <button key={d} onClick={() => scroll(d === 'l' ? -1 : 1)} className={`icon-btn hidden border sm:inline-grid ${dark ? 'border-white/20 hover:bg-white hover:text-ink' : 'border-ink/15 hover:bg-ink hover:text-white'}`} aria-label={d === 'l' ? '←' : '→'}>
              {d === 'l' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
          ))}
        </div>
      </div>
      <ul ref={row} className="no-scrollbar -mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 text-ink sm:gap-4" data-lenis-prevent-horizontal>
        {items.map((p, i) => (
          <li key={p.id} className="w-[72%] shrink-0 snap-start sm:w-[44%] lg:w-[31%] xl:w-[23.5%]">
            <ProductCard p={p} i={i} />
          </li>
        ))}
      </ul>
      {to && (
        <Link to={to} className="mt-4 flex items-center gap-1.5 text-[14px] font-semibold sm:hidden">
          {t.common.viewAll} <ArrowRight size={15} />
        </Link>
      )}
    </section>
  )
}
