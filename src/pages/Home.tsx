import { useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowRight, ArrowUpRight, Mail, Phone } from 'lucide-react'
import { useI18n } from '../i18n'
import { useStore } from '../store'
import { countBy, getProductById, products, query, type Product } from '../data/catalog'
import { findCat, findSub, taxonomy } from '../data/taxonomy'
import { makes, carLabel } from '../data/vehicles'
import { company } from '../data/company'
import { Hero } from '../components/Hero'
import { CarPicker } from '../components/shop/CarPicker'
import { ProductRail } from '../components/shop/ProductRail'
import { useReveals } from '../lib/motion'
import { useSeo } from '../lib/seo'

const orgLd = {
  '@context': 'https://schema.org',
  '@type': 'AutoPartsStore',
  name: 'Asia Motor',
  description: 'Запчастини для китайських автомобілів: Haval, Chery, Geely, Great Wall, BYD, JAC та інших марок.',
  foundingDate: String(company.since),
  email: company.email,
  telephone: company.phones.map((p) => p.href.replace('tel:', '')),
  address: { '@type': 'PostalAddress', streetAddress: 'вул. Крива Бухта, 2', addressLocality: 'Запоріжжя', addressCountry: 'UA' },
}

export function HomePage() {
  const { t, lang } = useI18n()
  const { car, recent, ask } = useStore()
  const nav = useNavigate()
  const root = useRef<HTMLDivElement>(null)
  useReveals(root)
  useSeo({
    title: lang === 'ua' ? 'Asia Motor — запчастини для китайських авто: Haval, Chery, Geely | Запоріжжя' : 'Asia Motor — запчасти для китайских авто: Haval, Chery, Geely | Запорожье',
    description: t.hero.lead,
    path: '/',
    jsonLd: orgLd,
  })

  const counts = useMemo(() => countBy(products, (p) => p.cat), [])
  const forCar = useMemo(() => (car ? query({ car }).slice(0, 12) : []), [car])
  // shelves of the real assortment: the most requested part groups
  const shelves = useMemo(
    () =>
      (
        [
          ['halma', 'kolodky'],
          ['optyka', 'fary'],
          ['to', 'filtry-olyvni'],
          ['pidviska', 'amortyzatory'],
        ] as const
      ).map(([c, s]) => {
        const cat = findCat(c)!
        const sub = findSub(cat, s)!
        return { key: s, sub, to: `/catalog/${c}/${s}`, items: query({ cat: c, sub: s }).slice(0, 12) }
      }),
    [],
  )
  const recentItems = recent.map(getProductById).filter(Boolean) as Product[]

  return (
    <div ref={root}>
      <Hero />

      {/* my car */}
      <section id="pick" className="relative bg-ink py-14 text-white lg:py-20">
        <div className="container-x">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-end">
            <h2 data-reveal className="font-display text-[clamp(26px,3.4vw,44px)] font-semibold uppercase leading-[1] tracking-[-0.03em]">
              {t.home.pickTitle}
            </h2>
            <p data-reveal className="max-w-xl text-[16px] leading-relaxed text-white/65">
              {t.home.pickLead}
            </p>
          </div>
          <div data-reveal className="mt-8">
            <CarPicker dark idPrefix="home-car" onSubmit={() => nav('/catalog')} />
          </div>
          <p className="mt-4 text-[13px] text-white/45">
            {t.car.note}{' '}
            <button onClick={() => ask('vin')} className="link-u text-white/70">
              {t.car.vinTitle} →
            </button>
          </p>
        </div>
      </section>

      <div className="bg-paper text-ink">
        {/* categories */}
        <section className="container-x py-16 lg:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 data-reveal className="font-display text-[clamp(26px,3.4vw,44px)] font-semibold uppercase leading-[1] tracking-[-0.03em]">
                {t.home.catsTitle}
              </h2>
              <p data-reveal className="mt-3 text-[16px] text-ink/60">
                {t.home.catsLead(products.length)}
              </p>
            </div>
            <Link to="/catalog" className="btn btn-dark">
              {t.nav.allCats} <ArrowRight size={17} className="btn-ico" />
            </Link>
          </div>
          <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {taxonomy.map((c, i) => (
              <li key={c.slug} data-reveal data-delay={(i % 4) * 0.05} className={i === 0 ? 'sm:col-span-2 lg:col-span-1 xl:col-span-2' : ''}>
                <div className="group relative flex h-full flex-col overflow-hidden rounded-[22px] border border-ink/8 bg-white">
                  <Link to={`/catalog/${c.slug}`} className="img-zoom relative block overflow-hidden bg-ink">
                    <img src={c.image} alt="" loading="lazy" className={`w-full object-cover opacity-95 ${i === 0 ? 'aspect-[16/7] xl:aspect-[16/6.4]' : 'aspect-[16/8]'}`} />
                    <span className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
                    <span className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3 text-white">
                      <span className="font-display text-[19px] font-semibold uppercase leading-[1.05] tracking-[-0.01em]">{c[lang]}</span>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 backdrop-blur transition-all duration-500 group-hover:rotate-45 group-hover:bg-accent">
                        <ArrowUpRight size={16} />
                      </span>
                    </span>
                  </Link>
                  <div className="flex flex-1 flex-col p-4">
                    <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-[14px] text-ink/70">
                      {c.subs.slice(0, 5).map((s) => (
                        <li key={s.slug}>
                          <Link to={`/catalog/${c.slug}/${s.slug}`} className="hover:text-accent">
                            {s[lang]}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-auto pt-3 text-[13px] text-ink/45">{lang === 'ua' ? 'Позицій' : 'Позиций'}: {counts.get(c.slug) ?? 0}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="container-x space-y-20 pb-20 lg:space-y-24">
          {car && <ProductRail title={t.home.forCar(carLabel(car))} items={forCar} to="/catalog" />}
          {shelves.slice(0, 2).map((sh) => (
            <ProductRail key={sh.key} title={sh.sub[lang]} items={sh.items} to={sh.to} />
          ))}
        </div>
      </div>

      {/* how to buy + trust */}
      <section id="about" className="bg-ink py-20 text-white lg:py-28">
        <div className="container-x">
          <h2 data-reveal className="font-display text-[clamp(26px,3.4vw,44px)] font-semibold uppercase leading-[1] tracking-[-0.03em]">
            {t.home.howTitle}
          </h2>
          <ol className="mt-10 grid gap-3 md:grid-cols-3">
            {t.home.how.map((s, i) => (
              <li key={s.t} data-reveal data-delay={i * 0.08} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-6">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-accent font-display text-[17px] font-semibold">{i + 1}</span>
                <h3 className="mt-5 text-[19px] font-bold">{s.t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-white/65">{s.d}</p>
              </li>
            ))}
          </ol>

          <h2 data-reveal className="mt-20 font-display text-[clamp(22px,2.6vw,34px)] font-semibold uppercase leading-[1] tracking-[-0.02em]">
            {t.home.trustTitle}
          </h2>
          <ul className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {t.home.trust.map((it, i) => (
              <li key={it.t} data-reveal data-delay={i * 0.06} className="border-t border-white/15 pt-5">
                <p className="font-display text-[15px] font-semibold uppercase text-accent">{it.k}</p>
                <h3 className="mt-3 text-[17px] font-bold">{it.t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-white/60">{it.d}</p>
              </li>
            ))}
          </ul>
          <div className="mt-12 flex flex-wrap gap-3">
            <Link to="/delivery" className="btn btn-ghost">
              {t.nav.delivery} <ArrowRight size={16} className="btn-ico" />
            </Link>
            <Link to="/contacts" className="btn btn-ghost">
              {t.nav.contacts}
            </Link>
          </div>
        </div>
      </section>

      <div className="bg-paper py-20 text-ink lg:py-24">
        <div className="container-x space-y-20 lg:space-y-24">
          {shelves.slice(2).map((sh) => (
            <ProductRail key={sh.key} title={sh.sub[lang]} items={sh.items} to={sh.to} />
          ))}

          {/* makes & models */}
          <section>
            <h2 className="font-display text-[clamp(22px,2.6vw,34px)] font-semibold uppercase leading-none tracking-[-0.02em]">{t.home.brandsTitle}</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {makes.map((m) => (
                <li key={m.slug} className="rounded-[20px] border border-ink/10 bg-white p-5">
                  <Link to={`/cars/${m.slug}`} className="group flex items-center justify-between">
                    <span className="font-display text-[26px] font-semibold uppercase tracking-[-0.03em] group-hover:text-accent">{m.name}</span>
                    <ArrowUpRight size={18} className="text-ink/35 transition-transform group-hover:rotate-45 group-hover:text-accent" />
                  </Link>
                  <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[14px] text-ink/65">
                    {m.models.map((md) => (
                      <li key={md.slug}>
                        <Link to={`/cars/${m.slug}/${md.slug}`} className="hover:text-accent">
                          {md.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <p className="mt-4 max-w-2xl text-[13px] text-ink/50">{t.home.brandsNote}</p>
          </section>

          <ProductRail title={t.home.recent} items={recentItems} />
        </div>
      </div>

      {/* final CTA */}
      <section className="bg-accent text-white">
        <div className="container-x grid gap-8 py-16 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:py-20">
          <div>
            <h2 className="font-display text-[clamp(28px,4vw,56px)] font-semibold uppercase leading-[0.98] tracking-[-0.03em]">{t.home.ctaTitle}</h2>
            <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-white/90">{t.home.ctaLead}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <a href={company.phones[0].href} className="btn btn-dark min-h-[56px]">
              <Phone size={17} /> {t.home.ctaCall}: {company.phones[0].display}
            </a>
            <button onClick={() => ask('vin')} className="btn min-h-[56px] border border-white/60 text-white before:bg-white hover:text-ink">
              <Mail size={17} /> {t.home.ctaVin}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
