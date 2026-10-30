import { useEffect, useRef, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ArrowRight, ArrowUpRight, Minus, Phone, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { useI18n } from '../i18n'
import { useStore } from '../store'
import { formatPrice, getProductById, type Product } from '../data/catalog'
import { taxonomy } from '../data/taxonomy'
import { company } from '../data/company'
import { lockScroll } from '../lib/motion'
import { Logo } from './Logo'
import { SearchBox } from './Header'
import { CarPicker } from './shop/CarPicker'
import { productPath } from './shop/ProductCard'

/** Stays mounted for CSS transitions, inert while closed, focuses itself on open. */
function Panel({ open, children, className, label }: { open: boolean; children: ReactNode; className: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => (ref.current?.querySelector<HTMLElement>('[data-autofocus]') ?? ref.current?.querySelector<HTMLElement>('button, a, input, select'))?.focus({ preventScroll: true }), 60)
    return () => clearTimeout(id)
  }, [open])
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label={label} aria-hidden={!open} inert={!open} className={className} data-lenis-prevent>
      {children}
    </div>
  )
}

const Backdrop = ({ open, onClick, z = 'z-[60]' }: { open: boolean; onClick: () => void; z?: string }) => (
  <div onClick={onClick} aria-hidden="true" className={`fixed inset-0 ${z} bg-black/55 backdrop-blur-[2px] transition-opacity duration-500 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />
)

const drawer = (open: boolean, side: 'right' | 'left' = 'right') =>
  `fixed top-0 ${side === 'right' ? 'right-0' : 'left-0'} z-[70] flex h-[100dvh] w-full max-w-[460px] flex-col bg-paper text-ink transition-transform duration-600 ease-[var(--ease-out-expo)] ${open ? 'translate-x-0 shadow-2xl' : side === 'right' ? 'translate-x-full' : '-translate-x-full'}`

function Head({ title, onClose }: { title: ReactNode; onClose: () => void }) {
  const { t } = useI18n()
  return (
    <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
      <div className="font-display text-lg font-semibold uppercase tracking-tight">{title}</div>
      <button className="icon-btn border border-ink/15 hover:bg-ink hover:text-white" onClick={onClose} aria-label={t.common.close}>
        <X size={18} />
      </button>
    </div>
  )
}

export function Overlays() {
  const { overlay, close } = useStore()
  const { pathname } = useLocation()
  useEffect(() => close(), [pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    lockScroll(!!overlay && overlay !== 'catalog')
    if (!overlay) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [overlay, close])
  return (
    <>
      <CatalogPanel />
      <MobileMenu />
      <SearchPanel />
      <Backdrop open={overlay === 'cart' || overlay === 'car'} onClick={close} />
      <CartDrawer />
      <CarDialog />
      <Toast />
    </>
  )
}

function CatalogPanel() {
  const { t, lang } = useI18n()
  const { overlay, close } = useStore()
  const open = overlay === 'catalog'
  return (
    <>
      <div onClick={close} aria-hidden="true" className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-500 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />
      <Panel open={open} label={t.nav.catalog} className={`fixed inset-x-0 top-[72px] z-40 max-h-[calc(100dvh-72px)] overflow-y-auto border-b border-white/8 bg-ink text-white transition-[clip-path] duration-600 ease-[var(--ease-out-expo)] lg:top-[112px] lg:max-h-[calc(100dvh-112px)] ${open ? '[clip-path:inset(0_0_0_0)]' : '[clip-path:inset(0_0_100%_0)]'}`}>
        <div className="container-x grid gap-x-8 gap-y-7 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {taxonomy.map((c) => (
            <div key={c.slug}>
              <Link to={`/catalog/${c.slug}`} className="group flex items-center gap-3">
                <img src={c.image} alt="" className="h-11 w-14 rounded-lg object-cover" loading="lazy" />
                <span className="text-[15px] font-bold group-hover:text-accent">{c[lang]}</span>
              </Link>
              <ul className="mt-2.5 space-y-1 pl-[68px] text-[14px] text-white/60">
                {c.subs.map((s) => (
                  <li key={s.slug}>
                    <Link to={`/catalog/${c.slug}/${s.slug}`} className="hover:text-white">
                      {s[lang]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Link to="/catalog" className="btn btn-accent self-start">
            {t.nav.allCats} <ArrowRight size={16} className="btn-ico" />
          </Link>
        </div>
      </Panel>
    </>
  )
}

function MobileMenu() {
  const { t, lang, setLang } = useI18n()
  const { overlay, close } = useStore()
  const open = overlay === 'menu'
  return (
    <Panel open={open} label={t.nav.menu} className={`fixed inset-0 z-[80] flex flex-col bg-ink text-white transition-[clip-path] duration-700 ease-[var(--ease-in-out-quart)] ${open ? '[clip-path:circle(150%_at_100%_0)]' : '[clip-path:circle(0%_at_100%_0)]'}`}>
      <div className="container-x flex h-[72px] shrink-0 items-center justify-between">
        <Logo />
        <button className="icon-btn border border-white/20" onClick={close} aria-label={t.common.close}>
          <X size={20} />
        </button>
      </div>
      <nav className="container-x flex-1 overflow-y-auto pb-6">
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {taxonomy.map((c) => (
            <li key={c.slug}>
              <Link to={`/catalog/${c.slug}`} className="flex items-center justify-between py-3.5 text-[17px] font-semibold">
                {c[lang]} <ArrowUpRight size={18} className="text-white/35" />
              </Link>
            </li>
          ))}
        </ul>
        <ul className="mt-6 space-y-3 text-[16px] text-white/75">
          <li>
            <Link to="/catalog">{t.nav.allCats}</Link>
          </li>
          <li>
            <Link to="/delivery">{t.nav.delivery}</Link>
          </li>
          <li>
            <Link to="/contacts">{t.nav.contacts}</Link>
          </li>
        </ul>
        <div className="mt-6 flex gap-2">
          {(['ua', 'ru'] as const).map((l) => (
            <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} className={`rounded-full border px-4 py-2 font-mono text-xs uppercase ${lang === l ? 'border-white bg-white text-ink' : 'border-white/20 text-white/70'}`}>
              {l}
            </button>
          ))}
        </div>
      </nav>
      <div className="container-x space-y-2 pb-[max(20px,env(safe-area-inset-bottom))] pt-3">
        {company.phones.map((p) => (
          <a key={p.href} href={p.href} className="btn btn-ghost w-full justify-between">
            {p.display} <Phone size={16} />
          </a>
        ))}
      </div>
    </Panel>
  )
}

function SearchPanel() {
  const { t } = useI18n()
  const { overlay, close } = useStore()
  const open = overlay === 'search'
  return (
    <>
      <div onClick={close} aria-hidden="true" className={`fixed inset-0 z-[75] bg-black/60 transition-opacity duration-500 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />
      <Panel open={open} label={t.nav.search} className={`fixed inset-x-0 top-0 z-[76] bg-paper p-4 text-ink transition-transform duration-500 ease-[var(--ease-out-expo)] ${open ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-start gap-2">
          <div className="flex-1">{open && <SearchBox autoFocus onDone={close} />}</div>
          <button className="icon-btn h-12 w-12 border border-ink/15" onClick={close} aria-label={t.common.close}>
            <X size={18} />
          </button>
        </div>
      </Panel>
    </>
  )
}

function CarDialog() {
  const { t } = useI18n()
  const { overlay, close } = useStore()
  const nav = useNavigate()
  const open = overlay === 'car'
  return (
    <Panel open={open} label={t.nav.myCar} className={`fixed left-1/2 top-1/2 z-[70] w-[min(560px,calc(100vw-24px))] -translate-x-1/2 rounded-[24px] bg-paper text-ink shadow-2xl transition-all duration-500 ease-[var(--ease-out-expo)] ${open ? '-translate-y-1/2 opacity-100' : 'pointer-events-none -translate-y-[45%] opacity-0'}`}>
      <Head title={t.nav.myCar} onClose={close} />
      <div className="p-5">
        <p className="mb-4 text-[14px] text-ink/60">{t.home.pickLead}</p>
        <div className="[&_form]:grid-cols-1 sm:[&_form]:grid-cols-2 lg:[&_form]:grid-cols-2">
          {open && (
            <CarPicker
              idPrefix="dlg-car"
              onSubmit={() => {
                close()
                nav('/catalog')
              }}
            />
          )}
        </div>
        <p className="mt-4 text-[12.5px] text-ink/45">{t.car.demoNote}</p>
      </div>
    </Panel>
  )
}

function CartDrawer() {
  const { t, lang } = useI18n()
  const { overlay, close, cart, setQty } = useStore()
  const nav = useNavigate()
  const open = overlay === 'cart'
  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ p: getProductById(id), qty }))
    .filter((l): l is { p: Product; qty: number } => !!l.p)
  const uah = lines.filter((l) => l.p.currency === 'UAH').reduce((s, l) => s + l.p.price * l.qty, 0)
  return (
    <Panel open={open} label={t.cart.title} className={drawer(open)}>
      <Head title={<>{t.cart.title} <span className="text-ink/40">({lines.length})</span></>} onClose={close} />
      <div className="flex-1 overflow-y-auto px-5">
        {lines.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <ShoppingBag size={40} className="mx-auto text-ink/20" />
              <p className="mt-4 font-display text-xl font-semibold uppercase">{t.cart.empty}</p>
              <p className="mx-auto mt-2 max-w-xs text-sm text-ink/55">{t.cart.emptyHint}</p>
              <Link to="/catalog" className="btn btn-dark mt-6">
                {t.cart.toCatalog}
              </Link>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-ink/10">
            {lines.map(({ p, qty }) => (
              <li key={p.id} className="flex gap-3 py-4">
                <Link to={productPath(p)} className="shrink-0">
                  <img src={p.images[0]} alt="" className="h-20 w-20 rounded-xl bg-[#e9e7e2] object-cover" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={productPath(p)} className="line-clamp-2 text-[14px] font-semibold leading-snug hover:text-accent">
                    {p.name[lang]}
                  </Link>
                  <p className="mt-0.5 font-mono text-[11.5px] text-ink/50">{p.article}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center rounded-lg border border-ink/15">
                      <button className="grid h-8 w-8 place-items-center" onClick={() => setQty(p.id, qty - 1)} aria-label="−1">
                        <Minus size={13} />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">{qty}</span>
                      <button className="grid h-8 w-8 place-items-center" onClick={() => setQty(p.id, qty + 1)} aria-label="+1">
                        <Plus size={13} />
                      </button>
                    </div>
                    <span className="font-semibold tabular-nums">{formatPrice(p.price * qty, p.currency)}</span>
                  </div>
                </div>
                <button className="self-start text-ink/35 hover:text-accent" onClick={() => setQty(p.id, 0)} aria-label={t.cart.remove}>
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {lines.length > 0 && (
        <div className="space-y-2 border-t border-ink/10 bg-white/60 px-5 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-ink/60">{t.cart.total}</span>
            <span className="font-display text-2xl font-semibold tabular-nums">{formatPrice(uah)}</span>
          </div>
          <button onClick={() => nav('/checkout')} className="btn btn-accent w-full min-h-[52px]">
            {t.cart.checkout} <ArrowRight size={17} className="btn-ico" />
          </button>
          <Link to="/cart" className="btn btn-line w-full min-h-[46px] text-[14px]">
            {t.cart.open}
          </Link>
        </div>
      )}
    </Panel>
  )
}

function Toast() {
  const { toast, open } = useStore()
  const { t } = useI18n()
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-[90] flex justify-center px-4">
      <div className={`flex items-center gap-4 rounded-full bg-ink py-2 pl-5 pr-2 text-sm font-semibold text-white shadow-2xl transition-all duration-500 ease-[var(--ease-out-expo)] ${toast ? 'pointer-events-auto translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
        <span className="h-2 w-2 rounded-full bg-accent" />
        {toast}
        <button className="rounded-full bg-white px-4 py-2 text-ink" onClick={() => open('cart')} tabIndex={toast ? 0 : -1}>
          {t.nav.cart}
        </button>
      </div>
    </div>
  )
}
