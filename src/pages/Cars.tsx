import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useI18n } from '../i18n'
import { useStore } from '../store'
import { countBy, query } from '../data/catalog'
import { taxonomy } from '../data/taxonomy'
import { findMake, findModel, makes } from '../data/vehicles'
import { Crumbs } from '../components/shop/bits'
import { ProductRail } from '../components/shop/ProductRail'
import { CarPicker } from '../components/shop/CarPicker'
import { useSeo } from '../lib/seo'
import { NotFound } from './NotFound'

/** Landing page for a make or a model: /cars/haval, /cars/haval/h6 — real search intent "запчастини Haval H6". */
export function CarsPage() {
  const { make = '', model } = useParams()
  const { t, lang } = useI18n()
  const { setCar } = useStore()
  const nav = useNavigate()
  const mk = findMake(make)
  const md = findModel(mk, model)
  const car = mk ? { make: mk.slug, model: md?.slug ?? '' } : null
  const list = useMemo(() => (mk ? (md ? query({ car: { make: mk.slug, model: md.slug } }) : query({}).filter((p) => p.compat.some((c) => c.make === mk.slug))) : []), [mk, md])
  const cats = useMemo(() => countBy(list, (p) => p.cat), [list])
  const name = mk ? `${mk.name}${md ? ' ' + md.name : ''}` : ''
  const path = `/cars/${make}${md ? '/' + md.slug : ''}`

  useSeo({
    title: `${t.cars.title(name)} — ${lang === 'ua' ? 'купити в Україні, ціни' : 'купить в Украине, цены'} | Asia Motor`,
    description: t.cars.lead(name, list.length),
    path,
  })

  if (!mk || (model && !md)) return <NotFound />


  return (
    <div className="bg-paper pb-24 pt-[96px] text-ink lg:pt-[136px]">
      <div className="container-x">
        <Crumbs items={[{ to: '/', label: t.common.home }, { to: md ? `/cars/${mk.slug}` : undefined, label: mk.name }, ...(md ? [{ label: md.name }] : [])]} />
        <h1 className="mt-5 font-display text-[clamp(28px,4.4vw,56px)] font-semibold uppercase leading-[1] tracking-[-0.03em]">{t.cars.title(name)}</h1>
        <p className="mt-4 max-w-[62ch] text-[16px] leading-relaxed text-ink/65">{t.cars.lead(name, list.length)}</p>
        {md && <p className="mt-1 text-[14px] text-ink/50">{`${md.years[0]}–${md.years[1]} · ${md.engines.join(', ')}`}</p>}

        {!md && (
          <section className="mt-8">
            <h2 className="text-[15px] font-semibold text-ink/60">{t.cars.models}</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {mk.models.map((m) => (
                <li key={m.slug}>
                  <Link to={`/cars/${mk.slug}/${m.slug}`} className="block rounded-xl border border-ink/12 bg-white px-4 py-2.5 text-[15px] font-semibold hover:border-ink/50">
                    {mk.name} {m.name}
                    <span className="ml-2 text-[12px] font-normal text-ink/45">
                      {m.years[0]}–{m.years[1]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {md && car && (
          <div className="mt-8 rounded-[22px] border border-ink/10 bg-white p-4 sm:p-5">
            <CarPicker idPrefix="cars-car" initial={car} onSubmit={() => nav('/catalog')} />
          </div>
        )}

        <section className="mt-12">
          <h2 className="font-display text-[clamp(20px,2.2vw,28px)] font-semibold uppercase tracking-tight">{t.cars.byCategory}</h2>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {taxonomy
              .filter((c) => cats.get(c.slug))
              .map((c) => (
                <li key={c.slug}>
                  <Link to={`/catalog/${c.slug}`} onClick={() => md && setCar({ make: mk.slug, model: md.slug })} className="img-zoom group flex items-center gap-3 overflow-hidden rounded-2xl border border-ink/10 bg-white p-2 pr-4 hover:border-ink/40">
                    <span className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-ink">
                      <img src={c.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold">{c[lang]}</span>
                      <span className="text-[13px] text-ink/50">{cats.get(c.slug)}</span>
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>

        <div className="mt-16">
          <ProductRail title={t.home.popular} items={list.slice(0, 12)} />
        </div>

        <section className="mt-16">
          <h2 className="text-[15px] font-semibold text-ink/60">{t.home.brandsTitle}</h2>
          <ul className="mt-3 flex flex-wrap gap-2 text-[14px]">
            {makes.map((m) => (
              <li key={m.slug}>
                <Link to={`/cars/${m.slug}`} className={`block rounded-full px-4 py-2 ${m.slug === mk.slug ? 'bg-ink text-white' : 'border border-ink/12 hover:border-ink/50'}`}>
                  {m.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
