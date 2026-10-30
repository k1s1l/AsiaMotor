import { Link } from 'react-router'
import { useI18n } from '../i18n'
import { useSeo } from '../lib/seo'

export function NotFound() {
  const { t } = useI18n()
  useSeo({ title: `${t.notFound.title} | Asia Motor`, description: t.notFound.text, path: '/404', noindex: true })
  return (
    <div className="grid min-h-[80vh] place-items-center bg-paper px-4 pt-24 text-center text-ink">
      <div>
        <p className="font-display text-[clamp(72px,12vw,160px)] font-semibold leading-none tracking-[-0.05em] text-ink/10">404</p>
        <h1 className="mt-2 font-display text-2xl font-semibold uppercase">{t.notFound.title}</h1>
        <p className="mx-auto mt-3 max-w-sm text-ink/60">{t.notFound.text}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/catalog" className="btn btn-accent">
            {t.nav.catalog}
          </Link>
          <Link to="/" className="btn btn-line">
            {t.common.home}
          </Link>
        </div>
      </div>
    </div>
  )
}
