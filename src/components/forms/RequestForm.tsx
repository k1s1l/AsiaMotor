import { useRef, useState, type ReactNode } from 'react'
import { CircleCheck, CircleX, Loader2, Send } from 'lucide-react'
import { useI18n } from '../../i18n'
import { company } from '../../data/company'
import { ApiError, send, validEmail, validPhone, type FormKind } from '../../lib/api'

type Values = Record<string, string>

export function Field({ id, label, value, onChange, error, type = 'text', auto, area, dark, inputMode, placeholder }: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  type?: string
  auto?: string
  area?: boolean
  dark?: boolean
  inputMode?: 'tel' | 'email' | 'text'
  placeholder?: string
}) {
  const cls = `field mt-1.5 rounded-xl border px-4 text-[15px] ${dark ? 'bg-white/5 text-white placeholder:text-white/35' : 'bg-white'} ${error ? 'border-red-400' : dark ? 'border-white/15 focus:border-white/50' : 'border-ink/15 focus:border-ink/50'}`
  return (
    <label htmlFor={id} className="block">
      <span className={`text-[13px] font-medium ${dark ? 'text-white/60' : 'text-ink/65'}`}>{label}</span>
      {area ? (
        <textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={4} aria-invalid={!!error} placeholder={placeholder} className={`${cls} py-3`} />
      ) : (
        <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={auto} inputMode={inputMode} aria-invalid={!!error} placeholder={placeholder} className={`${cls} min-h-[50px]`} />
      )}
      {error && <span className="mt-1 block text-[12.5px] text-red-600">{error}</span>}
    </label>
  )
}

/** Hidden field: people never see it, form-filling bots do. The server drops requests that fill it. */
export const Honeypot = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
    <label>
      Website
      <input tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} name="website" />
    </label>
  </div>
)

export function SendError({ code, dark }: { code: string; dark?: boolean }) {
  const { t } = useI18n()
  return (
    <p role="alert" className={`flex gap-2 rounded-xl px-4 py-3 text-[14px] ${dark ? 'bg-red-500/15 text-red-200' : 'bg-red-50 text-red-700'}`}>
      <CircleX size={18} className="mt-0.5 shrink-0" />
      <span>
        {code === 'rate' ? t.forms.tooMany : t.forms.fail}{' '}
        <a href={company.phones[0].href} className="whitespace-nowrap font-semibold underline">
          {company.phones[0].display}
        </a>
      </span>
    </p>
  )
}

const FIELDS: Record<Exclude<FormKind, 'order'>, string[]> = {
  callback: ['name', 'phone', 'message'],
  vin: ['vin', 'part', 'car', 'name', 'phone', 'email'],
  feedback: ['name', 'phone', 'email', 'message'],
  product: ['name', 'phone', 'email', 'message'],
}

/**
 * Call-back, VIN, question and product forms. Shows success only after the server confirmed
 * the e-mail was sent; otherwise an error with the shop's phone number.
 */
export function RequestForm({ kind, product, dark, intro, onDone }: { kind: Exclude<FormKind, 'order'>; product?: string; dark?: boolean; intro?: ReactNode; onDone?: () => void }) {
  const { t } = useI18n()
  const started = useRef(Date.now())
  const [v, setV] = useState<Values>({ name: '', phone: '', email: '', message: '', vin: '', part: '', car: '', website: '' })
  const [touched, setTouched] = useState(false)
  const [state, setState] = useState<{ s: 'idle' | 'sending' | 'ok' | 'error'; code?: string; server?: Values }>({ s: 'idle' })
  const fields = FIELDS[kind]

  const errors: Values = {}
  const needContact = kind !== 'callback'
  if (kind === 'callback' || kind === 'vin') {
    if (!validPhone(v.phone) && !(kind === 'vin' && validEmail(v.email))) errors.phone = v.phone ? t.checkout.badPhone : kind === 'vin' ? t.forms.contactNeeded : t.checkout.required
  } else if (!validPhone(v.phone) && !validEmail(v.email)) errors.phone = v.phone ? t.checkout.badPhone : t.forms.contactNeeded
  if (v.phone && !validPhone(v.phone)) errors.phone = t.checkout.badPhone
  if (fields.includes('email') && v.email && !validEmail(v.email)) errors.email = t.checkout.badEmail
  if (kind === 'vin' && !/^[A-HJ-NPR-Z0-9]{17}$/i.test(v.vin.replace(/\s/g, ''))) errors.vin = t.forms.badVin
  if (kind === 'vin' && !v.part.trim()) errors.part = t.checkout.required
  if ((kind === 'feedback' || kind === 'product') && !v.message.trim()) errors.message = t.checkout.required
  // server-side validation messages win once the server has answered
  for (const [k, code] of Object.entries(state.server ?? {})) errors[k] ??= code === 'vin' ? t.forms.badVin : code === 'phone' ? t.checkout.badPhone : code === 'contact' ? t.forms.contactNeeded : t.checkout.required
  const err = (k: string) => (touched ? errors[k] : undefined)
  const set = (k: string) => (val: string) => {
    setV((o) => ({ ...o, [k]: val }))
    if (state.server) setState({ s: 'idle' })
  }

  if (state.s === 'ok')
    return (
      <div role="status" className="py-4 text-center">
        <CircleCheck size={44} className="mx-auto text-accent" />
        <p className="mt-3 font-display text-[20px] font-semibold uppercase tracking-tight">{t.forms.okTitle}</p>
        <p className={`mx-auto mt-2 max-w-sm text-[14.5px] ${dark ? 'text-white/65' : 'text-ink/60'}`}>{t.forms.okText}</p>
        {onDone && (
          <button type="button" onClick={onDone} className={`btn mt-5 ${dark ? 'btn-ghost' : 'btn-line'}`}>
            {t.common.close}
          </button>
        )}
      </div>
    )

  const id = (k: string) => `${kind}-${k}`
  return (
    <form
      noValidate
      className="relative space-y-3"
      onSubmit={async (e) => {
        e.preventDefault()
        setTouched(true)
        if (Object.keys(errors).length || state.s === 'sending') return
        setState({ s: 'sending' })
        try {
          await send(kind, { ...v, vin: v.vin.replace(/\s/g, '').toUpperCase(), product, elapsed: Date.now() - started.current })
          setState({ s: 'ok' })
        } catch (ex) {
          const a = ex as ApiError
          setState({ s: 'error', code: a.code, server: a.code === 'validation' ? a.fields : undefined })
        }
      }}
    >
      {intro}
      <Honeypot value={v.website} onChange={set('website')} />
      {fields.includes('vin') && <Field dark={dark} id={id('vin')} label={t.forms.vin} value={v.vin} onChange={set('vin')} error={err('vin')} auto="off" />}
      {fields.includes('part') && <Field dark={dark} id={id('part')} label={t.forms.part} value={v.part} onChange={set('part')} error={err('part')} />}
      {fields.includes('car') && <Field dark={dark} id={id('car')} label={t.forms.car} value={v.car} onChange={set('car')} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field dark={dark} id={id('name')} label={t.forms.name} value={v.name} onChange={set('name')} auto="name" />
        <Field dark={dark} id={id('phone')} label={t.forms.phone} type="tel" inputMode="tel" value={v.phone} onChange={set('phone')} error={err('phone')} auto="tel" placeholder="0XX XXX XX XX" />
      </div>
      {fields.includes('email') && <Field dark={dark} id={id('email')} label={needContact ? t.forms.email : t.forms.emailOptional} type="email" inputMode="email" value={v.email} onChange={set('email')} error={err('email')} auto="email" />}
      {fields.includes('message') && <Field dark={dark} id={id('message')} label={t.forms.message} value={v.message} onChange={set('message')} error={err('message')} area />}
      {state.s === 'error' && state.code !== 'validation' && <SendError code={state.code ?? ''} dark={dark} />}
      <button type="submit" disabled={state.s === 'sending'} className="btn btn-accent min-h-[52px] w-full disabled:opacity-70">
        {state.s === 'sending' ? (
          <>
            <Loader2 size={17} className="animate-spin" /> {t.forms.sending}
          </>
        ) : (
          <>
            {t.forms.send} <Send size={16} />
          </>
        )}
      </button>
      <p className={`text-[12px] leading-relaxed ${dark ? 'text-white/40' : 'text-ink/45'}`}>{t.forms.consent}</p>
    </form>
  )
}
