// DEMO data for the pricing console. Competitors ("Конкурент A/B/C") and their prices are fictional;
// purchase prices are sample values. Each item illustrates one case from spec/03-pricing.md.
import type { Offer, OurItem } from './engine'

const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()

export const demoItems: OurItem[] = [
  { sku: 'F-H6-L', name: 'Крило переднє ліве Haval H6 2021–2025', brand: 'Haval', article: '8403101XKZ16A', side: 'left', cost: 4800, basePrice: 6000, price: 6000, rules: { minPrice: 5800 } },
  { sku: 'am-8402120xst01a', name: 'Капот Jolion 8402120XST01A', brand: 'Haval', article: '8402120XST01A', cost: 21000, basePrice: 25850, price: 25850 },
  { sku: 'am-1016050468', name: 'Генератор Geely EC8 X7 1016050468', brand: 'Geely', article: '1016050468', cost: 3700, basePrice: 4700, price: 4700 },
  { sku: 'am-1086000796', name: 'Датчик колінвалу Geely X7 2.4 1086000796', brand: 'Geely', article: '1086000796', cost: 210, basePrice: 329, price: 329 },
  { sku: 'am-3708010-e00', name: 'Стартер 491Q Great Wall Safe 3708010-E00', brand: 'Great Wall', article: '3708010-E00', cost: 2900, basePrice: 3760, price: 3760 },
  { sku: 'P-T7-F', name: 'Колодки гальмівні передні Chery Tiggo 7', brand: 'DEMO-A', article: 'DEMO-PAD-T7F', cost: 820, basePrice: 1290, price: 1290 },
  { sku: 'S-J-L', name: 'Амортизатор передній лівий Haval Jolion', brand: 'DEMO-B', article: 'DEMO-SH-JL', side: 'left', cost: 1650, basePrice: 2390, price: 2390 },
  { sku: 'OF-H6', name: 'Фільтр оливний Haval H6 1.5T', brand: 'DEMO-C', article: 'DEMO-OF-H6', cost: 140, basePrice: 239, price: 239 },
  { sku: 'HL-T7-R', name: 'Фара передня права Chery Tiggo 7', brand: 'Chery', article: 'T15-4421020', side: 'right', cost: 7900, basePrice: 10450, price: 10450 },
  { sku: 'TH-C', name: 'Термостат Geely Coolray 1.5T', brand: 'DEMO-A', article: 'DEMO-TH-CR', cost: 420, basePrice: 690, price: 690, rules: { frozen: true } },
  { sku: 'WP-A', name: 'Помпа водяна Geely Atlas 2.4', brand: 'DEMO-B', article: 'DEMO-WP-AT', cost: 1300, basePrice: 1980, price: 1980, lastChangeAt: ago(3) },
  { sku: 'GR-H6', name: 'Решітка радіатора Haval H6 2021–2025', brand: 'Haval', article: '8401100XKZ16A', crossRefs: ['GR-H6-ALT'], cost: 2600, basePrice: 3490, price: 3490 },
  { sku: 'SP-T4', name: 'Свічка запалювання Chery Tiggo 4 1.5', brand: 'DEMO-C', article: 'DEMO-SP-T4', cost: 120, basePrice: 210, price: 210 },
  { sku: 'BLT-X60', name: 'Ремінь генератора Lifan X60 1.8', brand: 'DEMO-A', article: 'DEMO-BLT-X60', cost: 260, basePrice: 449, price: 449 },
]

export const demoOffers = (): Offer[] => {
  const o = (x: Partial<Offer> & Pick<Offer, 'competitor' | 'article' | 'price'>): Offer => ({ source: 'feed', title: '', brand: '', currency: 'UAH', inStock: true, observedAt: ago(5), ...x })
  return [
    // the brief's example
    o({ competitor: 'Конкурент A', article: '8403101XKZ16A', brand: 'Haval', side: 'left', price: 5995, title: 'Крило переднє ліве Haval H6' }),
    o({ competitor: 'Конкурент B', article: '8403101XKZ16A', brand: 'Haval', side: 'left', price: 6120, source: 'api' }),
    o({ competitor: 'Конкурент C', article: '8403101XKZ16A', brand: 'Haval', side: 'right', price: 5600, title: 'Крило переднє праве Haval H6' }),
    o({ competitor: 'Конкурент A', article: '8402120XST01A', brand: 'Haval', price: 25400 }),
    o({ competitor: 'Конкурент B', article: '8402120XST01A', brand: 'Haval', price: 25990, source: 'api' }),
    // below our floor → hold + alert
    o({ competitor: 'Конкурент A', article: '1016050468', brand: 'Geely', price: 4390 }),
    o({ competitor: 'Конкурент B', article: '1086000796', brand: 'Geely', price: 199 }),
    o({ competitor: 'Конкурент C', article: '1086000796', brand: 'Geely', price: 335, source: 'monitor' }),
    // we are already cheaper than everyone
    o({ competitor: 'Конкурент A', article: '3708010-E00', brand: 'Great Wall', price: 3790 }),
    // similar title, different article → manual review
    o({ competitor: 'Конкурент B', article: 'XB-551', brand: 'Brand X', price: 1090, title: 'Колодки гальмівні передні Chery Tiggo 7 Pro', source: 'monitor' }),
    // wrong side → rejected
    o({ competitor: 'Конкурент A', article: 'DEMO-SH-JL', brand: 'DEMO-B', side: 'right', price: 2100 }),
    // stale price
    o({ competitor: 'Конкурент C', article: 'DEMO-OF-H6', brand: 'DEMO-C', price: 189, observedAt: ago(24 * 6), source: 'csv' }),
    // competitor out of stock
    o({ competitor: 'Конкурент B', article: 'T15-4421020', brand: 'Chery', side: 'right', price: 9900, inStock: false }),
    o({ competitor: 'Конкурент A', article: 'DEMO-TH-CR', brand: 'DEMO-A', price: 610 }),
    o({ competitor: 'Конкурент B', article: 'DEMO-WP-AT', brand: 'DEMO-B', price: 1890 }),
    // confirmed cross-reference (analog)
    o({ competitor: 'Конкурент C', article: 'GR-H6-ALT', brand: 'Aftermarket', price: 3420 }),
    // one obvious price error among normal prices
    o({ competitor: 'Конкурент A', article: 'DEMO-BLT-X60', brand: 'DEMO-A', price: 439 }),
    o({ competitor: 'Конкурент B', article: 'DEMO-BLT-X60', brand: 'DEMO-A', price: 455 }),
    o({ competitor: 'Конкурент C', article: 'DEMO-BLT-X60', brand: 'DEMO-A', price: 45 }),
  ]
}

export const sampleCsv = `competitor;article;brand;title;price;in_stock;side
Прайс постачальника;8403101XKZ16A;Haval;Крило переднє ліве Haval H6;5989;1;left
Прайс постачальника;DEMO-SP-T4;DEMO-C;Свічка Tiggo 4;199;1;
Прайс постачальника;DEMO-OF-H6;DEMO-C;Фільтр оливний H6;205;1;`
