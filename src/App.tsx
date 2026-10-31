import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { Overlays } from './components/Overlays'
import { HomePage } from './pages/Home'
import { CatalogPage } from './pages/Catalog'
import { ProductPage } from './pages/Product'
import { CartPage, CheckoutPage } from './pages/Cart'
import { CarsPage } from './pages/Cars'
import { ContactsPage, DeliveryPage } from './pages/Info'
import { NotFound } from './pages/NotFound'
import { ScrollTrigger, scrollToTop, startSmoothScroll } from './lib/motion'
import { useI18n } from './i18n'

export default function App() {
  const { t, lang } = useI18n()
  const { pathname } = useLocation()
  useEffect(() => {
    startSmoothScroll()
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)
    document.fonts?.ready.then(refresh)
    return () => window.removeEventListener('load', refresh)
  }, [])
  // new page: start at the top and re-measure scroll animations
  useEffect(() => {
    scrollToTop()
    const id = setTimeout(() => ScrollTrigger.refresh(), 150)
    return () => clearTimeout(id)
  }, [pathname, lang])

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-ink">
        {t.nav.catalog}
      </a>
      <Header />
      <main id="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/catalog/:cat" element={<CatalogPage />} />
          <Route path="/catalog/:cat/:sub" element={<CatalogPage />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/cars/:make" element={<CarsPage />} />
          <Route path="/cars/:make/:model" element={<CarsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/delivery" element={<DeliveryPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <Overlays />
    </>
  )
}
