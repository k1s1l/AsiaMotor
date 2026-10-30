// Concept of the competitive-pricing console (internal tool, not indexed).
// Runs the real engine (src/pricing/engine.ts) on DEMO data; nothing here changes shop prices.
import { useMemo, useState } from 'react'
import { AlertTriangle, Check, ChevronDown, FileUp, History, Info, Lock, LockOpen, Play, RefreshCw, X } from 'lucide-react'
import { applyDecision, decide, defaultRules, margin, parseCsv, type Action, type Alert, type Change, type Decision, type Mode, type Offer, type OurItem, type Rules } from '../pricing/engine'
import { demoItems, demoOffers, sampleCsv } from '../pricing/demoData'
import { useSeo } from '../lib/seo'

const uah = (n: number) => `${new Intl.NumberFormat('uk-UA').format(n)} грн`
const ageH = (iso: string) => Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000)
const age = (iso: string) => {
  const h = ageH(iso)
  return h < 24 ? `${h} год тому` : `${Math.round(h / 24)} дн. тому`
}

const actionUi: Record<Action, { label: string; cls: string }> = {
  lower: { label: 'Знизити', cls: 'bg-emerald-100 text-emerald-800' },
  raise: { label: 'Підняти', cls: 'bg-sky-100 text-sky-800' },
  keep: { label: 'Без змін', cls: 'bg-ink/8 text-ink/60' },
  'hold-floor': { label: 'Нижче порогу', cls: 'bg-red-100 text-red-800' },
  review: { label: 'Перевірка', cls: 'bg-amber-100 text-amber-800' },
  skip: { label: 'Пропущено', cls: 'bg-ink/8 text-ink/60' },
}
const alertUi: Record<Alert, string> = {
  'below-floor': 'Ціна конкурента нижча за мінімально допустиму',
  'no-valid-offers': 'Немає підтверджених пропозицій',
  'needs-review': 'Є схожі товари без збігу артикула — потрібна ручна перевірка',
  'outlier-ignored': 'Аномально низьку ціну відкинуто як помилку',
  'stale-ignored': 'Застарілі ціни не враховано',
  'out-of-stock-ignored': 'Пропозиції «немає в наявності» не враховано',
  cooldown: 'Занадто рано для наступної зміни',
  frozen: 'Ціну зафіксовано вручну',
  excluded: 'Товар виключено',
  'large-change': 'Зміна більша за ліміт автоматичного режиму',
}
const matchUi = { exact: ['Ідентичний', 'text-emerald-700'], cross: ['Підтверджений аналог', 'text-emerald-700'], review: ['На перевірку', 'text-amber-700'], rejected: ['Не збігається', 'text-ink/45'] } as const
const modes: { id: Mode; title: string; text: string }[] = [
  { id: 'manual', title: 'Ручний', text: 'Система лише показує рекомендації.' },
  { id: 'confirm', title: 'Підтвердження', text: 'Система пропонує ціну, адміністратор підтверджує.' },
  { id: 'auto', title: 'Автоматичний', text: 'Зміни в межах обмежень застосовуються самі; решта — на підтвердження.' },
]

export default function PricingAdmin() {
  useSeo({ title: 'Конкурентне ціноутворення — концепт | Asia Motor', description: 'Внутрішня панель керування цінами (демо).', path: '/admin/pricing', noindex: true })
  const [rules, setRules] = useState<Rules>(defaultRules)
  const [items, setItems] = useState<OurItem[]>(demoItems)
  const [offers, setOffers] = useState<Offer[]>(demoOffers)
  const [history, setHistory] = useState<Change[]>([])
  const [tab, setTab] = useState<'rec' | 'review' | 'history' | 'import'>('rec')
  const [open, setOpen] = useState<string | null>('F-H6-L')
  const [now, setNow] = useState(() => new Date().toISOString())
  const [csv, setCsv] = useState(sampleCsv)
  const [csvMsg, setCsvMsg] = useState<string | null>(null)
  const [showRules, setShowRules] = useState(false)

  const decisions = useMemo(() => {
    const m = new Map<string, Decision>()
    for (const it of items) m.set(it.sku, decide(it, offers, rules, now))
    return m
  }, [items, offers, rules, now])

  const list = [...decisions.values()]
  const stats = {
    lower: list.filter((d) => d.action === 'lower' || d.action === 'raise').length,
    floor: list.filter((d) => d.action === 'hold-floor').length,
    review: list.filter((d) => d.alerts.includes('needs-review')).length,
    none: list.filter((d) => d.alerts.includes('no-valid-offers')).length,
  }

  const apply = (sku: string, by: Change['by']) => {
    const it = items.find((i) => i.sku === sku)!
    const res = applyDecision(it, decisions.get(sku)!, by, new Date().toISOString())
    if (!res) return
    setItems((xs) => xs.map((x) => (x.sku === sku ? res.item : x)))
    setHistory((h) => [res.change, ...h])
  }
  const toggleFreeze = (sku: string) => setItems((xs) => xs.map((x) => (x.sku === sku ? { ...x, rules: { ...x.rules, frozen: !x.rules?.frozen } } : x)))
  const runAuto = () => {
    for (const d of list) if (d.autoApply) apply(d.sku, 'auto')
  }

  const rows = tab === 'review' ? list.filter((d) => d.alerts.includes('needs-review') || d.action === 'hold-floor') : list

  return (
    <div className="min-h-screen bg-paper pb-24 pt-[96px] text-ink lg:pt-[136px]">
      <div className="container-x">
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-[13.5px] text-amber-900 ring-1 ring-amber-200">
          <Info size={16} className="mt-0.5 shrink-0" />
          Концепт внутрішньої панелі. Конкуренти й закупівельні ціни — умовні демо-дані; розрахунок виконує справжній алгоритм (src/pricing/engine.ts). Ціни в каталозі магазину не змінюються.
        </p>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[clamp(26px,3.4vw,40px)] font-semibold uppercase tracking-[-0.03em]">Конкурентне ціноутворення</h1>
            <p className="mt-2 text-[14px] text-ink/55">Розрахунок: {new Date(now).toLocaleString('uk-UA')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setNow(new Date().toISOString())} className="btn btn-line min-h-[44px] text-[14px]">
              <RefreshCw size={15} /> Перерахувати
            </button>
            {rules.mode === 'auto' && (
              <button onClick={runAuto} className="btn btn-accent min-h-[44px] text-[14px]">
                <Play size={15} /> Запустити автоцикл ({list.filter((d) => d.autoApply).length})
              </button>
            )}
          </div>
        </div>

        {/* modes */}
        <div className="mt-6 grid gap-2 md:grid-cols-3" role="radiogroup" aria-label="Режим">
          {modes.map((m) => (
            <button key={m.id} role="radio" aria-checked={rules.mode === m.id} onClick={() => setRules({ ...rules, mode: m.id })} className={`rounded-2xl border p-4 text-left transition-colors ${rules.mode === m.id ? 'border-ink bg-ink text-white' : 'border-ink/12 bg-white hover:border-ink/40'}`}>
              <span className="flex items-center justify-between text-[15px] font-bold">
                {m.title} {m.id === 'confirm' && <span className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold uppercase ${rules.mode === m.id ? 'bg-white/15' : 'bg-ink/8'}`}>за замовчуванням</span>}
              </span>
              <span className={`mt-1 block text-[13px] ${rules.mode === m.id ? 'text-white/70' : 'text-ink/55'}`}>{m.text}</span>
            </button>
          ))}
        </div>

        {/* rules */}
        <div className="mt-3 rounded-2xl border border-ink/10 bg-white">
          <button onClick={() => setShowRules(!showRules)} className="flex w-full items-center justify-between px-5 py-4 text-left text-[15px] font-bold" aria-expanded={showRules}>
            Правила за замовчуванням
            <span className="flex items-center gap-3 text-[13px] font-normal text-ink/55">
              крок {rules.step} грн · маржа ≥ {rules.minMarginPct}% · знижка ≤ {rules.maxDropPct}% · ціни не старші {rules.staleHours} год
              <ChevronDown size={16} className={`transition-transform ${showRules ? 'rotate-180' : ''}`} />
            </span>
          </button>
          {showRules && (
            <div className="grid animate-[cardIn_.35s_var(--ease-out-expo)_both] gap-3 border-t border-ink/8 p-5 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ['step', 'Відставання від конкурента, грн'],
                  ['minMarginPct', 'Мінімальна маржа, %'],
                  ['maxDropPct', 'Макс. знижка від базової ціни, %'],
                  ['staleHours', 'Ігнорувати ціни старші за, год'],
                  ['cooldownHours', 'Мін. інтервал між змінами, год'],
                  ['outlierPct', 'Аномалія: дешевше медіани на, % від медіани'],
                  ['autoMaxStepPct', 'Автоматично — зміна не більше, %'],
                ] as [keyof Rules, string][]
              ).map(([k, label]) => (
                <label key={k} className="block">
                  <span className="text-[12.5px] text-ink/60">{label}</span>
                  <input type="number" min={0} value={rules[k] as number} onChange={(e) => setRules({ ...rules, [k]: Number(e.target.value) })} className="field mt-1 rounded-lg border border-ink/15 px-3 py-2 tabular-nums focus:border-ink/50" />
                </label>
              ))}
              <label className="flex items-center gap-2 self-end pb-2 text-[14px]">
                <input type="checkbox" checked={rules.capAtBase} onChange={(e) => setRules({ ...rules, capAtBase: e.target.checked })} className="h-[18px] w-[18px] accent-[#ff4b1f]" />
                Не піднімати вище базової ціни
              </label>
            </div>
          )}
        </div>

        {/* KPIs */}
        <dl className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            ['Рекомендацій змінити ціну', stats.lower, 'text-emerald-700'],
            ['Конкурент нижче порогу', stats.floor, 'text-red-700'],
            ['На ручну перевірку', stats.review, 'text-amber-700'],
            ['Без підтверджених конкурентів', stats.none, 'text-ink/60'],
          ].map(([l, v, c]) => (
            <div key={l as string} className="rounded-2xl border border-ink/10 bg-white p-4">
              <dt className="text-[13px] text-ink/55">{l}</dt>
              <dd className={`mt-1 font-display text-[30px] font-semibold tabular-nums ${c}`}>{v}</dd>
            </div>
          ))}
        </dl>

        {/* tabs */}
        <div className="mt-8 flex gap-1 overflow-x-auto border-b border-ink/10" role="tablist">
          {(
            [
              ['rec', `Рекомендації (${list.length})`],
              ['review', `Потребують рішення (${list.filter((d) => d.alerts.includes('needs-review') || d.action === 'hold-floor').length})`],
              ['history', `Історія (${history.length})`],
              ['import', 'Імпорт прайс-листа'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`shrink-0 border-b-2 px-4 py-3 text-[14px] font-semibold ${tab === id ? 'border-accent text-ink' : 'border-transparent text-ink/50 hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </div>

        {(tab === 'rec' || tab === 'review') && (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-ink/10 bg-white">
            <table className="w-full min-w-[1080px] text-left text-[14px]">
              <thead className="bg-ink/[0.03] text-[12px] text-ink/55">
                <tr>
                  {['Товар', 'Наша ціна', 'Закупівля / мін.', 'Найкраща ціна конкурента', 'Рекомендація', 'Маржа', 'Статус', ''].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => {
                  const it = items.find((i) => i.sku === d.sku)!
                  const diff = d.recommended - d.current
                  const expanded = open === d.sku
                  return [
                    <tr key={d.sku} className={`cursor-pointer border-t border-ink/8 align-top hover:bg-ink/[0.02] ${expanded ? 'bg-ink/[0.02]' : ''}`} onClick={() => setOpen(expanded ? null : d.sku)}>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{it.name}</p>
                        <p className="font-mono text-[12px] text-ink/50">
                          {it.article} {it.side && `· ${it.side === 'left' ? 'ліва' : 'права'}`}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums">{uah(d.current)}</td>
                      <td className="px-4 py-3 tabular-nums text-ink/70">
                        {uah(it.cost)}
                        <br />
                        <span className="text-[12.5px]">мін. {uah(d.floor)}</span>
                      </td>
                      <td className="px-4 py-3">
                        {d.best ? (
                          <>
                            <p className="font-semibold tabular-nums">{uah(d.best.price)}</p>
                            <p className="text-[12.5px] text-ink/55">
                              {d.best.competitor} · {age(d.best.observedAt)}
                            </p>
                          </>
                        ) : (
                          <span className="text-ink/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold tabular-nums">{uah(d.recommended)}</p>
                        {diff !== 0 && <p className={`text-[12.5px] tabular-nums ${diff < 0 ? 'text-emerald-700' : 'text-sky-700'}`}>{diff > 0 ? `+${diff}` : diff} грн</p>}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {margin(d.current, it.cost).toFixed(1)}% → <b>{margin(d.recommended, it.cost).toFixed(1)}%</b>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-md px-2 py-1 text-[12px] font-semibold ${actionUi[d.action].cls}`}>{actionUi[d.action].label}</span>
                        {d.alerts.some((a) => a === 'below-floor' || a === 'needs-review' || a === 'large-change') && <AlertTriangle size={15} className="ml-1.5 inline text-amber-600" />}
                        {rules.mode === 'auto' && d.autoApply && <p className="mt-1 text-[11.5px] text-emerald-700">застосується автоматично</p>}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          {d.recommended !== d.current && d.action !== 'skip' && rules.mode !== 'manual' && (
                            <button onClick={() => apply(d.sku, 'admin')} className="flex items-center gap-1 rounded-lg bg-ink px-2.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-accent" title="Підтвердити рекомендовану ціну">
                              <Check size={14} /> Підтвердити
                            </button>
                          )}
                          <button onClick={() => toggleFreeze(d.sku)} className="grid h-8 w-8 place-items-center rounded-lg border border-ink/15 hover:border-ink/50" title={it.rules?.frozen ? 'Зняти фіксацію' : 'Зафіксувати ціну'} aria-label={it.rules?.frozen ? 'Зняти фіксацію' : 'Зафіксувати ціну'}>
                            {it.rules?.frozen ? <LockOpen size={14} /> : <Lock size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>,
                    expanded && (
                      <tr key={d.sku + '-x'} className="border-t border-ink/5 bg-ink/[0.02]">
                        <td colSpan={8} className="px-4 pb-5 pt-1">
                          <p className="max-w-3xl text-[14px] font-medium">{d.explain}</p>
                          {d.alerts.length > 0 && (
                            <ul className="mt-2 flex flex-wrap gap-1.5">
                              {d.alerts.map((a) => (
                                <li key={a} className="rounded-md bg-white px-2 py-1 text-[12px] text-ink/70 ring-1 ring-ink/10">
                                  {alertUi[a]}
                                </li>
                              ))}
                            </ul>
                          )}
                          <table className="mt-3 w-full text-[13px]">
                            <thead className="text-ink/50">
                              <tr>
                                {['Конкурент', 'Джерело', 'Артикул / бренд', 'Ціна', 'Наявність', 'Оновлено', 'Зіставлення'].map((h) => (
                                  <th key={h} className="py-1.5 pr-4 text-left font-medium">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {d.matches
                                .filter((m) => m.kind !== 'rejected' || m.reasons[0] !== 'no-match')
                                .map((m, i) => (
                                  <tr key={i} className="border-t border-ink/5">
                                    <td className="py-1.5 pr-4">{m.offer.competitor}</td>
                                    <td className="py-1.5 pr-4 text-ink/60">{{ api: 'API', feed: 'Фід', csv: 'CSV', monitor: 'Моніторинг' }[m.offer.source]}</td>
                                    <td className="py-1.5 pr-4 font-mono">
                                      {m.offer.article} / {m.offer.brand || '—'} {m.offer.side && `(${m.offer.side === 'left' ? 'ліва' : 'права'})`}
                                    </td>
                                    <td className="py-1.5 pr-4 tabular-nums">{uah(m.offer.price)}</td>
                                    <td className="py-1.5 pr-4">{m.offer.inStock ? 'є' : 'немає'}</td>
                                    <td className="py-1.5 pr-4 text-ink/60">{age(m.offer.observedAt)}</td>
                                    <td className={`py-1.5 pr-4 font-semibold ${matchUi[m.kind][1]}`}>
                                      {matchUi[m.kind][0]} <span className="font-normal text-ink/45">({Math.round(m.score * 100)}%)</span>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    ),
                  ]
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'history' && (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-ink/10 bg-white">
            {history.length === 0 ? (
              <p className="flex items-center gap-2 p-6 text-ink/55">
                <History size={17} /> Змін ще не було. Підтвердьте рекомендацію або запустіть автоцикл — кожна зміна запишеться сюди з причиною й даними конкурента.
              </p>
            ) : (
              <table className="w-full min-w-[900px] text-left text-[14px]">
                <thead className="bg-ink/[0.03] text-[12px] text-ink/55">
                  <tr>
                    {['Час', 'Товар', 'Було → стало', 'Хто', 'Підстава'].map((h) => (
                      <th key={h} className="px-4 py-3 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((c, i) => (
                    <tr key={i} className="border-t border-ink/8 align-top">
                      <td className="px-4 py-3 tabular-nums text-ink/60">{new Date(c.at).toLocaleString('uk-UA')}</td>
                      <td className="px-4 py-3 font-semibold">{items.find((x) => x.sku === c.sku)?.name}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {uah(c.from)} → <b>{uah(c.to)}</b>
                      </td>
                      <td className="px-4 py-3">{c.by === 'auto' ? 'Автоматично' : 'Адміністратор'}</td>
                      <td className="max-w-md px-4 py-3 text-ink/70">{c.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'import' && (
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-ink/10 bg-white p-5">
              <label htmlFor="csv" className="text-[14px] font-semibold">
                CSV / прайс-лист конкурента або постачальника
              </label>
              <textarea id="csv" value={csv} onChange={(e) => setCsv(e.target.value)} rows={9} className="field mt-2 rounded-xl border border-ink/15 p-3 font-mono text-[12.5px] focus:border-ink/50" />
              <button
                onClick={() => {
                  const { offers: parsed, errors } = parseCsv(csv, new Date().toISOString())
                  setOffers((o) => [...o, ...parsed])
                  setNow(new Date().toISOString())
                  setCsvMsg(`Імпортовано рядків: ${parsed.length}.${errors.length ? ' Помилки: ' + errors.join('; ') : ''}`)
                }}
                className="btn btn-dark mt-3 min-h-[46px] text-[14px]"
              >
                <FileUp size={16} /> Імпортувати й перерахувати
              </button>
              {csvMsg && (
                <p className="mt-3 flex items-center gap-2 text-[14px]" role="status">
                  {csvMsg.includes('Помилки') ? <X size={15} className="text-red-600" /> : <Check size={15} className="text-emerald-600" />} {csvMsg}
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-ink/10 bg-white p-5 text-[14px] leading-relaxed text-ink/70">
              <p className="font-semibold text-ink">Формат</p>
              <p className="mt-2">
                Перший рядок — заголовки. Обов’язкові колонки: <code>competitor</code>, <code>article</code>, <code>price</code>. Додатково: <code>brand</code>, <code>title</code>, <code>in_stock</code> (1/0), <code>side</code> (left/right). Розділювач — «;» або «,».
              </p>
              <p className="mt-3">Імпорт потрібен для конкурентів без API і для прайсів постачальників. Рядки з тим самим артикулом і брендом зіставляються автоматично, решта — потрапляють на ручну перевірку.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
