import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ChevronDown, Info, LayoutGrid, List, Phone, Search, SlidersHorizontal, X } from 'lucide-react'
import { useI18n } from '../i18n'
import { useStore } from '../store'
import { taxonomy, findCat, findSub } from '../data/taxonomy'
import { countBy, query, type Product, type Sort } from '../data/catalog'
import { carLabel } from '../data/vehicles'
import { company } from '../data/company'
import { ProductCard } from '../components/shop/ProductCard'
import { CarPicker } from '../components/shop/CarPicker'
import { Crumbs } from '../components/shop/bits'
import { lockScroll, scrollToTarget } from '../lib/motion'
import { useSeo } from '../lib/seo'

const PER = [24, 48, 96]

function Check({ checked, onChange, label, count }: { checked: boolean; onChange: () => void; label: string; count?: number }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[14px]">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-[18px] w-[18px] accent-[#ff4b1f]" />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-[12px] tabular-nums text-ink/45">{count}</span>}
    </label>
  )
}

function Section({ title, children, open: initial = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(initial)
  return (
    <section className="border-b border-ink/10 py-4">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left text-[14px] font-semibold" aria-expanded={open}>
        {title}
        <ChevronDown size={16} className={`text-ink/45 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-400 ease-[var(--ease-out-expo)] ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="pt-3">{children}</div>
        </div>
      </div>
    </section>
  )
}

export function CatalogPage() {
  const { t, lang } = useI18n()
  const { car, setCar } = useStore()
  const params = useParams()
  const [sp, setSp] = useSearchParams()
  const cat = findCat(params.cat)
  const sub = findSub(cat, params.sub)
  const [panel, setPanel] = useState(false)
  const [loaded, setLoaded] = useState(1)

  const get = (k: string) => sp.get(k) ?? ''
  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp)
    for (const [k, v] of Object.entries(patch)) (v === null || v === '' ? next.delete(k) : next.set(k, v))
    if (!('page' in patch)) next.delete('page')
    setSp(next, { replace: true, preventScrollReset: true })
  }
  const list = (k: string) => get(k).split(',').filter(Boolean)
  const toggle = (k: string, v: string) => {
    const cur = list(k)
    set({ [k]: (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).join(',') })
  }

  const q = get('q')
  const sort = (get('sort') || 'popular') as Sort
  const per = PER.includes(Number(get('per'))) ? Number(get('per')) : 24
  const view = get('view') === 'list' ? 'list' : 'grid'
  const page = Math.max(1, Number(get('page')) || 1)
  const filters = { maker: list('maker'), quality: list('quality'), inStock: get('stock') === '1', priceMin: Number(get('min')) || undefined, priceMax: Number(get('max')) || undefined }

  // base set (category + car + text) drives the facet counts; facets narrow it further
  const base = useMemo(() => query({ cat: cat?.slug, sub: sub?.slug, q, car }), [cat, sub, q, car])
  const results = useMemo(() => query({ cat: cat?.slug, sub: sub?.slug, q, car, sort, ...filters }), [base, sort, sp]) // eslint-disable-line react-hooks/exhaustive-deps
  const shown = useDeferredValue(results)
  const stale = shown !== results
  const makerCounts = useMemo(() => countBy(base, (p) => p.manufacturer), [base])
  const qualityCounts = useMemo(() => countBy(base, (p) => p.quality), [base])
  const catCounts = useMemo(() => countBy(query({ q, car }), (p) => p.cat), [q, car])
  const subCounts = useMemo(() => countBy(query({ cat: cat?.slug, q, car }), (p) => p.sub), [cat, q, car])

  useEffect(() => setLoaded(1), [results, page, per])
  useEffect(() => lockScroll(panel), [panel])

  const pages = Math.max(1, Math.ceil(shown.length / per))
  const start = (page - 1) * per
  const visible: Product[] = shown.slice(start, start + per * loaded)
  const activeCount = filters.maker.length + filters.quality.length + (filters.inStock ? 1 : 0) + (filters.priceMin || filters.priceMax ? 1 : 0)

  const heading = sub ? sub[lang] : cat ? cat[lang] : t.catalog.title
  const carText = car ? carLabel(car) : ''
  const path = `/catalog${cat ? '/' + cat.slug : ''}${sub ? '/' + sub.slug : ''}`
  useSeo({
    title: `${heading}${carText ? ` ${lang === 'ua' ? 'для' : 'для'} ${carText}` : ''} — ${lang === 'ua' ? 'купити в Україні' : 'купить в Украине'} | Asia Motor`,
    description:
      lang === 'ua'
        ? `${heading} для китайських авто: Haval, Chery, Geely, Great Wall, BYD, Lifan. Позицій: ${results.length}. Підбір за авто, доставка по Україні, склад у Запоріжжі.`
        : `${heading} для китайских авто: Haval, Chery, Geely, Great Wall, BYD, Lifan. Позиций: ${results.length}. Подбор по авто, доставка по Украине, склад в Запорожье.`,
    path,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: t.catalog.title, item: '/catalog' },
        ...(cat ? [{ '@type': 'ListItem', position: 2, name: cat[lang], item: `/catalog/${cat.slug}` }] : []),
        ...(sub ? [{ '@type': 'ListItem', position: 3, name: sub[lang], item: path }] : []),
      ],
    },
  })

  const sidebar = (
    <div>
      <Section title={t.catalog.car}>
        <CarPicker layout="stack" instant idPrefix={panel ? 'm-car' : 'side-car'} />
      </Section>
      <Section title={t.catalog.categories}>
        <ul className="space-y-0.5 text-[14px]">
          <li>
            <Link to={`/catalog${sp.toString() ? '?' + sp.toString() : ''}`} className={`flex justify-between rounded-lg px-2 py-1.5 ${!cat ? 'bg-ink text-white' : 'hover:bg-ink/5'}`}>
              {t.nav.allCats}
            </Link>
          </li>
          {taxonomy.map((c) => (
            <li key={c.slug}>
              <Link to={`/catalog/${c.slug}`} className={`flex justify-between rounded-lg px-2 py-1.5 ${cat?.slug === c.slug && !sub ? 'bg-ink text-white' : cat?.slug === c.slug ? 'font-semibold' : 'hover:bg-ink/5'}`}>
                <span>{c[lang]}</span>
                <span className="text-[12px] tabular-nums opacity-50">{catCounts.get(c.slug) ?? 0}</span>
              </Link>
              {cat?.slug === c.slug && (
                <ul className="my-1 ml-3 animate-[cardIn_.4s_var(--ease-out-expo)_both] border-l border-ink/10 pl-2">
                  {c.subs.map((s) => (
                    <li key={s.slug}>
                      <Link to={`/catalog/${c.slug}/${s.slug}`} className={`flex justify-between rounded-lg px-2 py-1.5 text-[13.5px] ${sub?.slug === s.slug ? 'bg-ink text-white' : 'text-ink/75 hover:bg-ink/5'}`}>
                        <span>{s[lang]}</span>
                        <span className="text-[12px] tabular-nums opacity-50">{subCounts.get(s.slug) ?? 0}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </Section>
      <Section title={t.catalog.price}>
        <div className="flex items-center gap-2">
          {(['min', 'max'] as const).map((k) => (
            <input
              key={k}
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={k === 'min' ? t.catalog.from : t.catalog.to}
              defaultValue={get(k)}
              onBlur={(e) => set({ [k]: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && set({ [k]: (e.target as HTMLInputElement).value })}
              aria-label={`${t.catalog.price} ${k === 'min' ? t.catalog.from : t.catalog.to}`}
              className="field min-w-0 flex-1 rounded-lg border border-ink/15 bg-white px-3 py-2 text-[14px] tabular-nums focus:border-ink/50"
            />
          ))}
        </div>
      </Section>
      <Section title={t.catalog.quality}>
        {(['original', 'aftermarket', 'unknown'] as const)
          .filter((k) => qualityCounts.get(k))
          .map((k) => (
            <Check key={k} checked={filters.quality.includes(k)} onChange={() => toggle('quality', k)} label={t.catalog.qualities[k]} count={qualityCounts.get(k)} />
          ))}
        <Check checked={filters.inStock} onChange={() => set({ stock: filters.inStock ? null : '1' })} label={t.catalog.inStock} />
      </Section>
      <Section title={t.catalog.maker} open={false}>
        {[...makerCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([m, n]) => (
            <Check key={m} checked={filters.maker.includes(m)} onChange={() => toggle('maker', m)} label={m === '—' ? t.catalog.qualities.unknown : m} count={n} />
          ))}
      </Section>
      {activeCount > 0 && (
        <button onClick={() => set({ maker: null, quality: null, stock: null, min: null, max: null })} className="mt-4 text-[14px] font-semibold text-accent">
          {t.catalog.resetAll}
        </button>
      )}
    </div>
  )

  return (
    <div className="bg-paper pb-24 pt-[96px] text-ink lg:pt-[136px]">
      <div className="container-x">
        <Crumbs items={[{ to: '/', label: t.common.home }, { to: cat ? '/catalog' : undefined, label: t.catalog.title }, ...(cat ? [{ to: sub ? `/catalog/${cat.slug}` : undefined, label: cat[lang] }] : []), ...(sub ? [{ label: sub[lang] }] : [])]} />
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-[clamp(28px,4vw,48px)] font-semibold uppercase leading-[1] tracking-[-0.03em]">
            {heading}
            {car && <span className="mt-2 block font-sans text-[clamp(16px,1.6vw,20px)] font-semibold normal-case tracking-normal text-accent">{t.catalog.forCar(carLabel(car))}</span>}
          </h1>
          <p className="text-[15px] text-ink/60" aria-live="polite">
            {t.catalog.found(results.length)}
          </p>
        </div>
        {/* subcategory shortcuts */}
        {cat && !sub && (
          <ul className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4">
            {cat.subs.map((s) => (
              <li key={s.slug} className="shrink-0">
                <Link to={`/catalog/${cat.slug}/${s.slug}`} className="flex items-center gap-2.5 rounded-xl border border-ink/10 bg-white py-1.5 pl-1.5 pr-3.5 text-[14px] font-medium transition-colors hover:border-ink/40">
                  <img src={s.image} alt="" className="h-10 w-10 rounded-lg bg-[#e9e7e2] object-cover" loading="lazy" />
                  {s[lang]}
                  <span className="text-[12px] text-ink/45">{subCounts.get(s.slug) ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="hidden lg:block" aria-label={t.catalog.filters}>
            <div className="sticky top-24">{sidebar}</div>
          </aside>

          <div className="min-w-0">
            {/* toolbar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-ink/8 bg-white p-3 sm:flex-row sm:items-center">
              <label className="flex min-h-[44px] flex-1 items-center gap-2.5 rounded-xl bg-paper px-3.5">
                <Search size={17} className="shrink-0 text-ink/45" />
                <input value={q} onChange={(e) => set({ q: e.target.value })} placeholder={t.nav.searchPh} aria-label={t.nav.search} className="field text-[15px] placeholder:text-ink/40" />
                {q && (
                  <button onClick={() => set({ q: null })} aria-label={t.common.reset}>
                    <X size={16} />
                  </button>
                )}
              </label>
              <div className="flex items-center gap-2">
                <button onClick={() => setPanel(true)} className="flex min-h-[44px] items-center gap-2 rounded-xl border border-ink/12 px-3.5 text-[14px] font-semibold lg:hidden">
                  <SlidersHorizontal size={16} /> {t.catalog.filters}
                  {activeCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] text-white">{activeCount}</span>}
                </button>
                <select value={sort} onChange={(e) => set({ sort: e.target.value === 'popular' ? null : e.target.value })} aria-label={t.catalog.sort} className="min-h-[44px] flex-1 cursor-pointer rounded-xl border border-ink/12 bg-white px-3 text-[14px] font-medium sm:flex-none">
                  {Object.entries(t.catalog.sorts).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select value={per} onChange={(e) => set({ per: e.target.value === '24' ? null : e.target.value })} aria-label={t.catalog.perPage} className="hidden min-h-[44px] cursor-pointer rounded-xl border border-ink/12 bg-white px-3 text-[14px] font-medium sm:block">
                  {PER.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <div className="hidden rounded-xl border border-ink/12 p-1 sm:flex" role="group" aria-label={`${t.catalog.grid} / ${t.catalog.list}`}>
                  {(['grid', 'list'] as const).map((v) => (
                    <button key={v} onClick={() => set({ view: v === 'grid' ? null : v })} aria-pressed={view === v} aria-label={v === 'grid' ? t.catalog.grid : t.catalog.list} className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${view === v ? 'bg-ink text-white' : 'text-ink/50 hover:text-ink'}`}>
                      {v === 'grid' ? <LayoutGrid size={16} /> : <List size={16} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* active filter chips */}
            {(car || activeCount > 0) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {car && <Chip label={carLabel(car)} accent onClear={() => setCar(null)} />}
                {filters.quality.map((k) => (
                  <Chip key={k} label={t.catalog.qualities[k as 'original']} onClear={() => toggle('quality', k)} />
                ))}
                {filters.maker.map((k) => (
                  <Chip key={k} label={k} onClear={() => toggle('maker', k)} />
                ))}
                {filters.inStock && <Chip label={t.catalog.inStock} onClear={() => set({ stock: null })} />}
                {(filters.priceMin || filters.priceMax) && <Chip label={`${filters.priceMin ?? 0}–${filters.priceMax ?? '∞'} грн`} onClear={() => set({ min: null, max: null })} />}
              </div>
            )}

            <p className="mt-4 flex items-start gap-2 text-[13px] text-ink/55">
              <Info size={15} className="mt-0.5 shrink-0" /> {t.catalog.demoNotice}
            </p>

            {visible.length ? (
              <>
                <ul key={`${path}|${sp.toString()}|${car ? carLabel(car) : ''}`} className={`mt-5 grid gap-3 transition-opacity duration-200 ${stale ? 'opacity-50' : ''} ${view === 'grid' ? 'grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4' : 'grid-cols-1'}`}>
                  {visible.map((p, i) => (
                    <li key={p.id}>
                      <ProductCard p={p} view={view} i={i % per} />
                    </li>
                  ))}
                </ul>
                <div className="mt-10 flex flex-col items-center gap-5">
                  <p className="text-[14px] text-ink/55">{t.catalog.shown(Math.min(start + visible.length, shown.length), shown.length)}</p>
                  {start + visible.length < shown.length && (
                    <button onClick={() => setLoaded((n) => n + 1)} className="btn btn-dark min-w-[240px]">
                      {t.catalog.loadMore}
                    </button>
                  )}
                  {pages > 1 && (
                    <nav className="flex flex-wrap justify-center gap-1.5" aria-label="Pagination">
                      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          onClick={() => {
                            set({ page: n === 1 ? null : String(n) })
                            scrollToTarget(document.body, 0)
                          }}
                          aria-current={n === page ? 'page' : undefined}
                          className={`grid h-10 min-w-10 place-items-center rounded-xl px-2 text-[14px] font-semibold tabular-nums ${n === page ? 'bg-ink text-white' : 'border border-ink/12 bg-white hover:border-ink/40'}`}
                        >
                          {n}
                        </button>
                      ))}
                    </nav>
                  )}
                </div>
              </>
            ) : (
              <div className="mt-8 rounded-[24px] border border-dashed border-ink/20 bg-white p-8 text-center sm:p-12">
                <p className="font-display text-xl font-semibold uppercase tracking-tight">{t.catalog.empty}</p>
                <p className="mx-auto mt-3 max-w-md text-ink/60">{t.catalog.emptyHint}</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <a href={company.phones[0].href} className="btn btn-accent">
                    <Phone size={16} /> {company.phones[0].display}
                  </a>
                  <button onClick={() => setSp(new URLSearchParams(), { replace: true })} className="btn btn-line">
                    {t.catalog.resetAll}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* mobile filters */}
      <div onClick={() => setPanel(false)} aria-hidden="true" className={`fixed inset-0 z-[70] bg-black/50 transition-opacity duration-400 lg:hidden ${panel ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />
      <div role="dialog" aria-modal="true" aria-label={t.catalog.filters} inert={!panel} data-lenis-prevent className={`fixed inset-y-0 left-0 z-[71] flex w-[min(400px,92vw)] flex-col bg-paper transition-transform duration-500 ease-[var(--ease-out-expo)] lg:hidden ${panel ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <p className="font-display text-lg font-semibold uppercase">{t.catalog.filters}</p>
          <button onClick={() => setPanel(false)} className="icon-btn border border-ink/15" aria-label={t.common.close}>
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5">{panel && sidebar}</div>
        <div className="border-t border-ink/10 p-4">
          <button onClick={() => setPanel(false)} className="btn btn-dark w-full">
            {t.catalog.show(results.length)}
          </button>
        </div>
      </div>
    </div>
  )
}

function Chip({ label, onClear, accent }: { label: string; onClear: () => void; accent?: boolean }) {
  return (
    <button onClick={onClear} className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold ${accent ? 'bg-accent text-white' : 'bg-ink text-white'}`}>
      {label} <X size={13} />
    </button>
  )
}
