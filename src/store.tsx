import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getProductById } from './data/catalog'
import type { Car } from './data/vehicles'

export type Overlay = null | 'menu' | 'catalog' | 'search' | 'cart' | 'car'

interface Store {
  cart: Record<string, number>
  cartCount: number
  add: (id: string, qty?: number, from?: HTMLElement | null) => void
  setQty: (id: string, qty: number) => void
  clearCart: () => void
  car: Car | null
  setCar: (c: Car | null) => void
  recent: string[]
  viewed: (id: string) => void
  overlay: Overlay
  open: (o: Overlay) => void
  close: () => void
  toast: string | null
  notify: (msg: string) => void
}

const Ctx = createContext<Store | null>(null)

function load<T>(key: string, fallback: T, valid: (v: unknown) => boolean): T {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? 'null')
    return valid(v) ? (v as T) : fallback
  } catch {
    return fallback
  }
}
function save(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* storage unavailable */
  }
}

/** Flies a copy of the product image into the header cart icon. */
function flyToCart(from: HTMLElement | null | undefined) {
  if (!from || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const target = document.querySelector('[data-cart-target]')
  const img = from.querySelector('img') ?? (from.closest('[data-product]')?.querySelector('img') as HTMLImageElement | null)
  if (!target || !img) return
  const a = img.getBoundingClientRect()
  const b = target.getBoundingClientRect()
  const ghost = img.cloneNode() as HTMLImageElement
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${a.left}px`,
    top: `${a.top}px`,
    width: `${a.width}px`,
    height: `${a.height}px`,
    borderRadius: '16px',
    zIndex: '120',
    pointerEvents: 'none',
    objectFit: 'cover',
    transition: 'transform .75s cubic-bezier(.5,-0.3,.6,1), opacity .75s ease-in',
  })
  document.body.appendChild(ghost)
  const dx = b.left + b.width / 2 - (a.left + a.width / 2)
  const dy = b.top + b.height / 2 - (a.top + a.height / 2)
  requestAnimationFrame(() => {
    ghost.style.transform = `translate(${dx}px, ${dy}px) scale(${Math.max(0.06, 28 / a.width)})`
    ghost.style.opacity = '0.4'
  })
  setTimeout(() => ghost.remove(), 800)
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Record<string, number>>(() =>
    load('am-cart', {}, (v) => !!v && typeof v === 'object' && Object.entries(v as object).every(([id, q]) => getProductById(id) && typeof q === 'number')),
  )
  const [car, setCarState] = useState<Car | null>(() => load('am-car', null, (v) => !!v && typeof (v as Car).make === 'string'))
  const [recent, setRecent] = useState<string[]>(() => load('am-recent', [], (v) => Array.isArray(v)))
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [toast, setToast] = useState<string | null>(null)
  const timer = useRef(0)

  useEffect(() => save('am-cart', cart), [cart])
  useEffect(() => save('am-car', car), [car])
  useEffect(() => save('am-recent', recent), [recent])

  const notify = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  const value = useMemo<Store>(
    () => ({
      cart,
      cartCount: Object.values(cart).reduce((a, b) => a + b, 0),
      add: (id, qty = 1, from) => {
        flyToCart(from)
        setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + qty }))
      },
      setQty: (id, qty) =>
        setCart((c) => {
          const next = { ...c }
          if (qty <= 0) delete next[id]
          else next[id] = Math.min(99, qty)
          return next
        }),
      clearCart: () => setCart({}),
      car,
      setCar: setCarState,
      recent,
      viewed: (id) => setRecent((r) => [id, ...r.filter((x) => x !== id)].slice(0, 12)),
      overlay,
      open: setOverlay,
      close: () => setOverlay(null),
      toast,
      notify,
    }),
    [cart, car, recent, overlay, toast, notify],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('StoreProvider missing')
  return s
}
