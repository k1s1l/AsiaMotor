// Vehicle reference for "My car", the catalogue filters and the model landing pages.
// DEMO: model years and engines are a sample reference, not the store's applicability database.
// In production this tree comes from the parts catalogue (TecDoc-like data or the supplier's API).

export interface Model {
  slug: string
  name: string
  years: [number, number]
  engines: string[]
  /** extra normalised spellings found in product names (e.g. "Geely X7" for Emgrand X7) */
  aliases?: string[]
}

export interface Make {
  slug: string
  name: string
  models: Model[]
}

export const makes: Make[] = [
  {
    slug: 'haval',
    name: 'Haval',
    models: [
      { slug: 'h6', name: 'H6', years: [2014, 2025], engines: ['1.5T', '2.0T'] },
      { slug: 'jolion', name: 'Jolion', years: [2020, 2025], engines: ['1.5T'] },
      { slug: 'h2', name: 'H2', years: [2014, 2021], engines: ['1.5T'] },
      { slug: 'dargo', name: 'Dargo', years: [2022, 2025], engines: ['2.0T'] },
    ],
  },
  {
    slug: 'chery',
    name: 'Chery',
    models: [
      { slug: 'tiggo-2', name: 'Tiggo 2', years: [2017, 2023], engines: ['1.5'] },
      { slug: 'tiggo-4', name: 'Tiggo 4', years: [2019, 2025], engines: ['1.5', '1.5T'] },
      { slug: 'tiggo-7', name: 'Tiggo 7', years: [2016, 2025], engines: ['1.5T', '2.0'] },
      { slug: 'tiggo-8', name: 'Tiggo 8', years: [2018, 2025], engines: ['1.5T', '1.6T', '2.0T'] },
      { slug: 'tiggo', name: 'Tiggo (T11)', years: [2006, 2014], engines: ['1.6', '1.8', '2.0', '2.4'] },
      { slug: 'amulet', name: 'Amulet', years: [2003, 2012], engines: ['1.6'] },
      { slug: 'jaggi', name: 'Jaggi', years: [2006, 2014], engines: ['1.3'] },
      { slug: 'elara', name: 'Elara', years: [2006, 2012], engines: ['1.5', '2.0'] },
    ],
  },
  {
    slug: 'geely',
    name: 'Geely',
    models: [
      { slug: 'coolray', name: 'Coolray', years: [2019, 2025], engines: ['1.5T'] },
      { slug: 'atlas', name: 'Atlas', years: [2016, 2024], engines: ['1.8T', '2.4'] },
      { slug: 'emgrand-ec7', name: 'Emgrand EC7', years: [2009, 2018], engines: ['1.5', '1.8'] },
      { slug: 'emgrand-x7', name: 'Emgrand X7', years: [2011, 2019], engines: ['2.0', '2.4'], aliases: ['geelyx7', 'ec8x7'] },
      { slug: 'emgrand-ex7', name: 'Emgrand EX7', years: [2011, 2019], engines: ['2.0', '2.4'] },
      { slug: 'ec8', name: 'EC8', years: [2010, 2016], engines: ['2.0', '2.4'] },
      { slug: 'ck', name: 'CK', years: [2005, 2016], engines: ['1.5'] },
      { slug: 'mk', name: 'MK', years: [2006, 2016], engines: ['1.5'] },
    ],
  },
  {
    slug: 'great-wall',
    name: 'Great Wall',
    models: [
      { slug: 'hover-h3', name: 'Hover H3', years: [2010, 2016], engines: ['2.0'] },
      { slug: 'hover-h5', name: 'Hover H5', years: [2010, 2016], engines: ['2.0', '2.4', '2.0D'] },
      { slug: 'safe', name: 'Safe', years: [2002, 2010], engines: ['2.2'] },
      { slug: 'wingle-5', name: 'Wingle 5', years: [2010, 2018], engines: ['2.2', '2.0D'] },
      { slug: 'voleex-c30', name: 'Voleex C30', years: [2010, 2016], engines: ['1.5'] },
    ],
  },
  {
    slug: 'byd',
    name: 'BYD',
    models: [
      { slug: 'f3', name: 'F3', years: [2005, 2014], engines: ['1.5', '1.6'] },
      { slug: 's6', name: 'S6', years: [2011, 2017], engines: ['2.0', '2.4'] },
      { slug: 'f0', name: 'F0', years: [2008, 2015], engines: ['1.0'] },
    ],
  },
  {
    slug: 'lifan',
    name: 'Lifan',
    models: [
      { slug: 'x60', name: 'X60', years: [2011, 2019], engines: ['1.8'] },
      { slug: '520', name: '520', years: [2006, 2012], engines: ['1.3', '1.6'] },
      { slug: 'solano', name: 'Solano', years: [2008, 2016], engines: ['1.5', '1.6'] },
    ],
  },
]

export interface Car {
  make: string
  model: string
  year?: number
  engine?: string
}

export function findMake(slug?: string) {
  return makes.find((m) => m.slug === slug)
}

export function findModel(make?: Make, slug?: string) {
  return make?.models.find((m) => m.slug === slug)
}

export function carLabel(c: Car) {
  const mk = findMake(c.make)
  const md = findModel(mk, c.model)
  return [mk?.name, md?.name, c.year, c.engine].filter(Boolean).join(' ')
}
