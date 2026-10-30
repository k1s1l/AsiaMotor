import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, CircleCheck, Info, Mail, Minus, Phone, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useI18n } from '../i18n'
import { useStore } from '../store'
import { formatPrice, getProductById, type Product } from '../data/catalog'
import { company } from '../data/company'
import { Crumbs, DemoTag, FitBadge, Stock } from '../components/shop/bits'
import { productPath } from '../components/shop/ProductCard'
import { useSeo } from '../lib/seo'

function useLines() {
  const { cart } = useStore()
  return useMemo(() => {
    const lines = Object.entries(cart)
      .map(([id, qty]) => ({ p: getProductById(id), qty }))
      .filter((l): l is { p: Product; qty: number } => !!l.p)
    const uah = lines.filter((l) => l.p.currency === 'UAH').reduce((s, l) => s + l.p.price * l.qty, 0)
    return { lines, uah, mixed: lines.some((l) => l.p.currency !== 'UAH') }
  }, [cart])
}

function Summary({ cta }: { cta?: React.ReactNode }) {
  const { t, lang } = useI18n()
  const { lines, uah, mixed } = useLines()
  return (
    <aside className="rounded-[22px] border border-ink/10 bg-white p-5 sm:p-6 lg:sticky lg:top-24">
      <p className="font-display text-lg font-semibold uppercase tracking-tight">{t.checkout.summary}</p>
      <ul className="mt-4 space-y-2 text-[14px]">
        {lines.map(({ p, qty }) => (
          <li key={p.id} className="flex justify-between gap-4">
            <span className="line-clamp-2 text-ink/70">
              {p.name[lang]} × {qty}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{formatPrice(p.price * qty, p.currency)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-baseline justify-between border-t border-ink/10 pt-4">
        <span className="text-ink/60">{t.cart.total}</span>
        <span className="font-display text-[28px] font-semibold tabular-nums">{formatPrice(uah)}</span>
      </div>
      {mixed && <p className="mt-2 text-[12.5px] text-ink/55">{t.cart.mixed}</p>}
      {cta}
    </aside>
  )
}

export function CartPage() {
  const { t, lang } = useI18n()
  const { setQty } = useStore()
  const { lines } = useLines()
  const nav = useNavigate()
  useSeo({ title: `${t.cart.title} | Asia Motor`, description: t.cart.title, path: '/cart', noindex: true })

  return (
    <div className="min-h-[80vh] bg-paper pb-24 pt-[96px] text-ink lg:pt-[136px]">
      <div className="container-x">
        <Crumbs items={[{ to: '/', label: t.common.home }, { label: t.cart.title }]} />
        <h1 className="mt-5 font-display text-[clamp(28px,4vw,48px)] font-semibold uppercase tracking-[-0.03em]">
          {t.cart.title} {lines.length > 0 && <span className="text-ink/35">{t.cart.items(lines.length)}</span>}
        </h1>
        {lines.length === 0 ? (
          <div className="mt-10 rounded-[24px] border border-dashed border-ink/20 bg-white p-10 text-center">
            <ShoppingBag size={40} className="mx-auto text-ink/25" />
            <p className="mt-4 font-display text-xl font-semibold uppercase">{t.cart.empty}</p>
            <p className="mx-auto mt-2 max-w-sm text-ink/60">{t.cart.emptyHint}</p>
            <Link to="/catalog" className="btn btn-dark mt-6">
              {t.cart.toCatalog}
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
            <ul className="space-y-3">
              {lines.map(({ p, qty }) => (
                <li key={p.id} className="grid animate-[cardIn_.4s_var(--ease-out-expo)_both] grid-cols-[88px_1fr] gap-4 rounded-2xl border border-ink/8 bg-white p-3 sm:grid-cols-[120px_1fr_auto] sm:p-4">
                  <Link to={productPath(p)} className="overflow-hidden rounded-xl bg-[#e9e7e2]">
                    <img src={p.images[0]} alt="" className="aspect-square w-full object-cover" />
                  </Link>
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex gap-2">
                      <DemoTag p={p} />
                      <span className="font-mono text-[12px] text-ink/50">{p.article}</span>
                    </div>
                    <Link to={productPath(p)} className="block font-semibold leading-snug hover:text-accent">
                      {p.name[lang]}
                    </Link>
                    <div className="flex flex-wrap gap-2">
                      <Stock p={p} />
                      <FitBadge p={p} />
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center justify-between gap-4 border-t border-ink/8 pt-3 sm:col-span-1 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                    <div className="flex items-center rounded-xl border border-ink/15">
                      <button className="grid h-10 w-10 place-items-center" onClick={() => setQty(p.id, qty - 1)} aria-label="−1">
                        <Minus size={14} />
                      </button>
                      <span className="w-7 text-center font-semibold tabular-nums">{qty}</span>
                      <button className="grid h-10 w-10 place-items-center" onClick={() => setQty(p.id, qty + 1)} aria-label="+1">
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="font-display text-[19px] font-semibold tabular-nums">{formatPrice(p.price * qty, p.currency)}</span>
                    <button onClick={() => setQty(p.id, 0)} className="flex items-center gap-1 text-[13px] text-ink/45 hover:text-accent">
                      <Trash2 size={14} /> {t.cart.remove}
                    </button>
                  </div>
                </li>
              ))}
              <li>
                <Link to="/catalog" className="link-u text-[14px] font-semibold">
                  ← {t.cart.continue}
                </Link>
              </li>
            </ul>
            <Summary
              cta={
                <button onClick={() => nav('/checkout')} className="btn btn-accent mt-5 w-full min-h-[56px]">
                  {t.cart.checkout} <ArrowRight size={18} className="btn-ico" />
                </button>
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}

const phoneOk = (v: string) => /^(\+?38)?0\d{9}$/.test(v.replace(/[\s()-]/g, ''))

export function CheckoutPage() {
  const { t, lang } = useI18n()
  const { clearCart } = useStore()
  const { lines } = useLines()
  const [form, setForm] = useState({ name: '', phone: '', email: '', method: 'np', city: '', branch: '', address: '', payment: 'cod', comment: '' })
  const [touched, setTouched] = useState(false)
  const [done, setDone] = useState<null | { lines: typeof lines; no: string }>(null)
  useSeo({ title: `${t.checkout.title} | Asia Motor`, description: t.checkout.title, path: '/checkout', noindex: true })

  const errors: Record<string, string> = {}
  if (!form.name.trim()) errors.name = t.checkout.required
  if (!phoneOk(form.phone)) errors.phone = form.phone ? t.checkout.badPhone : t.checkout.required
  if (form.method !== 'pickup' && !form.city.trim()) errors.city = t.checkout.required
  if (form.method === 'np' && !form.branch.trim()) errors.branch = t.checkout.required
  if (form.method === 'npCourier' && !form.address.trim()) errors.address = t.checkout.required
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value })

  const mailBody = (ls: typeof lines) => encodeURIComponent([...ls.map(({ p, qty }) => `${p.name[lang]} — ${p.article} × ${qty}`), '', `${form.name}, ${form.phone}`, form.comment].join('\n'))

  if (done)
    return (
      <div className="min-h-[80vh] bg-paper pb-24 pt-[120px] text-ink">
        <div className="container-x max-w-2xl text-center">
          <CircleCheck size={52} className="mx-auto text-accent" />
          <h1 className="mt-5 font-display text-[clamp(24px,3vw,36px)] font-semibold uppercase tracking-tight">{t.checkout.successTitle}</h1>
          <p className="mx-auto mt-4 max-w-lg leading-relaxed text-ink/65">{t.checkout.successText}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <a href={company.phones[0].href} className="btn btn-accent">
              <Phone size={16} /> {company.phones[0].display}
            </a>
            <a href={`mailto:${company.email}?subject=${encodeURIComponent('Замовлення з сайту')}&body=${mailBody(done.lines)}`} className="btn btn-line">
              <Mail size={16} /> {t.checkout.mail}
            </a>
          </div>
        </div>
      </div>
    )

  if (!lines.length)
    return (
      <div className="min-h-[70vh] bg-paper pt-[140px] text-center text-ink">
        <p className="font-display text-xl font-semibold uppercase">{t.cart.empty}</p>
        <Link to="/catalog" className="btn btn-dark mt-6">
          {t.cart.toCatalog}
        </Link>
      </div>
    )

  const input = (k: keyof typeof form, label: string, type = 'text', auto?: string) => (
    <label className="block">
      <span className="text-[13px] font-medium text-ink/65">{label}</span>
      <input
        type={type}
        value={form[k]}
        onChange={set(k)}
        autoComplete={auto}
        aria-invalid={touched && !!errors[k]}
        className={`field mt-1.5 min-h-[50px] rounded-xl border bg-white px-4 text-[15px] ${touched && errors[k] ? 'border-red-400' : 'border-ink/15 focus:border-ink/50'}`}
      />
      {touched && errors[k] && <span className="mt-1 block text-[12.5px] text-red-600">{errors[k]}</span>}
    </label>
  )
  const radio = (k: 'method' | 'payment', v: string, label: string) => (
    <label key={v} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 text-[15px] transition-colors ${form[k] === v ? 'border-ink bg-white' : 'border-ink/12 bg-white/60 hover:border-ink/40'}`}>
      <input type="radio" name={k} value={v} checked={form[k] === v} onChange={() => setForm({ ...form, [k]: v })} className="h-[18px] w-[18px] accent-[#ff4b1f]" />
      {label}
    </label>
  )

  return (
    <div className="bg-paper pb-24 pt-[96px] text-ink lg:pt-[136px]">
      <div className="container-x">
        <Crumbs items={[{ to: '/', label: t.common.home }, { to: '/cart', label: t.cart.title }, { label: t.checkout.title }]} />
        <h1 className="mt-5 font-display text-[clamp(26px,3.6vw,44px)] font-semibold uppercase tracking-[-0.03em]">{t.checkout.title}</h1>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            setTouched(true)
            if (Object.keys(errors).length) return
            setDone({ lines, no: `DEMO-${Date.now().toString().slice(-6)}` })
            clearCart()
            window.scrollTo(0, 0)
          }}
          className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]"
        >
          <div className="space-y-6">
            {[
              {
                n: 1,
                title: t.checkout.contacts,
                body: (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {input('name', t.checkout.name, 'text', 'name')}
                    {input('phone', t.checkout.phone, 'tel', 'tel')}
                    <div className="sm:col-span-2">{input('email', t.checkout.email, 'email', 'email')}</div>
                  </div>
                ),
              },
              {
                n: 2,
                title: t.checkout.deliveryStep,
                body: (
                  <div className="space-y-3">
                    <div className="grid gap-2">{(['np', 'npCourier', 'pickup'] as const).map((m) => radio('method', m, t.checkout.methods[m]))}</div>
                    {form.method !== 'pickup' && (
                      <div className="grid animate-[cardIn_.35s_var(--ease-out-expo)_both] gap-3 sm:grid-cols-2">
                        {input('city', t.checkout.city, 'text', 'address-level2')}
                        {form.method === 'np' ? input('branch', t.checkout.branch) : input('address', t.checkout.address, 'text', 'street-address')}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                n: 3,
                title: t.checkout.paymentStep,
                body: (
                  <div className="space-y-3">
                    <div className="grid gap-2">{(['cod', 'card', 'invoice'] as const).map((m) => radio('payment', m, t.checkout.payments[m]))}</div>
                    <p className="flex gap-2 text-[13px] text-ink/55">
                      <Info size={15} className="mt-0.5 shrink-0" /> {t.checkout.paymentNote}
                    </p>
                    <label className="block">
                      <span className="text-[13px] font-medium text-ink/65">{t.checkout.comment}</span>
                      <textarea value={form.comment} onChange={set('comment')} rows={3} className="field mt-1.5 rounded-xl border border-ink/15 bg-white px-4 py-3 text-[15px] focus:border-ink/50" />
                    </label>
                  </div>
                ),
              },
            ].map((s) => (
              <section key={s.n} className="rounded-[22px] border border-ink/10 bg-white/50 p-5 sm:p-6">
                <h2 className="mb-4 flex items-center gap-3 text-[17px] font-bold">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-[14px] text-white">{s.n}</span>
                  {s.title}
                </h2>
                {s.body}
              </section>
            ))}
          </div>
          <Summary
            cta={
              <>
                <button type="submit" className="btn btn-accent mt-5 w-full min-h-[56px]">
                  {t.checkout.submit}
                </button>
                <p className="mt-3 text-[12.5px] leading-relaxed text-ink/50">{t.common.demoSite}: {t.checkout.paymentNote}</p>
              </>
            }
          />
        </form>
      </div>
    </div>
  )
}
