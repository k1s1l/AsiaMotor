import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Car as CarIcon, ChevronDown, LayoutGrid, Menu, Phone, Search, ShoppingBag, X } from 'lucide-react'
import { Logo } from './Logo'
import { useI18n } from '../i18n'
import { useStore } from '../store'
import { company } from '../data/company'
import { query, formatPrice } from '../data/catalog'
import { carLabel } from '../data/vehicles'
import { productPath } from './shop/ProductCard'

/** Header search with instant suggestions; Enter opens the catalogue with the query. */
export function SearchBox({ dark, autoFocus, onDone }: { dark?: boolean; autoFocus?: boolean; onDone?: () => void }) {
  const { t, lang } = useI18n()
  const { car } = useStore()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLFormElement>(null)
  const results = useMemo(() => (q.trim().length > 1 ? query({ q, car }) : []), [q, car])
  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  const go = (to: string) => {
    setOpen(false)
    setQ('')
    onDone?.()
    nav(to)
  }
  return (
    <form
      ref={box}
      role="search"
      className="relative w-full"
      onSubmit={(e) => {
        e.preventDefault()
        go(`/catalog${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
      }}
    >
      <label className={`flex h-12 items-center gap-2.5 rounded-xl px-4 transition-colors ${dark ? 'bg-white/10 text-white focus-within:bg-white focus-within:text-ink' : 'border border-ink/15 bg-white text-ink focus-within:border-ink/50'}`}>
        <Search size={18} className="shrink-0 opacity-55" />
        <input
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={t.nav.searchPh}
          aria-label={t.nav.search}
          className="field text-[15px] placeholder:text-current placeholder:opacity-50"
        />
        {q && (
          <button type="button" onClick={() => setQ('')} aria-label={t.common.reset} className="opacity-50 hover:opacity-100">
            <X size={16} />
          </button>
        )}
      </label>
      {open && q.trim().length > 1 && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-50 animate-[cardIn_.25s_var(--ease-out-expo)_both] overflow-hidden rounded-2xl border border-ink/10 bg-white text-ink shadow-2xl" data-lenis-prevent>
          {results.length ? (
            <ul className="max-h-[60vh] overflow-y-auto py-1.5">
              {results.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => go(productPath(p))} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-ink/[0.04]">
                    <img src={p.images[0]} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-[#e9e7e2] object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-[14px] font-semibold">{p.name[lang]}</span>
                      <span className="font-mono text-[12px] text-ink/50">{p.article}</span>
                    </span>
                    <span className="shrink-0 text-[14px] font-semibold tabular-nums">{formatPrice(p.price, p.currency)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-4 text-[14px] text-ink/60">{t.catalog.empty}</p>
          )}
          <button type="submit" className="flex w-full items-center justify-between border-t border-ink/8 bg-ink/[0.03] px-4 py-3 text-[14px] font-semibold">
            {t.catalog.found(results.length)}
            {car && <span className="text-[12.5px] font-normal text-ink/55">{t.catalog.forCar(carLabel(car))}</span>}
          </button>
        </div>
      )}
    </form>
  )
}

export function Header() {
  const { t, lang, setLang } = useI18n()
  const { cartCount, open, overlay, car, setCar } = useStore()
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [bump, setBump] = useState(false)
  const home = pathname === '/'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!cartCount) return
    setBump(true)
    const id = setTimeout(() => setBump(false), 450)
    return () => clearTimeout(id)
  }, [cartCount])

  const solid = !home || scrolled || overlay === 'catalog'
  const catalogOpen = overlay === 'catalog'

  return (
    <header className={`fixed inset-x-0 top-0 z-50 text-white transition-[background-color,border-color] duration-500 ${solid ? 'border-b border-white/8 bg-ink/92 backdrop-blur-xl' : 'border-b border-transparent bg-gradient-to-b from-ink/70 to-transparent'}`}>
      {/* utility row */}
      <div className="hidden border-b border-white/8 lg:block">
        <div className="container-x flex h-9 items-center justify-between text-[13px] text-white/60">
          <span>
            {t.footer.tagline} <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/70">{t.common.demo}</span>
          </span>
          <nav className="flex items-center gap-5" aria-label="Info">
            <Link to="/delivery" className="hover:text-white">
              {t.nav.delivery}
            </Link>
            <Link to="/contacts" className="hover:text-white">
              {t.nav.contacts}
            </Link>
            <span className="flex rounded-full border border-white/15 p-0.5 font-mono text-[11px]" role="group" aria-label="Мова / Язык">
              {(['ua', 'ru'] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} className={`rounded-full px-2 py-0.5 uppercase ${lang === l ? 'bg-white text-ink' : 'hover:text-white'}`}>
                  {l}
                </button>
              ))}
            </span>
          </nav>
        </div>
      </div>

      <div className="container-x flex h-[72px] items-center gap-3 lg:h-[76px] lg:gap-4">
        <Link to="/" className="shrink-0" aria-label="Asia Motor">
          <Logo />
        </Link>
        <button
          onClick={() => open(catalogOpen ? null : 'catalog')}
          aria-expanded={catalogOpen}
          className={`ml-2 hidden h-12 shrink-0 items-center gap-2 rounded-xl px-4 text-[15px] font-semibold transition-colors lg:flex ${catalogOpen ? 'bg-white text-ink' : 'bg-accent hover:bg-accent-2'}`}
        >
          <LayoutGrid size={17} /> {t.nav.catalog}
          <ChevronDown size={15} className={`transition-transform duration-300 ${catalogOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className="hidden min-w-0 flex-1 md:block">
          <SearchBox dark />
        </div>
        <button
          onClick={() => open('car')}
          className={`hidden h-12 max-w-[230px] shrink-0 items-center gap-2 rounded-xl px-3.5 text-[14px] font-semibold transition-colors xl:flex ${car ? 'bg-white/10 hover:bg-white/15' : 'border border-white/20 hover:border-white/50'}`}
          title={t.nav.myCar}
        >
          <CarIcon size={17} className={car ? 'text-accent' : ''} />
          <span className="truncate">{car ? carLabel(car) : t.nav.chooseCar}</span>
        </button>
        {car && (
          <button onClick={() => setCar(null)} className="-ml-2 hidden text-white/40 hover:text-white xl:block" aria-label={t.nav.removeCar}>
            <X size={15} />
          </button>
        )}
        <a href={company.phones[0].href} className="hidden shrink-0 items-center gap-2 text-[14px] font-semibold tabular-nums 2xl:flex">
          <Phone size={15} className="text-accent" /> {company.phones[0].display}
        </a>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <button className="icon-btn hover:bg-white/10 md:hidden" onClick={() => open('search')} aria-label={t.nav.search}>
            <Search size={20} />
          </button>
          <button className="icon-btn hover:bg-white/10 xl:hidden" onClick={() => open('car')} aria-label={t.nav.myCar}>
            <CarIcon size={20} className={car ? 'text-accent' : ''} />
          </button>
          <button data-cart-target className="icon-btn relative hover:bg-white/10" onClick={() => open('cart')} aria-label={`${t.nav.cart}: ${cartCount}`}>
            <ShoppingBag size={20} />
            <span className={`absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white transition-transform duration-300 ${cartCount ? 'scale-100' : 'scale-0'} ${bump ? 'scale-125' : ''}`}>{cartCount}</span>
          </button>
          <button className="icon-btn hover:bg-white/10 lg:hidden" onClick={() => open('menu')} aria-label={t.nav.menu}>
            <Menu size={21} />
          </button>
        </div>
      </div>
    </header>
  )
}
