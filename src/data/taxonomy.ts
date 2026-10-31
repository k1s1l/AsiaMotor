// Catalogue tree: the 11 sections of asiamotor.com.ua. Slugs are the URL segments
// (/catalog/<cat>/<sub>), so keep them stable. Products are sorted into it by
// scripts/catalog-rules.ts when the price list is imported.
import { asset } from '../lib/asset'
import data from './catalog.json'

export interface Sub {
  slug: string
  ua: string
  ru: string
  /** illustration of the part type, used on category tiles (never as a product photo) */
  image?: string
}

export interface Cat {
  slug: string
  ua: string
  ru: string
  /** short hint under the name */
  hint: { ua: string; ru: string }
  image: string
  subs: Sub[]
}

const m = (f: string) => asset(`media/${f}.webp`)
const other = { slug: 'inshe', ua: 'Інше', ru: 'Другое' }

/** the full tree, including sections that have no products right now (used by the importer) */
export const allCategories: Cat[] = [
  {
    slug: 'kuzov',
    ua: 'Кузовні деталі',
    ru: 'Кузовные детали',
    hint: { ua: 'Бампери, крила, капоти, решітки, дзеркала', ru: 'Бамперы, крылья, капоты, решётки, зеркала' },
    image: m('cat-body'),
    subs: [
      { slug: 'bampery', ua: 'Бампери та підсилювачі', ru: 'Бамперы и усилители', image: m('p-bumper') },
      { slug: 'krylya', ua: 'Крила', ru: 'Крылья', image: m('p-fender') },
      { slug: 'kapoty', ua: 'Капоти', ru: 'Капоты', image: m('p-hood') },
      { slug: 'dveri', ua: 'Двері та деталі дверей', ru: 'Двери и детали дверей', image: m('p-door') },
      { slug: 'reshitky', ua: 'Решітки', ru: 'Решётки', image: m('p-grille') },
      { slug: 'dzerkala', ua: 'Дзеркала', ru: 'Зеркала', image: m('p-mirror') },
      { slug: 'nakladky', ua: 'Накладки, молдинги, емблеми', ru: 'Накладки, молдинги, эмблемы', image: m('p-bracket') },
      { slug: 'pidkrylky', ua: 'Підкрилки, бризковики, захист', ru: 'Подкрылки, брызговики, защита', image: m('p-fender') },
      { slug: 'kriplennia', ua: 'Кронштейни, кріплення, замки', ru: 'Кронштейны, крепления, замки', image: m('p-bracket') },
      { ...other, image: m('p-bracket') },
    ],
  },
  {
    slug: 'dvyhun',
    ua: 'Двигун',
    ru: 'Двигатель',
    hint: { ua: 'ГРМ, прокладки, сальники, опори, паливна система', ru: 'ГРМ, прокладки, сальники, опоры, топливная система' },
    image: m('cat-engine'),
    subs: [
      { slug: 'grm', ua: 'ГРМ: ремені, ланцюги, ролики', ru: 'ГРМ: ремни, цепи, ролики', image: m('p-tensioner') },
      { slug: 'prokladky', ua: 'Прокладки та сальники', ru: 'Прокладки и сальники', image: m('p-gasket') },
      { slug: 'porshneva', ua: 'Поршнева, вкладиші, колінвал', ru: 'Поршневая, вкладыши, коленвал', image: m('p-piston') },
      { slug: 'klapany', ua: 'Клапани, розподілвали, гідрокомпенсатори', ru: 'Клапаны, распредвалы, гидрокомпенсаторы', image: m('p-sprocket') },
      { slug: 'opory', ua: 'Опори двигуна', ru: 'Опоры двигателя', image: m('p-mount') },
      { slug: 'palyvna', ua: 'Паливна система', ru: 'Топливная система', image: m('p-pump') },
      { slug: 'vpusk-vypusk', ua: 'Турбіни, колектори, вихлоп', ru: 'Турбины, коллекторы, выхлоп', image: m('p-turbo') },
      { ...other, image: m('p-gasket') },
    ],
  },
  {
    slug: 'pidviska',
    ua: 'Підвіска',
    ru: 'Подвеска',
    hint: { ua: 'Амортизатори, важелі, сайлентблоки, маточини', ru: 'Амортизаторы, рычаги, сайлентблоки, ступицы' },
    image: m('cat-suspension'),
    subs: [
      { slug: 'amortyzatory', ua: 'Амортизатори, опори, відбійники', ru: 'Амортизаторы, опоры, отбойники', image: m('p-strut') },
      { slug: 'pruzhyny', ua: 'Пружини', ru: 'Пружины', image: m('p-strut') },
      { slug: 'vazheli', ua: 'Важелі', ru: 'Рычаги', image: m('p-arm') },
      { slug: 'kulovi-opory', ua: 'Кульові опори', ru: 'Шаровые опоры', image: m('p-balljoint') },
      { slug: 'saylentbloky', ua: 'Сайлентблоки та втулки', ru: 'Сайлентблоки и втулки', image: m('p-bushing') },
      { slug: 'stabilizator', ua: 'Стабілізатор: стійки, втулки', ru: 'Стабилизатор: стойки, втулки', image: m('p-link') },
      { slug: 'stupytsi', ua: 'Маточини та підшипники', ru: 'Ступицы и подшипники', image: m('p-hub') },
      { ...other, image: m('p-arm') },
    ],
  },
  {
    slug: 'kermove',
    ua: 'Рульове керування',
    ru: 'Рулевое управление',
    hint: { ua: 'Рейки, тяги, наконечники, насоси ГПК', ru: 'Рейки, тяги, наконечники, насосы ГУР' },
    image: m('cat-steering'),
    subs: [
      { slug: 'reiky', ua: 'Рульові рейки та пильовики', ru: 'Рулевые рейки и пыльники', image: m('p-rack') },
      { slug: 'tyahy', ua: 'Рульові тяги', ru: 'Рулевые тяги', image: m('p-tierod') },
      { slug: 'nakonechnyky', ua: 'Рульові наконечники', ru: 'Рулевые наконечники', image: m('p-tierod') },
      { slug: 'nasosy-gpk', ua: 'Насоси ГПК та бачки', ru: 'Насосы ГУР и бачки', image: m('p-pump') },
      { ...other, image: m('p-rack') },
    ],
  },
  {
    slug: 'halma',
    ua: 'Гальмівна система',
    ru: 'Тормозная система',
    hint: { ua: 'Колодки, диски, супорти, циліндри', ru: 'Колодки, диски, суппорты, цилиндры' },
    image: m('cat-brakes'),
    subs: [
      { slug: 'kolodky', ua: 'Гальмівні колодки', ru: 'Тормозные колодки', image: m('p-pads') },
      { slug: 'dysky', ua: 'Гальмівні диски та барабани', ru: 'Тормозные диски и барабаны', image: m('p-disc') },
      { slug: 'suporty', ua: 'Супорти та ремкомплекти', ru: 'Суппорты и ремкомплекты', image: m('p-caliper') },
      { slug: 'tsylindry', ua: 'Гальмівні циліндри та шланги', ru: 'Тормозные цилиндры и шланги', image: m('p-caliper') },
      { slug: 'trosy', ua: 'Троси ручного гальма', ru: 'Тросы ручного тормоза', image: m('p-caliper') },
      { ...other, image: m('p-disc') },
    ],
  },
  {
    slug: 'elektryka',
    ua: 'Електрика та електроніка',
    ru: 'Электрика и электроника',
    hint: { ua: 'Датчики, генератори, стартери, запалювання', ru: 'Датчики, генераторы, стартеры, зажигание' },
    image: m('cat-electrics'),
    subs: [
      { slug: 'datchyky', ua: 'Датчики', ru: 'Датчики', image: m('p-sensor') },
      { slug: 'heneratory', ua: 'Генератори та комплектуючі', ru: 'Генераторы и комплектующие', image: m('p-alternator') },
      { slug: 'startery', ua: 'Стартери та комплектуючі', ru: 'Стартеры и комплектующие', image: m('p-starter') },
      { slug: 'zapaliuvannia', ua: 'Котушки та дроти запалювання', ru: 'Катушки и провода зажигания', image: m('p-coil') },
      { slug: 'peremykachi', ua: 'Перемикачі, реле, блоки', ru: 'Переключатели, реле, блоки', image: m('p-ecu') },
      { slug: 'sklopidiomnyky', ua: 'Склопідіймачі та моторчики', ru: 'Стеклоподъёмники и моторчики', image: m('p-ecu') },
      { ...other, image: m('p-ecu') },
    ],
  },
  {
    slug: 'optyka',
    ua: 'Оптика',
    ru: 'Оптика',
    hint: { ua: 'Фари, ліхтарі, протитуманки, повторювачі', ru: 'Фары, фонари, противотуманки, повторители' },
    image: m('cat-optics'),
    subs: [
      { slug: 'fary', ua: 'Фари', ru: 'Фары', image: m('p-headlight') },
      { slug: 'lihtari', ua: 'Задні ліхтарі', ru: 'Задние фонари', image: m('p-taillight') },
      { slug: 'protytumanky', ua: 'Протитуманні фари', ru: 'Противотуманные фары', image: m('p-foglight') },
      { slug: 'povtoriuvachi', ua: 'Повторювачі, відбивачі, стоп-сигнали', ru: 'Повторители, отражатели, стоп-сигналы', image: m('p-taillight') },
      { ...other, image: m('p-headlight') },
    ],
  },
  {
    slug: 'transmisiia',
    ua: 'КПП і трансмісія',
    ru: 'КПП и трансмиссия',
    hint: { ua: 'Зчеплення, ШРУСи, приводи, деталі КПП', ru: 'Сцепление, ШРУСы, приводы, детали КПП' },
    image: m('cat-transmission'),
    subs: [
      { slug: 'zcheplennia', ua: 'Зчеплення', ru: 'Сцепление', image: m('p-clutch') },
      { slug: 'pryvody', ua: 'Приводи, ШРУСи, пильовики', ru: 'Приводы, ШРУСы, пыльники', image: m('p-cv') },
      { slug: 'kpp', ua: 'Деталі КПП', ru: 'Детали КПП', image: m('p-gears') },
      { slug: 'kardan', ua: 'Кардан, редуктор, хрестовини', ru: 'Кардан, редуктор, крестовины', image: m('p-gears') },
      { ...other, image: m('p-gears') },
    ],
  },
  {
    slug: 'okholodzhennia',
    ua: 'Охолодження та A/C',
    ru: 'Охлаждение и A/C',
    hint: { ua: 'Радіатори, помпи, термостати, кондиціонер', ru: 'Радиаторы, помпы, термостаты, кондиционер' },
    image: m('cat-cooling'),
    subs: [
      { slug: 'radiatory', ua: 'Радіатори', ru: 'Радиаторы', image: m('p-radiator') },
      { slug: 'pompy', ua: 'Помпи', ru: 'Помпы', image: m('p-pump') },
      { slug: 'termostaty', ua: 'Термостати', ru: 'Термостаты', image: m('p-thermostat') },
      { slug: 'ventyliatory', ua: 'Вентилятори', ru: 'Вентиляторы', image: m('p-fan') },
      { slug: 'patrubky', ua: 'Патрубки, бачки, кришки', ru: 'Патрубки, бачки, крышки', image: m('p-radiator') },
      { slug: 'kondytsioner', ua: 'Кондиціонер і пічка', ru: 'Кондиционер и печка', image: m('p-compressor') },
      { ...other, image: m('p-radiator') },
    ],
  },
  {
    slug: 'to',
    ua: 'Запчастини для ТО',
    ru: 'Запчасти для ТО',
    hint: { ua: 'Фільтри, свічки, ремені, щітки', ru: 'Фильтры, свечи, ремни, щётки' },
    image: m('cat-maintenance'),
    subs: [
      { slug: 'filtry-olyvni', ua: 'Оливні фільтри', ru: 'Масляные фильтры', image: m('p-oilfilter') },
      { slug: 'filtry-povitriani', ua: 'Повітряні фільтри', ru: 'Воздушные фильтры', image: m('p-airfilter') },
      { slug: 'filtry-salonu', ua: 'Фільтри салону', ru: 'Фильтры салона', image: m('p-airfilter') },
      { slug: 'filtry-palyvni', ua: 'Паливні фільтри', ru: 'Топливные фильтры', image: m('p-oilfilter') },
      { slug: 'svichky', ua: 'Свічки запалювання', ru: 'Свечи зажигания', image: m('p-sparkplug') },
      { slug: 'remeni', ua: 'Ремені навісного обладнання', ru: 'Ремни навесного оборудования', image: m('p-belt') },
      { slug: 'shchitky', ua: 'Щітки склоочисника', ru: 'Щётки стеклоочистителя', image: m('p-belt') },
      { ...other, image: m('p-oilfilter') },
    ],
  },
  {
    slug: 'ridyny',
    ua: 'Рідини та мастила',
    ru: 'Жидкости и масла',
    hint: { ua: 'Моторні оливи, антифриз, гальмівна рідина', ru: 'Моторные масла, антифриз, тормозная жидкость' },
    image: m('cat-maintenance'),
    subs: [
      { slug: 'olyvy', ua: 'Оливи', ru: 'Масла', image: m('p-oilfilter') },
      { slug: 'antyfryzy', ua: 'Антифризи', ru: 'Антифризы', image: m('p-radiator') },
      { slug: 'halmivni', ua: 'Гальмівні рідини', ru: 'Тормозные жидкости', image: m('p-caliper') },
      { slug: 'khimiia', ua: 'Мастила, автохімія, омивачі', ru: 'Смазки, автохимия, омыватели', image: m('p-oilfilter') },
    ],
  },
]

// the site shows only the sections that currently have products
const used = new Set(data.products.map((p) => `${p.cat}/${p.sub}`))
export const taxonomy: Cat[] = allCategories
  .map((c) => ({ ...c, subs: c.subs.filter((s) => used.has(`${c.slug}/${s.slug}`)) }))
  .filter((c) => c.subs.length)

export function findCat(slug?: string) {
  return taxonomy.find((c) => c.slug === slug)
}

export function findSub(cat?: Cat, slug?: string) {
  return cat?.subs.find((s) => s.slug === slug)
}
