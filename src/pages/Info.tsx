import { Link } from 'react-router'
import { Mail, MapPin, MessageCircle, Phone, ScanLine } from 'lucide-react'
import { useStore } from '../store'
import { RequestForm } from '../components/forms/RequestForm'
import { useI18n } from '../i18n'
import { company } from '../data/company'
import { Crumbs } from '../components/shop/bits'
import { useSeo } from '../lib/seo'

const orgLd = {
  '@context': 'https://schema.org',
  '@type': 'AutoPartsStore',
  name: 'Asia Motor',
  foundingDate: String(company.since),
  email: company.email,
  telephone: company.phones.map((p) => p.href.replace('tel:', '')),
  address: { '@type': 'PostalAddress', streetAddress: 'вул. Крива Бухта, 2', addressLocality: 'Запоріжжя', addressCountry: 'UA' },
}

export function DeliveryPage() {
  const { t } = useI18n()
  useSeo({ title: `${t.info.deliveryTitle} | Asia Motor`, description: t.info.deliveryLead, path: '/delivery' })
  return (
    <div className="bg-paper pb-24 pt-[96px] text-ink lg:pt-[136px]">
      <div className="container-x max-w-4xl">
        <Crumbs items={[{ to: '/', label: t.common.home }, { label: t.info.deliveryTitle }]} />
        <h1 className="mt-5 font-display text-[clamp(28px,4vw,48px)] font-semibold uppercase tracking-[-0.03em]">{t.info.deliveryTitle}</h1>
        <p className="mt-4 max-w-[62ch] text-[16px] leading-relaxed text-ink/65">{t.info.deliveryLead}</p>
        <ol className="mt-10 space-y-3">
          {t.info.sections.map((s) => (
            <li key={s.t} className="rounded-[20px] border border-ink/10 bg-white p-5 sm:p-6">
              <h2 className="text-[18px] font-bold">{s.t}</h2>
              <p className="mt-2 max-w-[62ch] leading-relaxed text-ink/70">{s.d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap gap-3">
          {company.phones.map((p) => (
            <a key={p.href} href={p.href} className="btn btn-dark">
              <Phone size={16} /> {p.display}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ContactsPage() {
  const { t, lang } = useI18n()
  const { ask } = useStore()
  useSeo({ title: `${t.info.contactsTitle} | Asia Motor`, description: `${t.info.contactsLead} ${company.address[lang]}, ${company.phones.map((p) => p.display).join(', ')}`, path: '/contacts', jsonLd: orgLd })
  return (
    <div className="bg-paper pb-24 pt-[96px] text-ink lg:pt-[136px]">
      <div className="container-x max-w-4xl">
        <Crumbs items={[{ to: '/', label: t.common.home }, { label: t.info.contactsTitle }]} />
        <h1 className="mt-5 font-display text-[clamp(28px,4vw,48px)] font-semibold uppercase tracking-[-0.03em]">{t.info.contactsTitle}</h1>
        <p className="mt-4 max-w-[62ch] text-[16px] leading-relaxed text-ink/65">{t.info.contactsLead}</p>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          <section className="rounded-[20px] border border-ink/10 bg-white p-6">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink/50">{t.info.phones}</h2>
            {company.phones.map((p) => (
              <a key={p.href} href={p.href} className="mt-3 flex items-center gap-3 font-display text-[26px] font-semibold tabular-nums hover:text-accent">
                <Phone size={20} className="text-accent" /> {p.display}
              </a>
            ))}
          </section>
          <section className="rounded-[20px] border border-ink/10 bg-white p-6">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink/50">{t.info.email}</h2>
            <a href={`mailto:${company.email}`} className="mt-3 flex items-center gap-3 text-[19px] font-semibold hover:text-accent">
              <Mail size={19} className="text-accent" /> {company.email}
            </a>
            <h2 className="mt-6 text-[13px] font-semibold uppercase tracking-wider text-ink/50">{t.info.address}</h2>
            <a href={company.mapUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-start gap-3 text-[17px] font-semibold hover:text-accent">
              <MapPin size={19} className="mt-0.5 shrink-0 text-accent" /> {company.address[lang]}
            </a>
            <p className="mt-2 pl-8 text-[14px] text-ink/55">{t.info.schedule}</p>
          </section>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button onClick={() => ask('callback')} className="btn btn-dark min-h-[56px]">
            <MessageCircle size={17} /> {t.nav.callback}
          </button>
          <button onClick={() => ask('vin')} className="btn btn-line min-h-[56px]">
            <ScanLine size={17} /> {t.forms.vinTitle}
          </button>
        </div>
        <section id="feedback" className="mt-10 rounded-[22px] border border-ink/10 bg-white p-5 sm:p-8">
          <h2 className="font-display text-[clamp(20px,2.2vw,28px)] font-semibold uppercase tracking-tight">{t.forms.feedbackTitle}</h2>
          <p className="mt-2 max-w-[60ch] text-[15px] text-ink/60">{t.forms.feedbackLead}</p>
          <div className="mt-6">
            <RequestForm kind="feedback" />
          </div>
        </section>
        <Link to="/delivery" className="link-u mt-8 inline-block font-semibold">
          {t.info.deliveryTitle} →
        </Link>
      </div>
    </div>
  )
}
