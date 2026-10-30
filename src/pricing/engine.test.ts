// Run: npm run test:pricing
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decide, defaultRules, matchOffer, parseCsv, applyDecision, type OurItem, type Offer } from './engine.ts'

const now = '2026-10-30T12:00:00Z'
// the example from the brief: our fender 6000 UAH, competitor 5995 UAH, step 1 UAH, floor 5800 UAH
const fender: OurItem = { sku: 'F1', name: 'Крило переднє ліве Haval H6 2021', brand: 'Haval', article: '8403101XKZ16A', side: 'left', cost: 4800, basePrice: 6000, price: 6000, rules: { minPrice: 5800 } }
const offer = (o: Partial<Offer>): Offer => ({ competitor: 'Конкурент A', source: 'feed', title: 'Крило переднє ліве Haval H6', brand: 'Haval', article: '8403101XKZ16A', side: 'left', price: 5995, currency: 'UAH', inStock: true, observedAt: '2026-10-30T08:00:00Z', ...o })

test('undercuts the cheapest identical offer by the step', () => {
  const d = decide(fender, [offer({})], defaultRules, now)
  assert.equal(d.action, 'lower')
  assert.equal(d.recommended, 5994)
})

test('never goes below the floor and asks the admin', () => {
  const d = decide(fender, [offer({ price: 5700 })], defaultRules, now)
  assert.equal(d.action, 'hold-floor')
  assert.equal(d.recommended, 5800)
  assert.ok(d.alerts.includes('below-floor'))
  assert.equal(d.autoApply, false)
})

test('ignores the opposite side, out-of-stock and stale offers', () => {
  const d = decide(fender, [offer({ side: 'right', price: 5000 }), offer({ inStock: false, price: 5100 }), offer({ observedAt: '2026-10-20T08:00:00Z', price: 5200 })], defaultRules, now)
  assert.equal(d.action, 'keep')
  assert.ok(d.alerts.includes('no-valid-offers'))
})

test('treats an implausibly low price as an error', () => {
  const d = decide(fender, [offer({ price: 5995 }), offer({ competitor: 'B', price: 6050 }), offer({ competitor: 'C', price: 600 })], defaultRules, now)
  assert.equal(d.recommended, 5994)
  assert.ok(d.alerts.includes('outlier-ignored'))
})

test('similar title without the same article goes to review, never to auto pricing', () => {
  const m = matchOffer(fender, offer({ article: 'XYZ-1', brand: 'Other' }))
  assert.equal(m.kind, 'review')
  const d = decide({ ...fender }, [offer({ article: 'XYZ-1', brand: 'Other', price: 5000 })], { ...defaultRules, mode: 'auto' }, now)
  assert.ok(d.alerts.includes('needs-review'))
  assert.equal(d.autoApply, false)
})

test('confirmed cross reference counts as a valid analog', () => {
  const d = decide({ ...fender, crossRefs: ['ALT-777'] }, [offer({ article: 'ALT-777', brand: 'Aftermarket', price: 5990 })], defaultRules, now)
  assert.equal(d.recommended, 5989)
})

test('frozen and cooldown items are not changed', () => {
  assert.equal(decide({ ...fender, rules: { ...fender.rules, frozen: true } }, [offer({})], defaultRules, now).action, 'skip')
  const d = decide({ ...fender, lastChangeAt: '2026-10-30T06:00:00Z' }, [offer({})], defaultRules, now)
  assert.equal(d.action, 'skip')
  assert.ok(d.alerts.includes('cooldown'))
})

test('auto mode applies small changes only; the change is logged', () => {
  const d = decide(fender, [offer({})], { ...defaultRules, mode: 'auto' }, now)
  assert.equal(d.autoApply, true)
  const res = applyDecision(fender, d, 'auto', now)!
  assert.equal(res.item.price, 5994)
  assert.equal(res.change.from, 6000)
  assert.equal(res.change.competitorPrice, 5995)
  const big = decide(fender, [offer({ price: 5300 })], { ...defaultRules, mode: 'auto' }, now)
  assert.equal(big.autoApply, false)
})

test('raises back towards the base price when we are much cheaper', () => {
  const d = decide({ ...fender, price: 5850 }, [offer({ price: 5995 })], defaultRules, now)
  assert.equal(d.action, 'raise')
  assert.equal(d.recommended, 5994)
})

test('parses a competitor CSV price list', () => {
  const { offers, errors } = parseCsv('competitor;article;brand;title;price;in_stock;side\nShop X;8403101XKZ16A;Haval;Крило ліве;5 990;1;left\nShop X;;Haval;bad;10;1;', now)
  assert.equal(offers.length, 1)
  assert.equal(offers[0].price, 5990)
  assert.equal(offers[0].side, 'left')
  assert.equal(errors.length, 1)
})
