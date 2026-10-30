import { useEffect, useState } from 'react'
import { ArrowRight, ChevronDown, X } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import { findMake, findModel, makes, type Car } from '../../data/vehicles'

function Field({ id, label, value, onChange, options, disabled, dark }: { id: string; label: string; value: string; onChange: (v: string) => void; options: [string, string][]; disabled?: boolean; dark?: boolean }) {
  const { t } = useI18n()
  return (
    <label htmlFor={id} className={`relative block rounded-xl border transition-colors ${dark ? 'border-white/15 bg-white/5 focus-within:border-white/50' : 'border-ink/12 bg-white focus-within:border-ink/50'} ${disabled ? 'opacity-45' : ''}`}>
      <span className={`block px-3.5 pt-2 text-[12px] font-medium ${dark ? 'text-white/55' : 'text-ink/55'}`}>{label}</span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`field cursor-pointer appearance-none px-3.5 pb-2 pr-9 text-[15px] font-semibold disabled:cursor-not-allowed ${dark ? '[&>option]:text-ink' : ''}`}
      >
        <option value="">{label === t.car.year || label === t.car.engine ? t.car.any : t.car.choose}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className={`pointer-events-none absolute bottom-3 right-3 ${dark ? 'text-white/50' : 'text-ink/40'}`} />
    </label>
  )
}

/**
 * Make → model → year → engine. `instant` writes every change straight into "My car"
 * (catalogue sidebar); otherwise the choice is saved on submit (home page, product page).
 */
export function CarPicker({ layout = 'row', instant, dark, onSubmit, idPrefix = 'car', initial }: { layout?: 'row' | 'stack'; instant?: boolean; dark?: boolean; onSubmit?: (c: Car) => void; idPrefix?: string; initial?: Partial<Car> }) {
  const { t } = useI18n()
  const { car, setCar } = useStore()
  const [draft, setDraft] = useState<Partial<Car>>(initial ?? car ?? {})
  useEffect(() => {
    if (!initial) setDraft(car ?? {})
  }, [car, initial])

  const mk = findMake(draft.make)
  const md = findModel(mk, draft.model)
  const years = md ? Array.from({ length: md.years[1] - md.years[0] + 1 }, (_, i) => md.years[1] - i) : []

  const update = (patch: Partial<Car>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    if (instant) setCar(next.make && next.model ? (next as Car) : null)
  }

  const fields = (
    <>
      <Field dark={dark} id={`${idPrefix}-make`} label={t.car.make} value={draft.make ?? ''} options={makes.map((m) => [m.slug, m.name])} onChange={(v) => update({ make: v, model: undefined, year: undefined, engine: undefined })} />
      <Field dark={dark} id={`${idPrefix}-model`} label={t.car.model} value={draft.model ?? ''} disabled={!mk} options={(mk?.models ?? []).map((m) => [m.slug, m.name])} onChange={(v) => update({ model: v || undefined, year: undefined, engine: undefined })} />
      <Field dark={dark} id={`${idPrefix}-year`} label={t.car.year} value={draft.year ? String(draft.year) : ''} disabled={!md} options={years.map((y) => [String(y), String(y)])} onChange={(v) => update({ year: v ? Number(v) : undefined })} />
      <Field dark={dark} id={`${idPrefix}-engine`} label={t.car.engine} value={draft.engine ?? ''} disabled={!md} options={(md?.engines ?? []).map((e) => [e, e])} onChange={(v) => update({ engine: v || undefined })} />
    </>
  )

  if (layout === 'stack')
    return (
      <div className="space-y-2">
        {fields}
        {car && (
          <button onClick={() => setCar(null)} className="flex items-center gap-1.5 pt-1 text-[13px] font-medium text-ink/60 hover:text-accent">
            <X size={14} /> {t.nav.removeCar}
          </button>
        )}
      </div>
    )

  return (
    <form
      className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
      onSubmit={(e) => {
        e.preventDefault()
        if (!draft.make || !draft.model) return
        setCar(draft as Car)
        onSubmit?.(draft as Car)
      }}
    >
      {fields}
      <button type="submit" disabled={!md} className="btn btn-accent min-h-[60px] rounded-xl px-7 disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-2 lg:col-span-1">
        {t.car.find} <ArrowRight size={18} className="btn-ico" />
      </button>
    </form>
  )
}
