// Makes and models — exactly the "make → model" groups of the store's price list
// (generated into catalog.json by scripts/import-catalog.ts). Years and engines are not part
// of the price list, so the picker asks only for the make and the model.
import data from './catalog.json'

export interface Model {
  slug: string
  name: string
}

export interface Make {
  slug: string
  name: string
  models: Model[]
}

export const makes: Make[] = data.makes

export interface Car {
  make: string
  model: string
}

export function findMake(slug?: string) {
  return makes.find((m) => m.slug === slug)
}

export function findModel(make?: Make, slug?: string) {
  return make?.models.find((m) => m.slug === slug)
}

export function isCar(v: unknown): v is Car {
  const c = v as Car
  return !!c && typeof c.make === 'string' && !!findModel(findMake(c.make), c.model)
}

export function carLabel(c: Car) {
  const mk = findMake(c.make)
  const md = findModel(mk, c.model)
  return [mk?.name, md?.name].filter(Boolean).join(' ')
}
