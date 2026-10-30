// Catalogue tree. Slugs are the URL segments (/catalog/<cat>/<sub>), so keep them stable.
import { asset } from '../lib/asset'

export interface Sub {
  slug: string
  ua: string
  ru: string
  /** illustration used for products of this subcategory that have no own photo */
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
  /** matching section on the current asiamotor.com.ua, when known */
  legacyUrl?: string
}

const m = (f: string) => asset(`media/${f}.webp`)

export const taxonomy: Cat[] = [
  {
    slug: 'kuzov',
    ua: 'Кузовні деталі',
    ru: 'Кузовные детали',
    hint: { ua: 'Крила, бампери, капоти, дзеркала', ru: 'Крылья, бамперы, капоты, зеркала' },
    image: m('cat-body'),
    legacyUrl: 'https://asiamotor.com.ua/kuzovye-detali/',
    subs: [
      { slug: 'krylya', ua: 'Крила', ru: 'Крылья', image: m('p-fender') },
      { slug: 'bampery', ua: 'Бампери', ru: 'Бамперы', image: m('p-bumper') },
      { slug: 'kapoty', ua: 'Капоти', ru: 'Капоты', image: m('p-hood') },
      { slug: 'dveri', ua: 'Двері', ru: 'Двери', image: m('p-door') },
      { slug: 'reshitky', ua: 'Решітки радіатора', ru: 'Решётки радиатора', image: m('p-grille') },
      { slug: 'dzerkala', ua: 'Дзеркала', ru: 'Зеркала', image: m('p-mirror') },
      { slug: 'kriplennia', ua: 'Кріплення та елементи кузова', ru: 'Крепления и элементы кузова', image: m('p-bracket') },
      { slug: 'pidkrylky', ua: 'Підкрилки та захист', ru: 'Подкрылки и защита', image: m('p-fender') },
    ],
  },
  {
    slug: 'dvyhun',
    ua: 'Двигун',
    ru: 'Двигатель',
    hint: { ua: 'ГРМ, поршнева, прокладки, помпи', ru: 'ГРМ, поршневая, прокладки, помпы' },
    image: m('cat-engine'),
    legacyUrl: 'https://asiamotor.com.ua/dvigatel/',
    subs: [
      { slug: 'porshni', ua: 'Поршні та кільця', ru: 'Поршни и кольца', image: m('p-piston') },
      { slug: 'prokladky', ua: 'Прокладки та сальники', ru: 'Прокладки и сальники', image: m('p-gasket') },
      { slug: 'grm', ua: 'ГРМ: ремені, ланцюги, натягувачі', ru: 'ГРМ: ремни, цепи, натяжители', image: m('p-tensioner') },
      { slug: 'pompy', ua: 'Помпи та насоси', ru: 'Помпы и насосы', image: m('p-pump') },
      { slug: 'opory', ua: 'Опори двигуна', ru: 'Опоры двигателя', image: m('p-mount') },
      { slug: 'turbo', ua: 'Турбіни та впуск', ru: 'Турбины и впуск', image: m('p-turbo') },
    ],
  },
  {
    slug: 'pidviska',
    ua: 'Підвіска',
    ru: 'Подвеска',
    hint: { ua: 'Амортизатори, важелі, опори', ru: 'Амортизаторы, рычаги, опоры' },
    image: m('cat-suspension'),
    subs: [
      { slug: 'amortyzatory', ua: 'Амортизатори та стійки', ru: 'Амортизаторы и стойки', image: m('p-strut') },
      { slug: 'pruzhyny', ua: 'Пружини', ru: 'Пружины', image: m('p-strut') },
      { slug: 'vazheli', ua: 'Важелі', ru: 'Рычаги', image: m('p-arm') },
      { slug: 'kulovi-opory', ua: 'Кульові опори', ru: 'Шаровые опоры', image: m('p-balljoint') },
      { slug: 'saylentbloky', ua: 'Сайлентблоки', ru: 'Сайлентблоки', image: m('p-bushing') },
      { slug: 'stabilizator', ua: 'Стабілізатор і тяги', ru: 'Стабилизатор и тяги', image: m('p-link') },
      { slug: 'stupytsi', ua: 'Маточини та підшипники', ru: 'Ступицы и подшипники', image: m('p-hub') },
    ],
  },
  {
    slug: 'kermove',
    ua: 'Рульове керування',
    ru: 'Рулевое управление',
    hint: { ua: 'Тяги, наконечники, рейки', ru: 'Тяги, наконечники, рейки' },
    image: m('cat-steering'),
    subs: [
      { slug: 'tyahy', ua: 'Рульові тяги', ru: 'Рулевые тяги', image: m('p-tierod') },
      { slug: 'nakonechnyky', ua: 'Рульові наконечники', ru: 'Рулевые наконечники', image: m('p-tierod') },
      { slug: 'reiky', ua: 'Рульові рейки', ru: 'Рулевые рейки', image: m('p-rack') },
      { slug: 'nasosy-gpk', ua: 'Насоси ГПК', ru: 'Насосы ГУР', image: m('p-pump') },
    ],
  },
  {
    slug: 'halma',
    ua: 'Гальмівна система',
    ru: 'Тормозная система',
    hint: { ua: 'Диски, колодки, супорти', ru: 'Диски, колодки, суппорты' },
    image: m('cat-brakes'),
    subs: [
      { slug: 'dysky', ua: 'Гальмівні диски', ru: 'Тормозные диски', image: m('p-disc') },
      { slug: 'kolodky', ua: 'Гальмівні колодки', ru: 'Тормозные колодки', image: m('p-pads') },
      { slug: 'suporty', ua: 'Супорти', ru: 'Суппорты', image: m('p-caliper') },
      { slug: 'shlanhy', ua: 'Шланги та циліндри', ru: 'Шланги и цилиндры', image: m('p-caliper') },
    ],
  },
  {
    slug: 'elektryka',
    ua: 'Електрика та електроніка',
    ru: 'Электрика и электроника',
    hint: { ua: 'Генератори, стартери, датчики', ru: 'Генераторы, стартеры, датчики' },
    image: m('cat-electrics'),
    legacyUrl: 'https://asiamotor.com.ua/elektrika-i-elektronika/',
    subs: [
      { slug: 'heneratory', ua: 'Генератори', ru: 'Генераторы', image: m('p-alternator') },
      { slug: 'startery', ua: 'Стартери', ru: 'Стартеры', image: m('p-starter') },
      { slug: 'datchyky', ua: 'Датчики', ru: 'Датчики', image: m('p-sensor') },
      { slug: 'bloky', ua: 'Блоки керування', ru: 'Блоки управления', image: m('p-ecu') },
      { slug: 'provodka', ua: 'Проводка та котушки', ru: 'Проводка и катушки', image: m('p-coil') },
    ],
  },
  {
    slug: 'optyka',
    ua: 'Оптика',
    ru: 'Оптика',
    hint: { ua: 'Фари, ліхтарі, протитуманки', ru: 'Фары, фонари, противотуманки' },
    image: m('cat-optics'),
    subs: [
      { slug: 'fary', ua: 'Фари', ru: 'Фары', image: m('p-headlight') },
      { slug: 'lihtari', ua: 'Задні ліхтарі', ru: 'Задние фонари', image: m('p-taillight') },
      { slug: 'protytumanky', ua: 'Протитуманні фари', ru: 'Противотуманные фары', image: m('p-foglight') },
    ],
  },
  {
    slug: 'transmisiia',
    ua: 'Трансмісія',
    ru: 'Трансмиссия',
    hint: { ua: 'КПП, зчеплення, приводи', ru: 'КПП, сцепление, приводы' },
    image: m('cat-transmission'),
    subs: [
      { slug: 'kpp', ua: 'Коробки передач і деталі КПП', ru: 'Коробки передач и детали КПП', image: m('p-gears') },
      { slug: 'zcheplennia', ua: 'Зчеплення', ru: 'Сцепление', image: m('p-clutch') },
      { slug: 'pryvody', ua: 'Приводи та ШРУСи', ru: 'Приводы и ШРУСы', image: m('p-cv') },
    ],
  },
  {
    slug: 'okholodzhennia',
    ua: 'Охолодження та кондиціонер',
    ru: 'Охлаждение и кондиционер',
    hint: { ua: 'Радіатори, вентилятори, термостати', ru: 'Радиаторы, вентиляторы, термостаты' },
    image: m('cat-cooling'),
    subs: [
      { slug: 'radiatory', ua: 'Радіатори', ru: 'Радиаторы', image: m('p-radiator') },
      { slug: 'ventyliatory', ua: 'Вентилятори', ru: 'Вентиляторы', image: m('p-fan') },
      { slug: 'termostaty', ua: 'Термостати', ru: 'Термостаты', image: m('p-thermostat') },
      { slug: 'kondytsioner', ua: 'Кондиціонер', ru: 'Кондиционер', image: m('p-compressor') },
    ],
  },
  {
    slug: 'to',
    ua: 'Запчастини для ТО',
    ru: 'Запчасти для ТО',
    hint: { ua: 'Фільтри, свічки, ремені', ru: 'Фильтры, свечи, ремни' },
    image: m('cat-maintenance'),
    legacyUrl: 'https://asiamotor.com.ua/zapchasti-dlya-to/',
    subs: [
      { slug: 'filtry-olyvni', ua: 'Оливні фільтри', ru: 'Масляные фильтры', image: m('p-oilfilter') },
      { slug: 'filtry-povitriani', ua: 'Повітряні фільтри', ru: 'Воздушные фильтры', image: m('p-airfilter') },
      { slug: 'filtry-salonu', ua: 'Фільтри салону', ru: 'Фильтры салона', image: m('p-airfilter') },
      { slug: 'svichky', ua: 'Свічки запалювання', ru: 'Свечи зажигания', image: m('p-sparkplug') },
      { slug: 'remeni', ua: 'Ремені навісного обладнання', ru: 'Ремни навесного оборудования', image: m('p-belt') },
    ],
  },
  {
    slug: 'vykhlop',
    ua: 'Вихлопна система',
    ru: 'Выхлопная система',
    hint: { ua: 'Глушники, гофри, каталізатори', ru: 'Глушители, гофры, катализаторы' },
    image: m('cat-transmission'),
    subs: [
      { slug: 'hlushnyky', ua: 'Глушники', ru: 'Глушители', image: m('p-muffler') },
      { slug: 'hofry', ua: 'Гофри та хомути', ru: 'Гофры и хомуты', image: m('p-muffler') },
    ],
  },
]

export function findCat(slug?: string) {
  return taxonomy.find((c) => c.slug === slug)
}

export function findSub(cat?: Cat, slug?: string) {
  return cat?.subs.find((s) => s.slug === slug)
}
