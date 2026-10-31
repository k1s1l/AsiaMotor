import { Link } from 'react-router'
import { ArrowUp, Mail, MapPin, Phone } from 'lucide-react'
import { useI18n } from '../i18n'
import { company } from '../data/company'
import { taxonomy } from '../data/taxonomy'
import { makes } from '../data/vehicles'
import { products } from '../data/catalog'

// the makes with the most parts get their own line, the rest share one
const byParts = [...makes].sort((a, b) => count(b.slug) - count(a.slug))
function count(make: string) {
  return products.filter((p) => p.compat.some((c) => c.make === make)).length
}
const topMakes = byParts.slice(0, 8)
const otherMakes = byParts.slice(8).sort((a, b) => a.name.localeCompare(b.name))
import { scrollToTarget } from '../lib/motion'
import { Logo } from './Logo'

export function Footer() {
  const { t, lang } = useI18n()
  return (
    <footer id="contacts" className="relative overflow-hidden bg-ink pt-20 text-white">
      <div className="container-x">
        <div className="grid grid-cols-2 gap-x-6 gap-y-12 border-b border-white/10 pb-14 lg:grid-cols-12">
          <div className="col-span-2 lg:col-span-4">
            <Logo />
            <p className="mt-5 max-w-xs text-[15px] leading-relaxed text-white/60">{t.footer.tagline}</p>
            <div className="mt-6 space-y-1.5">
              {company.phones.map((p) => (
                <a key={p.href} href={p.href} className="flex items-center gap-3 font-display text-[clamp(20px,2.2vw,28px)] font-semibold tracking-tight tabular-nums hover:text-accent">
                  <Phone size={17} className="text-accent" /> {p.display}
                </a>
              ))}
            </div>
            <a href={`mailto:${company.email}`} className="mt-4 flex items-center gap-3 text-[15px] text-white/75 hover:text-white">
              <Mail size={16} className="text-accent" /> {company.email}
            </a>
            <a href={company.mapUrl} target="_blank" rel="noreferrer" className="mt-2 flex items-start gap-3 text-[15px] text-white/75 hover:text-white">
              <MapPin size={16} className="mt-1 shrink-0 text-accent" /> {company.address[lang]}
            </a>
            <p className="mt-1 pl-7 text-[13px] text-white/45">{t.info.schedule}</p>
          </div>
          <nav className="lg:col-span-3" aria-label={t.footer.categories}>
            <p className="text-[13px] font-semibold uppercase tracking-wider text-white/45">{t.footer.categories}</p>
            <ul className="mt-4 space-y-2.5 text-[15px] text-white/75">
              {taxonomy.map((c) => (
                <li key={c.slug}>
                  <Link to={`/catalog/${c.slug}`} className="hover:text-white">
                    {c[lang]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav className="lg:col-span-2" aria-label={t.home.brandsTitle}>
            <p className="text-[13px] font-semibold uppercase tracking-wider text-white/45">{t.home.brandsTitle}</p>
            <ul className="mt-4 space-y-2.5 text-[15px] text-white/75">
              {topMakes.map((m) => (
                <li key={m.slug}>
                  <Link to={`/cars/${m.slug}`} className="hover:text-white">
                    {lang === 'ua' ? 'Запчастини' : 'Запчасти'} {m.name}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="mt-3 flex flex-wrap gap-x-2.5 gap-y-1 text-[13px] text-white/45">
              {otherMakes.map((m) => (
                <li key={m.slug}>
                  <Link to={`/cars/${m.slug}`} className="hover:text-white">
                    {m.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav className="col-span-2 lg:col-span-3" aria-label={t.footer.shop}>
            <p className="text-[13px] font-semibold uppercase tracking-wider text-white/45">{t.footer.shop}</p>
            <ul className="mt-4 space-y-2.5 text-[15px] text-white/75">
              <li>
                <Link to="/catalog" className="hover:text-white">
                  {t.nav.allCats}
                </Link>
              </li>
              <li>
                <Link to="/delivery" className="hover:text-white">
                  {t.nav.delivery}
                </Link>
              </li>
              <li>
                <Link to="/contacts" className="hover:text-white">
                  {t.nav.contacts}
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-white">
                  {t.nav.cart}
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="flex flex-col gap-4 py-8 text-[12.5px] leading-relaxed text-white/45 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-3xl">
            © {new Date().getFullYear()} Asia Motor · {t.footer.tagline}
            <br />
            {t.footer.model}{' '}
            <a className="link-u" href="https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept" target="_blank" rel="noreferrer">
              Car Concept
            </a>{' '}
            — Eric Chadwick, Darmstadt Graphics Group,{' '}
            <a className="link-u" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
              CC BY 4.0
            </a>
            ; {t.footer.modelChanges}
          </p>
          <button onClick={() => scrollToTarget(document.body, 0)} className="flex shrink-0 items-center gap-2 self-start text-white/70 hover:text-white">
            {t.footer.top} <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </footer>
  )
}
