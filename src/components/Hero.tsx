import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ArrowDownRight, ArrowRight, ArrowUpRight, RotateCcw, Search, SkipForward } from 'lucide-react'
import { useI18n } from '../i18n'
import { gsap, reducedMotion, scrollToTarget } from '../lib/motion'
import { Split } from './Split'
import { asset } from '../lib/asset'
import { Logo } from './Logo'
import { company } from '../data/company'
import type { AssemblyScene } from '../three/assembly'

/**
 * First screen: a real-time 3D assembly of a car (three.js, see src/three/assembly.ts).
 *  - first visit in a tab: loader → full assembly → finale with headline
 *  - later visits in the same tab: the finished car straight away (with a "replay" button)
 *  - phones: lighter renderer and a shorter timeline
 *  - no WebGL2, software GPU, data saver, weak device or reduced motion: static render of the car
 * `?3d=force` skips the device check, `?3d=static` forces the fallback (handy for demos and tests).
 */
type Phase = 'loading' | 'assembling' | 'done' | 'static'
type Tier = 'high' | 'low' | 'static'

const SEEN_KEY = 'am-assembled'
const MODEL_URL = asset('models/car.glb')

function detectTier(): Tier {
  const q = new URLSearchParams(location.search).get('3d')
  if (q === 'static') return 'static'
  const mobile = window.matchMedia('(max-width: 767px), (pointer: coarse)').matches
  if (q === 'force') return mobile ? 'low' : 'high'
  if (reducedMotion()) return 'static'
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number }
  if (nav.connection?.saveData) return 'static'
  if ((nav.deviceMemory ?? 8) <= 2 || (navigator.hardwareConcurrency ?? 8) <= 2) return 'static'
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    if (!gl) return 'static'
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    if (/swiftshader|llvmpipe|software/i.test(name)) return 'static'
  } catch {
    return 'static'
  }
  return mobile ? 'low' : 'high'
}

function seen() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}
function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* storage unavailable */
  }
}

export function Hero() {
  const { t, lang } = useI18n()
  const root = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const scene = useRef<AssemblyScene | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState(-1)
  const tierRef = useRef<Tier>('high')
  const [q, setQ] = useState('')
  const nav = useNavigate()

  // boot the 3D scene (own chunk, so the rest of the page is not blocked by three.js)
  useEffect(() => {
    const tier = detectTier()
    tierRef.current = tier
    if (tier === 'static') {
      setPhase('static')
      return
    }
    let alive = true
    const repeat = seen()
    const timeout = setTimeout(() => alive && !scene.current && setPhase('static'), 25000)
    import('../three/assembly')
      .then(async ({ AssemblyScene }) => {
        if (!alive || !canvas.current) return
        const s = new AssemblyScene(canvas.current, {
          quality: tier,
          layout: () => (window.innerWidth < 768 || window.innerHeight > window.innerWidth * 1.1 ? 'tall' : 'wide'),
          onStage: (i) => setStage(i),
          onFinale: () => {
            markSeen()
            setPhase('done')
          },
        })
        await s.load(MODEL_URL, (p) => setProgress(p))
        if (!alive) return s.dispose()
        scene.current = s
        if (new URLSearchParams(location.search).has('3d')) Object.assign(window, { __assembly: s, __gsap: gsap })
        setProgress(1)
        if (repeat) {
          s.showAssembled(false)
          setPhase('done')
        } else {
          setPhase('assembling')
          s.play(tier === 'low' ? 0.72 : 1)
        }
      })
      .catch((e) => {
        console.warn('3D hero unavailable, using the static image', e)
        if (alive) setPhase('static')
      })
    return () => {
      alive = false
      clearTimeout(timeout)
      scene.current?.dispose()
      scene.current = null
    }
  }, [])

  // size, visibility and pointer parallax
  useEffect(() => {
    const el = root.current
    const c = canvas.current
    if (!el || !c) return
    const ro = new ResizeObserver(() => scene.current?.resize())
    ro.observe(c)
    const io = new IntersectionObserver(([e]) => scene.current?.setVisible(e.isIntersecting))
    io.observe(el)
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      scene.current?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1)
    }
    el.addEventListener('pointermove', onMove)
    return () => {
      ro.disconnect()
      io.disconnect()
      el.removeEventListener('pointermove', onMove)
    }
  }, [])

  // headline reveal once the car is complete, and the scroll-out choreography
  useLayoutEffect(() => {
    if (phase !== 'done' && phase !== 'static') return
    if (reducedMotion()) return
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .from('[data-hero-shade]', { autoAlpha: 0, duration: 1.6 }, 0)
        .from('[data-hero-eyebrow]', { y: 20, autoAlpha: 0, duration: 1 }, 0.2)
        .from('.hero-title .sw > span', { yPercent: 115, duration: 1.4, stagger: 0.08 }, 0.25)
        .from('[data-hero-fade]', { y: 30, autoAlpha: 0, duration: 1.2, stagger: 0.1 }, 0.7)
        .from('[data-hero-bar] > *', { y: 16, autoAlpha: 0, duration: 1, stagger: 0.08 }, 0.9)
      gsap
        .timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true } })
        .to('[data-hero-frame]', { clipPath: 'inset(6% 3% 0% 3% round 28px)', ease: 'none' }, 0)
        .to('[data-hero-copy]', { yPercent: -18, autoAlpha: 0.15, ease: 'none' }, 0)
    }, root)
    return () => ctx.revert()
  }, [phase])

  const skip = () => scene.current?.showAssembled(true)
  const replay = () => {
    setStage(-1)
    setPhase('assembling')
    scene.current?.play(tierRef.current === 'low' ? 0.72 : 1)
  }

  const showCopy = phase === 'done' || phase === 'static'
  const stages = t.hero.stages

  return (
    <section id="top" ref={root} className="relative h-[100svh] min-h-[640px] bg-ink" aria-label="Asia Motor">
      <div data-hero-frame className="absolute inset-0 overflow-hidden [clip-path:inset(0%_0%_0%_0%_round_0px)]">
        {phase === 'static' ? (
          <picture>
            <source media="(max-width: 767px)" srcSet={asset('media/car-hero-mobile.webp')} />
            <img src={asset('media/car-hero.webp')} alt="" className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
          </picture>
        ) : (
          <canvas ref={canvas} className="absolute inset-0 block h-full w-full touch-pan-y" aria-hidden="true" />
        )}
        {showCopy && (
          <div data-hero-shade className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,8,10,.88)_0%,rgba(7,8,10,.5)_34%,rgba(7,8,10,0)_58%)] max-md:bg-[linear-gradient(180deg,rgba(7,8,10,0)_0%,rgba(7,8,10,0)_38%,rgba(7,8,10,.9)_66%)]" />
            <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-ink/80 to-transparent" />
          </div>
        )}
      </div>

      {/* loader */}
      <div
        className={`absolute inset-0 z-20 grid place-items-center bg-ink transition-opacity duration-700 ${phase === 'loading' ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        role="status"
        aria-live="polite"
        aria-hidden={phase !== 'loading'}
      >
        <div className="w-[min(340px,80vw)] text-white">
          <Logo />
          <div className="mt-7 h-px bg-white/12">
            <div className="h-full origin-left bg-accent transition-transform duration-300" style={{ transform: `scaleX(${Math.max(0.04, progress)})` }} />
          </div>
          <div className="eyebrow mt-3 flex justify-between text-white/45">
            <span>{t.hero.loading}</span>
            <span className="tabular-nums">{String(Math.round(progress * 100)).padStart(3, '0')}</span>
          </div>
        </div>
      </div>

      {/* assembly HUD */}
      {phase === 'assembling' && (
        <>
          <div className="container-x absolute inset-x-0 bottom-0 z-10 pb-7 text-white">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-3 text-[14px] text-white/70">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                {t.hero.assembling}
                <span className="text-white md:hidden">· {stages[Math.max(0, Math.min(stage, stages.length - 1))]}</span>
              </p>
              <div className="flex gap-2">
                <Link to="/catalog" className="btn btn-accent min-h-[44px] px-5 text-[14px]">
                  {t.hero.toCatalog} <ArrowRight size={15} />
                </Link>
                <button onClick={skip} className="btn btn-ghost min-h-[44px] px-5 text-[14px]">
                  {t.hero.skip} <SkipForward size={15} />
                </button>
              </div>
            </div>
            <ol className="grid grid-cols-7 gap-1.5 sm:gap-3">
              {stages.map((s, i) => (
                <li key={s} className="min-w-0">
                  <span className="block h-[2px] overflow-hidden bg-white/12">
                    <span className={`block h-full origin-left bg-accent transition-transform duration-[1200ms] ease-[var(--ease-out-expo)] ${i <= stage ? 'scale-x-100' : 'scale-x-0'}`} />
                  </span>
                  <span className={`mt-2.5 hidden truncate font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors duration-500 md:block ${i === stage ? 'text-white' : i < stage ? 'text-white/45' : 'text-white/25'}`}>
                    <span className={i <= stage ? 'text-accent' : ''}>0{i + 1}</span> {s}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}

      {/* headline */}
      <div
        data-hero-copy
        className={`container-x relative z-10 flex h-full flex-col justify-end pb-24 pt-28 sm:pb-28 lg:justify-center lg:pb-16 lg:pt-24 ${showCopy ? '' : 'pointer-events-none invisible'}`}
      >
        <p data-hero-eyebrow className="eyebrow flex items-center gap-3 text-white/70">
          <span className="h-px w-10 bg-accent" />
          {t.hero.eyebrow}
        </p>
        <h1 className="hero-title display mt-6 text-[8.8vw] text-white sm:text-[clamp(40px,7vw,96px)] lg:text-[clamp(44px,4.4vw,96px)]">
          {t.hero.title.map((line, i) => (
            <Split key={line + i} text={line} className={`block ${i === 2 ? 'text-white/45' : ''}`} />
          ))}
        </h1>
        <p data-hero-fade className="mt-7 max-w-[30rem] text-[16px] leading-relaxed text-white/70 sm:text-[17px]">
          {t.hero.lead}
        </p>
        <form
          data-hero-fade
          role="search"
          className="mt-8 flex max-w-[34rem] items-center gap-2 rounded-full border border-white/20 bg-white/8 p-1.5 pl-5 backdrop-blur-md focus-within:border-white/60"
          onSubmit={(e) => {
            e.preventDefault()
            nav(q.trim() ? `/catalog?q=${encodeURIComponent(q.trim())}` : '/catalog')
          }}
        >
          <Search size={18} className="shrink-0 text-white/60" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.nav.searchPh} aria-label={t.nav.search} className="field min-w-0 py-2 text-[15px] text-white placeholder:text-white/45" />
          <button type="submit" className="btn btn-accent min-h-[44px] shrink-0 px-5 text-[14px]">
            {t.nav.search}
          </button>
        </form>
        <div data-hero-fade className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link to="/catalog" className="btn btn-ghost">
            {t.hero.ctaCatalog} <ArrowUpRight size={18} className="btn-ico" />
          </Link>
          <button className="btn btn-ghost" onClick={() => scrollToTarget('pick')}>
            {t.hero.ctaFind}
          </button>
        </div>
      </div>

      {showCopy && (
        <div data-hero-bar className="container-x absolute inset-x-0 bottom-0 z-10 grid grid-cols-[auto_1fr_auto] items-center gap-8 pb-6 text-white/60">
          <button onClick={() => scrollToTarget('pick')} className="group eyebrow flex items-center gap-3" aria-label={t.hero.scroll}>
            <span className="relative block h-10 w-px overflow-hidden bg-white/20">
              <span className="absolute inset-x-0 top-0 h-1/2 animate-[scrollcue_2.2s_cubic-bezier(.76,0,.24,1)_infinite] bg-accent" />
            </span>
            <span className="hidden sm:inline">{t.hero.scroll}</span>
            <ArrowDownRight size={14} className="transition-transform group-hover:translate-y-0.5" />
          </button>
          <p className="hidden text-center text-[13px] text-white/50 lg:block">{t.hero.caption}</p>
          <div className="col-start-3 flex items-center gap-5">
            <span className="eyebrow hidden md:block">
              {t.hero.since} · {company.city[lang]}
            </span>
            {phase === 'done' && (
              <button onClick={replay} className="icon-btn border border-white/20 text-white hover:bg-white hover:text-ink" aria-label={t.hero.replay} title={t.hero.replay}>
                <RotateCcw size={15} />
              </button>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes scrollcue{0%{transform:translateY(-100%)}60%,100%{transform:translateY(200%)}}`}</style>
    </section>
  )
}
