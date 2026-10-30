import { useEffect } from 'react'
import { BASE } from './asset'

export const SITE = 'Asia Motor'
/** Production origin; used for canonical URLs and structured data. */
export const ORIGIN = 'https://k1s1l.github.io'

export interface Seo {
  title: string
  description: string
  /** path inside the app, e.g. /catalog/kuzov */
  path: string
  jsonLd?: object | object[]
  noindex?: boolean
}

function meta(sel: string, attr: string, key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(sel)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = content
}

export const absUrl = (path: string) => ORIGIN + BASE.replace(/\/$/, '') + path

/** Per-page title, description, canonical, Open Graph and JSON-LD (also written into static HTML by scripts/prerender.mjs). */
export function useSeo(s: Seo) {
  const json = JSON.stringify(s.jsonLd ?? null)
  useEffect(() => {
    document.title = s.title
    meta('meta[name="description"]', 'name', 'description', s.description)
    meta('meta[property="og:title"]', 'property', 'og:title', s.title)
    meta('meta[property="og:description"]', 'property', 'og:description', s.description)
    meta('meta[name="robots"]', 'name', 'robots', s.noindex ? 'noindex, nofollow' : 'index, follow')
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = absUrl(s.path)
    let ld = document.getElementById('ld-json') as HTMLScriptElement | null
    if (json !== 'null') {
      if (!ld) {
        ld = document.createElement('script')
        ld.type = 'application/ld+json'
        ld.id = 'ld-json'
        document.head.appendChild(ld)
      }
      ld.textContent = json
    } else ld?.remove()
  }, [s.title, s.description, s.path, s.noindex, json])
}
