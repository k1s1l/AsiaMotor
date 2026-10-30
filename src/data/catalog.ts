// Product catalogue.
//
// Two kinds of products live here:
//  - source 'asiamotor': real listings found on asiamotor.com.ua (name, article, price as published there);
//  - source 'demo': a generated sample assortment so the catalogue UI can be evaluated at realistic size.
//    Demo items have DEMO articles, demo prices and demo stock, and are labelled "Демо" everywhere.
// In production all of this is replaced by the store database (see spec/04-architecture.md).
import { taxonomy, type Cat, type Sub } from './taxonomy'
import { makes, findMake, findModel, type Car } from './vehicles'
import { asset } from '../lib/asset'

export type Lang = 'ua' | 'ru'
type L = { ua: string; ru: string }

export interface Compat {
  make: string
  model: string
  /** omitted = years not specified by the source */
  years?: [number, number]
  /** omitted = all engines / not specified */
  engines?: string[]
}

export type Stock = 'in' | 'low' | 'order' | 'ask'

export interface Product {
  id: string
  slug: string
  source: 'asiamotor' | 'demo'
  name: L
  article: string
  manufacturer: string
  quality: 'original' | 'aftermarket' | 'unknown'
  cat: string
  sub: string
  price: number
  currency: 'UAH' | 'USD'
  oldPrice?: number
  stock: Stock
  /** delivery time for "order" items, days */
  lead?: [number, number]
  popularity: number
  added: string
  compat: Compat[]
  images: string[]
  specs: { k: L; v: L }[]
  description: L
  /** page on the current store, for real listings */
  url?: string
}

// ------------------------------------------------------------------ helpers
export const norm = (s: string) => s.toLowerCase().replace(/[\s\-_.()]/g, '')

const translit: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', ы: 'y', э: 'e', ё: 'e', ъ: '',
}
export function slugify(s: string) {
  return s
    .toLowerCase()
    .split('')
    .map((ch) => translit[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** deterministic pseudo-random in [0,1) */
function rnd(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

const sub = (cat: string, s: string): [Cat, Sub] => {
  const c = taxonomy.find((x) => x.slug === cat)!
  return [c, c.subs.find((x) => x.slug === s)!]
}
const img = (cat: string, s: string) => sub(cat, s)[1].image ?? sub(cat, s)[0].image
const same = (s: string): L => ({ ua: s, ru: s })

// ------------------------------------------------------------------ real listings (asiamotor.com.ua)
const REAL_NOTE: L = {
  ua: 'Позиція з каталогу asiamotor.com.ua. Ціна — як опубліковано на сайті магазину; актуальну ціну, наявність і точну сумісність уточнюйте в менеджера за VIN-кодом.',
  ru: 'Позиция из каталога asiamotor.com.ua. Цена — как опубликована на сайте магазина; актуальную цену, наличие и точную совместимость уточняйте у менеджера по VIN-коду.',
}

const real: Omit<Product, 'slug' | 'source' | 'popularity' | 'added' | 'description' | 'specs' | 'stock'>[] = [
  {
    id: 'am-1016050468',
    name: same('Генератор Geely EC8 X7 1016050468 Джилі Х7'),
    article: '1016050468',
    manufacturer: '—',
    quality: 'unknown',
    cat: 'elektryka',
    sub: 'heneratory',
    price: 4700,
    currency: 'UAH',
    compat: [{ make: 'geely', model: 'ec8' }, { make: 'geely', model: 'emgrand-x7' }],
    images: [asset('media/p-alternator.webp')],
    url: 'https://asiamotor.com.ua/elektrika-i-elektronika/generator-starter/generator-geely-x7-1016050468',
  },
  {
    id: 'am-3708010-e00',
    name: same('Стартер 491Q Great Wall Safe 3708010-E00 Оригінал Сафе'),
    article: '3708010-E00',
    manufacturer: 'Great Wall',
    quality: 'original',
    cat: 'elektryka',
    sub: 'startery',
    price: 3760,
    currency: 'UAH',
    compat: [{ make: 'great-wall', model: 'safe' }],
    images: [asset('media/p-starter.webp')],
    url: 'https://asiamotor.com.ua/elektrika-i-elektronika/generator-starter/starter-491q-great-wall-safe-3708010-e00-original',
  },
  {
    id: 'am-1086000796',
    name: same('Датчик колінвалу Geely X7 2.4 1086000796'),
    article: '1086000796',
    manufacturer: '—',
    quality: 'unknown',
    cat: 'elektryka',
    sub: 'datchyky',
    price: 329,
    currency: 'UAH',
    compat: [{ make: 'geely', model: 'emgrand-x7', engines: ['2.4'] }],
    images: [asset('media/p-sensor.webp')],
    url: 'https://asiamotor.com.ua/elektrika-i-elektronika/datchiki/datchik-kolenvala-geely-x7-24-1086000796',
  },
  {
    id: 'am-1016050429',
    name: same('Гідронатягувач ланцюга ГРМ (4G20, 4G24) Emgrand EX7 1016050429'),
    article: '1016050429',
    manufacturer: '—',
    quality: 'unknown',
    cat: 'dvyhun',
    sub: 'grm',
    price: 1309,
    currency: 'UAH',
    compat: [{ make: 'geely', model: 'emgrand-ex7', engines: ['2.0', '2.4'] }],
    images: [asset('media/p-tensioner.webp')],
    url: 'https://asiamotor.com.ua/zapchasti-dlya-to/',
  },
  {
    id: 'am-1016050417',
    name: same('Зірка ланцюга колінвала ГРМ (4G20) Emgrand EX7 1016050417'),
    article: '1016050417',
    manufacturer: '—',
    quality: 'unknown',
    cat: 'dvyhun',
    sub: 'grm',
    price: 467.5,
    currency: 'UAH',
    compat: [{ make: 'geely', model: 'emgrand-ex7', engines: ['2.0'] }],
    images: [asset('media/p-sprocket.webp')],
    url: 'https://asiamotor.com.ua/zapchasti-dlya-to/',
  },
  {
    id: 'am-8402120xst01a',
    name: same('Капот Jolion 8402120XST01A'),
    article: '8402120XST01A',
    manufacturer: '—',
    quality: 'unknown',
    cat: 'kuzov',
    sub: 'kapoty',
    price: 25850,
    currency: 'UAH',
    compat: [{ make: 'haval', model: 'jolion' }],
    images: [asset('media/p-hood.webp')],
    url: 'https://asiamotor.com.ua/kuzovye-detali/kapot-bagazhnik/kapot-jolion-8402120xst01a',
  },
  {
    id: 'am-106200259102',
    name: same('Капот Geely Emgrand EC7 106200259102'),
    article: '106200259102',
    manufacturer: '—',
    quality: 'unknown',
    cat: 'kuzov',
    sub: 'kapoty',
    price: 6580,
    currency: 'UAH',
    compat: [{ make: 'geely', model: 'emgrand-ec7' }],
    images: [asset('media/p-hood.webp')],
    url: 'https://asiamotor.com.ua/kuzovye-detali/kapot-bagazhnik/kapot-geely-emgrand-ec7-106200259102',
  },
  {
    id: 'am-s21-8402010-dy',
    name: same('Капот Chery Jaggi S21-8402010-DY'),
    article: 'S21-8402010-DY',
    manufacturer: '—',
    quality: 'unknown',
    cat: 'kuzov',
    sub: 'kapoty',
    price: 5170,
    currency: 'UAH',
    compat: [{ make: 'chery', model: 'jaggi' }],
    images: [asset('media/p-hood.webp')],
    url: 'https://asiamotor.com.ua/kuzovye-detali/kapot-bagazhnik/kapot-chery-jaggi-s21-8402010-dy',
  },
  {
    id: 'am-zrd-id4-061',
    name: same('Фара ліва скло окремо ID4 Crozz ZRD-ID4-061'),
    article: 'ZRD-ID4-061',
    manufacturer: '—',
    quality: 'unknown',
    cat: 'optyka',
    sub: 'fary',
    price: 120,
    currency: 'USD',
    compat: [],
    images: [asset('media/p-headlight.webp')],
    url: 'https://asiamotor.com.ua/',
  },
]

const realProducts: Product[] = real.map((p, i) => ({
  ...p,
  slug: slugify(p.name.ua),
  source: 'asiamotor',
  stock: 'ask',
  popularity: 60 - i,
  added: '2025-01-01',
  specs: [
    { k: { ua: 'Артикул', ru: 'Артикул' }, v: same(p.article) },
    { k: { ua: 'Джерело', ru: 'Источник' }, v: same('asiamotor.com.ua') },
  ],
  description: REAL_NOTE,
}))

// ------------------------------------------------------------------ demo assortment
interface Tpl {
  cat: string
  sub: string
  name: L
  /** UAH */
  price: [number, number]
  /** variants such as sides; each becomes its own product */
  variants?: L[]
  specs?: [L, L][]
  models: number
}

const LEFT = { ua: 'ліве', ru: 'левое' }
const RIGHT = { ua: 'праве', ru: 'правое' }
const LEFT_M = { ua: 'лівий', ru: 'левый' }
const RIGHT_M = { ua: 'правий', ru: 'правый' }
const FRONT = { ua: 'передні', ru: 'передние' }
const REAR = { ua: 'задні', ru: 'задние' }

const tpls: Tpl[] = [
  { cat: 'kuzov', sub: 'krylya', name: { ua: 'Крило переднє', ru: 'Крыло переднее' }, price: [2600, 7400], variants: [LEFT, RIGHT], specs: [[{ ua: 'Матеріал', ru: 'Материал' }, { ua: 'сталь, під фарбування', ru: 'сталь, под покраску' }]], models: 4 },
  { cat: 'kuzov', sub: 'bampery', name: { ua: 'Бампер передній', ru: 'Бампер передний' }, price: [3900, 9800], specs: [[{ ua: 'Матеріал', ru: 'Материал' }, { ua: 'пластик, під фарбування', ru: 'пластик, под покраску' }]], models: 4 },
  { cat: 'kuzov', sub: 'bampery', name: { ua: 'Бампер задній', ru: 'Бампер задний' }, price: [3600, 8900], models: 3 },
  { cat: 'kuzov', sub: 'kapoty', name: { ua: 'Капот', ru: 'Капот' }, price: [5200, 14800], models: 3 },
  { cat: 'kuzov', sub: 'dveri', name: { ua: 'Двері передні', ru: 'Дверь передняя' }, price: [6800, 16500], variants: [{ ua: 'ліві', ru: 'левая' }, { ua: 'праві', ru: 'правая' }], models: 2 },
  { cat: 'kuzov', sub: 'reshitky', name: { ua: 'Решітка радіатора', ru: 'Решётка радиатора' }, price: [1400, 4600], models: 4 },
  { cat: 'kuzov', sub: 'dzerkala', name: { ua: 'Дзеркало бокове з підігрівом', ru: 'Зеркало боковое с подогревом' }, price: [1900, 5200], variants: [LEFT, RIGHT], models: 3 },
  { cat: 'kuzov', sub: 'kriplennia', name: { ua: 'Кронштейн переднього бампера', ru: 'Кронштейн переднего бампера' }, price: [180, 640], models: 4 },
  { cat: 'kuzov', sub: 'pidkrylky', name: { ua: 'Підкрилок передній', ru: 'Подкрылок передний' }, price: [420, 1150], variants: [LEFT_M, RIGHT_M], models: 3 },
  { cat: 'dvyhun', sub: 'porshni', name: { ua: 'Комплект поршневих кілець STD', ru: 'Комплект поршневых колец STD' }, price: [1350, 3400], models: 4 },
  { cat: 'dvyhun', sub: 'prokladky', name: { ua: 'Прокладка головки блоку циліндрів', ru: 'Прокладка головки блока цилиндров' }, price: [520, 1900], models: 5 },
  { cat: 'dvyhun', sub: 'prokladky', name: { ua: 'Сальник колінвала передній', ru: 'Сальник коленвала передний' }, price: [140, 420], models: 4 },
  { cat: 'dvyhun', sub: 'grm', name: { ua: 'Комплект ГРМ (ремінь + ролики)', ru: 'Комплект ГРМ (ремень + ролики)' }, price: [1600, 4300], models: 4 },
  { cat: 'dvyhun', sub: 'pompy', name: { ua: 'Помпа водяна', ru: 'Помпа водяная' }, price: [950, 2900], models: 5 },
  { cat: 'dvyhun', sub: 'opory', name: { ua: 'Опора двигуна права', ru: 'Опора двигателя правая' }, price: [780, 2400], models: 4 },
  { cat: 'dvyhun', sub: 'turbo', name: { ua: 'Патрубок інтеркулера', ru: 'Патрубок интеркулера' }, price: [650, 1900], models: 3 },
  { cat: 'pidviska', sub: 'amortyzatory', name: { ua: 'Амортизатор передній газовий', ru: 'Амортизатор передний газовый' }, price: [1500, 3800], variants: [LEFT_M, RIGHT_M], models: 4 },
  { cat: 'pidviska', sub: 'amortyzatory', name: { ua: 'Амортизатор задній газовий', ru: 'Амортизатор задний газовый' }, price: [1200, 3200], models: 4 },
  { cat: 'pidviska', sub: 'pruzhyny', name: { ua: 'Пружина передньої підвіски', ru: 'Пружина передней подвески' }, price: [700, 1800], models: 3 },
  { cat: 'pidviska', sub: 'vazheli', name: { ua: 'Важіль передній нижній', ru: 'Рычаг передний нижний' }, price: [1300, 3600], variants: [LEFT_M, RIGHT_M], models: 4 },
  { cat: 'pidviska', sub: 'kulovi-opory', name: { ua: 'Кульова опора', ru: 'Шаровая опора' }, price: [380, 1100], models: 5 },
  { cat: 'pidviska', sub: 'saylentbloky', name: { ua: 'Сайлентблок переднього важеля', ru: 'Сайлентблок переднего рычага' }, price: [160, 520], models: 5 },
  { cat: 'pidviska', sub: 'stabilizator', name: { ua: 'Стійка стабілізатора передня', ru: 'Стойка стабилизатора передняя' }, price: [260, 780], models: 5 },
  { cat: 'pidviska', sub: 'stupytsi', name: { ua: 'Маточина передня з підшипником', ru: 'Ступица передняя с подшипником' }, price: [1400, 3900], models: 4 },
  { cat: 'kermove', sub: 'tyahy', name: { ua: 'Рульова тяга', ru: 'Рулевая тяга' }, price: [420, 1200], models: 5 },
  { cat: 'kermove', sub: 'nakonechnyky', name: { ua: 'Наконечник рульової тяги', ru: 'Наконечник рулевой тяги' }, price: [280, 840], variants: [LEFT_M, RIGHT_M], models: 4 },
  { cat: 'kermove', sub: 'reiky', name: { ua: 'Рульова рейка в зборі', ru: 'Рулевая рейка в сборе' }, price: [7800, 19500], models: 3 },
  { cat: 'kermove', sub: 'nasosy-gpk', name: { ua: 'Насос гідропідсилювача керма', ru: 'Насос гидроусилителя руля' }, price: [2600, 6200], models: 3 },
  { cat: 'halma', sub: 'dysky', name: { ua: 'Диск гальмівний передній (пара)', ru: 'Диск тормозной передний (пара)' }, price: [1500, 4200], specs: [[{ ua: 'Тип', ru: 'Тип' }, { ua: 'вентильований', ru: 'вентилируемый' }]], models: 5 },
  { cat: 'halma', sub: 'dysky', name: { ua: 'Диск гальмівний задній (пара)', ru: 'Диск тормозной задний (пара)' }, price: [1200, 3300], models: 4 },
  { cat: 'halma', sub: 'kolodky', name: { ua: 'Колодки гальмівні', ru: 'Колодки тормозные' }, price: [520, 1700], variants: [FRONT, REAR], models: 5 },
  { cat: 'halma', sub: 'suporty', name: { ua: 'Супорт гальмівний передній', ru: 'Суппорт тормозной передний' }, price: [2400, 5600], variants: [LEFT_M, RIGHT_M], models: 3 },
  { cat: 'halma', sub: 'shlanhy', name: { ua: 'Шланг гальмівний передній', ru: 'Шланг тормозной передний' }, price: [240, 680], models: 4 },
  { cat: 'elektryka', sub: 'heneratory', name: { ua: 'Генератор', ru: 'Генератор' }, price: [4200, 9800], models: 3 },
  { cat: 'elektryka', sub: 'startery', name: { ua: 'Стартер', ru: 'Стартер' }, price: [3300, 7400], models: 3 },
  { cat: 'elektryka', sub: 'datchyky', name: { ua: 'Датчик ABS передній', ru: 'Датчик ABS передний' }, price: [420, 1350], variants: [LEFT_M, RIGHT_M], models: 3 },
  { cat: 'elektryka', sub: 'datchyky', name: { ua: 'Лямбда-зонд', ru: 'Лямбда-зонд' }, price: [980, 2700], models: 4 },
  { cat: 'elektryka', sub: 'bloky', name: { ua: 'Блок керування склопідіймачами', ru: 'Блок управления стеклоподъёмниками' }, price: [900, 2800], models: 3 },
  { cat: 'elektryka', sub: 'provodka', name: { ua: 'Котушка запалювання', ru: 'Катушка зажигания' }, price: [650, 1900], models: 5 },
  { cat: 'optyka', sub: 'fary', name: { ua: 'Фара передня', ru: 'Фара передняя' }, price: [3900, 14500], variants: [{ ua: 'ліва', ru: 'левая' }, { ua: 'права', ru: 'правая' }], models: 4 },
  { cat: 'optyka', sub: 'lihtari', name: { ua: 'Ліхтар задній', ru: 'Фонарь задний' }, price: [1700, 5900], variants: [{ ua: 'лівий', ru: 'левый' }, { ua: 'правий', ru: 'правый' }], models: 4 },
  { cat: 'optyka', sub: 'protytumanky', name: { ua: 'Фара протитуманна', ru: 'Фара противотуманная' }, price: [780, 2300], models: 4 },
  { cat: 'transmisiia', sub: 'kpp', name: { ua: 'Підшипник вторинного вала КПП', ru: 'Подшипник вторичного вала КПП' }, price: [480, 1450], models: 3 },
  { cat: 'transmisiia', sub: 'zcheplennia', name: { ua: 'Комплект зчеплення (кошик + диск + вижимний)', ru: 'Комплект сцепления (корзина + диск + выжимной)' }, price: [3200, 7900], models: 5 },
  { cat: 'transmisiia', sub: 'pryvody', name: { ua: 'Привід передній у зборі', ru: 'Привод передний в сборе' }, price: [3100, 7600], variants: [LEFT_M, RIGHT_M], models: 3 },
  { cat: 'transmisiia', sub: 'pryvody', name: { ua: 'ШРУС зовнішній', ru: 'ШРУС наружный' }, price: [950, 2600], models: 4 },
  { cat: 'okholodzhennia', sub: 'radiatory', name: { ua: 'Радіатор охолодження двигуна', ru: 'Радиатор охлаждения двигателя' }, price: [2300, 6400], models: 5 },
  { cat: 'okholodzhennia', sub: 'ventyliatory', name: { ua: 'Вентилятор радіатора в зборі', ru: 'Вентилятор радиатора в сборе' }, price: [2200, 5800], models: 3 },
  { cat: 'okholodzhennia', sub: 'termostaty', name: { ua: 'Термостат', ru: 'Термостат' }, price: [380, 1250], models: 5 },
  { cat: 'okholodzhennia', sub: 'kondytsioner', name: { ua: 'Компресор кондиціонера', ru: 'Компрессор кондиционера' }, price: [7900, 18500], models: 3 },
  { cat: 'to', sub: 'filtry-olyvni', name: { ua: 'Фільтр оливний', ru: 'Фильтр масляный' }, price: [120, 390], models: 6 },
  { cat: 'to', sub: 'filtry-povitriani', name: { ua: 'Фільтр повітряний', ru: 'Фильтр воздушный' }, price: [180, 560], models: 6 },
  { cat: 'to', sub: 'filtry-salonu', name: { ua: 'Фільтр салону вугільний', ru: 'Фильтр салона угольный' }, price: [190, 520], models: 5 },
  { cat: 'to', sub: 'svichky', name: { ua: 'Свічка запалювання (1 шт.)', ru: 'Свеча зажигания (1 шт.)' }, price: [110, 420], models: 6 },
  { cat: 'to', sub: 'remeni', name: { ua: 'Ремінь генератора поліклиновий', ru: 'Ремень генератора поликлиновой' }, price: [260, 780], models: 5 },
  { cat: 'vykhlop', sub: 'hlushnyky', name: { ua: 'Глушник основний', ru: 'Глушитель основной' }, price: [1800, 4900], models: 3 },
  { cat: 'vykhlop', sub: 'hofry', name: { ua: 'Гофра глушника 50×200', ru: 'Гофра глушителя 50×200' }, price: [220, 560], models: 4 },
]

const allModels = makes.flatMap((mk) => mk.models.map((md) => ({ mk, md })))
const MAKERS = ['DEMO-A', 'DEMO-B', 'DEMO-C']
const PRIORITY = ['haval/h6', 'haval/jolion', 'chery/tiggo-7']

function demoProducts(): Product[] {
  const out: Product[] = []
  let seed = 1
  tpls.forEach((t, ti) => {
    // pick a stable, varied set of models for this part type
    // the most requested models always get the core body, optics, chassis and service parts
    const picks = new Set<number>()
    if (/kuzov|optyka|pidviska|halma|to/.test(t.cat)) for (const key of PRIORITY.slice(0, Math.min(t.models - 1, 3))) picks.add(allModels.findIndex(({ mk, md }) => `${mk.slug}/${md.slug}` === key))
    for (let k = 0; picks.size < Math.min(t.models, allModels.length); k++) picks.add(Math.floor(rnd(ti * 31 + k * 7) * allModels.length))
    for (const mi of picks) {
      const { mk, md } = allModels[mi]
      // split long production runs into two "generations" so year filtering is meaningful
      const span = md.years[1] - md.years[0]
      const gen = span > 8 && rnd(seed) > 0.5
      const mid = md.years[0] + Math.floor(span / 2)
      const years: [number, number] = gen ? (rnd(seed + 1) > 0.5 ? [md.years[0], mid] : [mid + 1, md.years[1]]) : md.years
      const engines = /dvyhun|to|elektryka/.test(t.cat) && md.engines.length > 1 && rnd(seed + 2) > 0.5 ? [md.engines[Math.floor(rnd(seed + 3) * md.engines.length)]] : undefined
      for (const v of t.variants ?? [null]) {
        seed += 5
        const original = rnd(seed) > 0.62
        const base = t.price[0] + rnd(seed + 1) * (t.price[1] - t.price[0])
        const price = Math.round((original ? base * 1.35 : base) / 10) * 10 - (rnd(seed + 9) > 0.5 ? 1 : 0)
        const st = rnd(seed + 2)
        const stock: Stock = st < 0.58 ? 'in' : st < 0.72 ? 'low' : 'order'
        const yearsTxt = `${years[0]}–${years[1]}`
        const engTxt = engines ? ` ${engines[0]}` : ''
        const car = `${mk.name} ${md.name}${engTxt} ${yearsTxt}`
        const nameUa = `${t.name.ua}${v ? ' ' + v.ua : ''} ${car}`
        const nameRu = `${t.name.ru}${v ? ' ' + v.ru : ''} ${car}`
        const article = `DEMO-${(1000 + ((seed * 7919) % 9000)).toString()}${v ? (v.ua.startsWith('лів') ? 'L' : v.ua.startsWith('прав') ? 'R' : v.ua.startsWith('зад') ? 'B' : 'F') : ''}`
        const manufacturer = original ? `${mk.name} (OEM)` : MAKERS[Math.floor(rnd(seed + 3) * MAKERS.length)]
        const month = 1 + Math.floor(rnd(seed + 4) * 12)
        const day = 1 + Math.floor(rnd(seed + 6) * 27)
        const discount = rnd(seed + 7) > 0.9
        const [c, s] = sub(t.cat, t.sub)
        out.push({
          id: `demo-${seed}`,
          slug: slugify(`${nameUa} ${article}`),
          source: 'demo',
          name: { ua: nameUa, ru: nameRu },
          article,
          manufacturer,
          quality: original ? 'original' : 'aftermarket',
          cat: t.cat,
          sub: t.sub,
          price,
          currency: 'UAH',
          oldPrice: discount ? Math.round((price * (1.1 + rnd(seed + 8) * 0.12)) / 10) * 10 : undefined,
          stock,
          lead: stock === 'order' ? (rnd(seed + 5) > 0.5 ? [3, 7] : [14, 21]) : undefined,
          popularity: Math.round(rnd(seed + 10) * 100),
          added: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          compat: [{ make: mk.slug, model: md.slug, years, engines }],
          images: [img(t.cat, t.sub), c.image],
          specs: [
            ...(v ? [{ k: { ua: 'Сторона / вісь', ru: 'Сторона / ось' }, v }] : []),
            ...(t.specs ?? []).map(([k, val]) => ({ k, v: val })),
            { k: { ua: 'Тип', ru: 'Тип' }, v: original ? { ua: 'оригінал (OEM)', ru: 'оригинал (OEM)' } : { ua: 'аналог', ru: 'аналог' } },
            { k: { ua: 'Категорія', ru: 'Категория' }, v: { ua: `${c.ua} / ${s.ua}`, ru: `${c.ru} / ${s.ru}` } },
          ],
          description: {
            ua: `${t.name.ua}${v ? ' ' + v.ua : ''} для ${mk.name} ${md.name} ${yearsTxt}${engTxt}. ${original ? 'Оригінальна деталь.' : 'Якісний аналог оригінальної деталі.'} Перед замовленням звірте сумісність за VIN-кодом — менеджер перевірить безкоштовно.`,
            ru: `${t.name.ru}${v ? ' ' + v.ru : ''} для ${mk.name} ${md.name} ${yearsTxt}${engTxt}. ${original ? 'Оригинальная деталь.' : 'Качественный аналог оригинальной детали.'} Перед заказом сверьте совместимость по VIN-коду — менеджер проверит бесплатно.`,
          },
        })
      }
    }
  })
  return out
}

export const products: Product[] = [...realProducts, ...demoProducts()]

const bySlug = new Map(products.map((p) => [p.slug, p]))
const byId = new Map(products.map((p) => [p.id, p]))
export const getProduct = (slug: string) => bySlug.get(slug)
export const getProductById = (id: string) => byId.get(id)

// ------------------------------------------------------------------ compatibility
export type Fit = 'yes' | 'maybe' | 'no'

/** Does the product fit the car? 'maybe' = same model, but the source does not specify years/engines. */
export function fit(p: Product, car: Car): Fit {
  const rows = p.compat.filter((c) => c.make === car.make && c.model === car.model)
  if (!rows.length) return 'no'
  let best: Fit = 'no'
  for (const c of rows) {
    let f: Fit = 'yes'
    if (car.year) {
      if (!c.years) f = 'maybe'
      else if (car.year < c.years[0] || car.year > c.years[1]) f = 'no'
    } else if (c.years) f = 'maybe'
    if (f !== 'no' && car.engine) {
      if (c.engines && !c.engines.includes(car.engine)) f = 'no'
      else if (!c.engines && f === 'yes') f = 'yes'
    }
    if (f === 'yes') return 'yes'
    if (f === 'maybe') best = 'maybe'
  }
  return best
}

export function compatLabel(c: Compat) {
  const mk = findMake(c.make)
  const md = findModel(mk, c.model)
  return `${mk?.name ?? c.make} ${md?.name ?? c.model}`
}

// ------------------------------------------------------------------ querying
export type Sort = 'popular' | 'price-asc' | 'price-desc' | 'new'

export interface Query {
  cat?: string
  sub?: string
  q?: string
  car?: Car | null
  /** include 'maybe' fits when a car is set */
  maker?: string[]
  quality?: string[]
  inStock?: boolean
  priceMin?: number
  priceMax?: number
  sort?: Sort
}

export function searchText(p: Product) {
  return norm([p.name.ua, p.name.ru, p.article, p.manufacturer, ...p.compat.map(compatLabel)].join(' '))
}
const haystack = new Map(products.map((p) => [p.id, searchText(p)]))

export function query(q: Query): Product[] {
  const terms = (q.q ?? '').toLowerCase().split(/\s+/).map(norm).filter(Boolean)
  let list = products.filter((p) => {
    if (q.cat && p.cat !== q.cat) return false
    if (q.sub && p.sub !== q.sub) return false
    if (q.car && fit(p, q.car) === 'no') return false
    if (q.maker?.length && !q.maker.includes(p.manufacturer)) return false
    if (q.quality?.length && !q.quality.includes(p.quality)) return false
    if (q.inStock && !(p.stock === 'in' || p.stock === 'low')) return false
    const uah = p.currency === 'UAH' ? p.price : null
    if (q.priceMin && (uah === null || uah < q.priceMin)) return false
    if (q.priceMax && (uah === null || uah > q.priceMax)) return false
    if (terms.length) {
      const h = haystack.get(p.id)!
      if (!terms.every((t) => h.includes(t))) return false
    }
    return true
  })
  const s = q.sort ?? 'popular'
  const val = (p: Product) => (p.currency === 'UAH' ? p.price : p.price * 42)
  list = [...list].sort((a, b) =>
    s === 'price-asc' ? val(a) - val(b) : s === 'price-desc' ? val(b) - val(a) : s === 'new' ? b.added.localeCompare(a.added) : b.popularity - a.popularity,
  )
  return list
}

export function similar(p: Product, n = 8) {
  return products
    .filter((x) => x.id !== p.id && x.sub === p.sub)
    .sort((a, b) => {
      const sa = a.compat.some((c) => p.compat.some((d) => d.model === c.model)) ? 1 : 0
      const sb = b.compat.some((c) => p.compat.some((d) => d.model === c.model)) ? 1 : 0
      return sb - sa || b.popularity - a.popularity
    })
    .slice(0, n)
}

export function countBy(list: Product[], key: (p: Product) => string) {
  const m = new Map<string, number>()
  for (const p of list) m.set(key(p), (m.get(key(p)) ?? 0) + 1)
  return m
}

export function formatPrice(price: number, currency: 'UAH' | 'USD' = 'UAH') {
  const n = new Intl.NumberFormat('uk-UA', { minimumFractionDigits: price % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(price)
  return currency === 'USD' ? `$${n}` : `${n} грн`
}

export const manufacturers = [...new Set(products.map((p) => p.manufacturer))].sort()
