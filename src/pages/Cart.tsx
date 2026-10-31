import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, CircleCheck, Info, Loader2, Minus, Phone, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useI18n } from '../i18n'
import { useStore } from '../store'
import { formatPrice, getProductById, type Product } from '../data/catalog'
import { company } from '../data/company'
import { Crumbs, FitBadge, ProductImage, Stock } from '../components/shop/bits'
import { Field, Honeypot, SendError } from '../components/forms/RequestForm'
import { ApiError, send, validEmail, validPhone } from '../lib/api'
import { productPath } from '../components/shop/ProductCard'
import { useSeo } from '../lib/seo'

function useLines() {
  const { cart } = useStore()
  return useMemo(() => {
    const lines = Object.entries(cart)
      .map(([id, qty]) => ({ p: getProductById(id), qty }))
      .filter((l): l is { p: Product; qty: number } => !!l.p)
    const uah = lines.reduce((s, l) => s + l.p.price * l.qty, 0)
    // body parts and optics ship only after full prepayment (store rule)
    return { lines, uah, prepaid: lines.some((l) => l.p.cat === 'kuzov' || l.p.cat === 'optyka') }
  }, [cart])
}

function Summary({ cta }: { cta?: React.ReactNode }) {
  const { t, lang } = useI18n()
  const { lines, uah } = useLines()
  return (
    <aside className="rounded-[22px] border border-ink/10 bg-white p-5 sm:p-6 lg:sticky lg:top-24">
      <p className="font-display text-lg font-semibold uppercase tracking-tight">{t.checkout.summary}</p>
      <ul className="mt-4 space-y-2 text-[14px]">
        {lines.map(({ p, qty }) => (
          <li key={p.id} className="flex justify-between gap-4">
            <span className="line-clamp-2 text-ink/70">
              {p.name[lang]} × {qty}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{formatPrice(p.price * qty)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-baseline justify-between border-t border-ink/10 pt-4">
        <span className="text-ink/60">{t.cart.total}</span>
        <span className="font-display text-[28px] font-semibold tabular-nums">{formatPrice(uah)}</span>
      </div>
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
                    <ProductImage p={p} className="aspect-square" />
                  </Link>
                  <div className="min-w-0 space-y-1.5">
                    <span className="font-mono text-[12px] text-ink/50">{p.article || p.code}</span>
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
                      <button className="grid h-10 w-10 place-items-center disabled:opacity-30" disabled={qty >= p.qty} title={t.cart.maxQty(p.qty)} onClick={() => setQty(p.id, qty + 1)} aria-label="+1">
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="font-display text-[19px] font-semibold tabular-nums">{formatPrice(p.price * qty)}</span>
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

export function CheckoutPage() {
  const { t } = useI18n()
  const { clearCart } = useStore()
  const { lines, prepaid } = useLines()
  const started = useRef(Date.now())
  const [form, setForm] = useState({ name: '', phone: '', email: '', method: 'np', city: '', branch: '', payment: 'card', comment: '', website: '' })
  const [touched, setTouched] = useState(false)
  const [state, setState] = useState<{ s: 'idle' | 'sending' | 'error'; code?: string }>({ s: 'idle' })
  const [done, setDone] = useState<null | { id: string }>(null)
  useSeo({ title: `${t.checkout.title} | Asia Motor`, description: t.checkout.title, path: '/checkout', noindex: true })

  const errors: Record<string, string> = {}
  if (!form.name.trim()) errors.name = t.checkout.required
  if (!validPhone(form.phone)) errors.phone = form.phone ? t.checkout.badPhone : t.checkout.required
  if (form.email && !validEmail(form.email)) errors.email = t.checkout.badEmail
  if (form.method !== 'pickup' && !form.city.trim()) errors.city = t.checkout.required
  if (form.method !== 'pickup' && !form.branch.trim()) errors.branch = t.checkout.required
  if (prepaid && form.payment === 'cod') errors.payment = t.checkout.codBlocked
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))
  const err = (k: string) => (touched ? errors[k] : undefined)

  if (done)
    return (
      <div className="min-h-[80vh] bg-paper pb-24 pt-[120px] text-ink">
        <div className="container-x max-w-2xl text-center" role="status">
          <CircleCheck size={52} className="mx-auto text-accent" />
          <h1 className="mt-5 font-display text-[clamp(24px,3vw,36px)] font-semibold uppercase tracking-tight">{t.checkout.successTitle(done.id)}</h1>
          <p className="mx-auto mt-4 max-w-lg leading-relaxed text-ink/65">{t.checkout.successText}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <Link to="/catalog" className="btn btn-dark">
              {t.cart.continue}
            </Link>
            <a href={company.phones[0].href} className="btn btn-line">
              <Phone size={16} /> {company.phones[0].display}
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

  const radio = (k: 'method' | 'payment', v: string, label: string, disabled?: boolean) => (
    <label key={v} className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-[15px] transition-colors ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${form[k] === v ? 'border-ink bg-white' : 'border-ink/12 bg-white/60 hover:border-ink/40'}`}>
      <input type="radio" name={k} value={v} disabled={disabled} checked={form[k] === v} onChange={() => set(k)(v)} className="h-[18px] w-[18px] accent-[#ff4b1f]" />
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
          onSubmit={async (e) => {
            e.preventDefault()
            setTouched(true)
            if (Object.keys(errors).length) {
              document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
              return
            }
            if (state.s === 'sending') return
            setState({ s: 'sending' })
            try {
              const r = await send('order', { ...form, items: lines.map(({ p, qty }) => ({ id: p.id, qty })), elapsed: Date.now() - started.current })
              clearCart()
              setDone(r)
              window.scrollTo(0, 0)
            } catch (ex) {
              setState({ s: 'error', code: (ex as ApiError).code })
            }
          }}
          className="relative mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]"
        >
          <Honeypot value={form.website} onChange={set('website')} />
          <div className="space-y-6">
            {[
              {
                n: 1,
                title: t.checkout.contacts,
                body: (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field id="co-name" label={t.checkout.name} value={form.name} onChange={set('name')} error={err('name')} auto="name" />
                    <Field id="co-phone" label={t.checkout.phone} type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} error={err('phone')} auto="tel" placeholder="0XX XXX XX XX" />
                    <div className="sm:col-span-2">
                      <Field id="co-email" label={t.checkout.email} type="email" inputMode="email" value={form.email} onChange={set('email')} error={err('email')} auto="email" />
                    </div>
                  </div>
                ),
              },
              {
                n: 2,
                title: t.checkout.deliveryStep,
                body: (
                  <div className="space-y-3">
                    <div className="grid gap-2">{(['np', 'carrier', 'pickup'] as const).map((m) => radio('method', m, t.checkout.methods[m]))}</div>
                    {form.method !== 'pickup' && (
                      <div className="grid animate-[cardIn_.35s_var(--ease-out-expo)_both] gap-3 sm:grid-cols-2">
                        <Field id="co-city" label={t.checkout.city} value={form.city} onChange={set('city')} error={err('city')} auto="address-level2" />
                        <Field id="co-branch" label={t.checkout.branch} value={form.branch} onChange={set('branch')} error={err('branch')} />
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
                    <div className="grid gap-2">{(['card', 'cod'] as const).map((m) => radio('payment', m, t.checkout.payments[m], m === 'cod' && prepaid))}</div>
                    {err('payment') && <p className="text-[12.5px] text-red-600">{err('payment')}</p>}
                    <p className="flex gap-2 text-[13px] text-ink/55">
                      <Info size={15} className="mt-0.5 shrink-0" /> {prepaid ? t.checkout.codBlocked : t.checkout.paymentNote}
                    </p>
                    <Field id="co-comment" label={t.checkout.comment} value={form.comment} onChange={set('comment')} area />
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
              <div className="mt-5 space-y-3">
                {state.s === 'error' && (
                  <div>
                    <p className="mb-2 font-semibold text-red-700">{t.checkout.failTitle}</p>
                    <SendError code={state.code ?? ''} />
                  </div>
                )}
                <button type="submit" disabled={state.s === 'sending'} className="btn btn-accent w-full min-h-[56px] disabled:opacity-70">
                  {state.s === 'sending' ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> {t.checkout.sending}
                    </>
                  ) : state.s === 'error' ? (
                    t.checkout.retry
                  ) : (
                    t.checkout.submit
                  )}
                </button>
                <p className="text-[12.5px] leading-relaxed text-ink/50">{t.checkout.consent}</p>
              </div>
            }
          />
        </form>
      </div>
    </div>
  )
}
