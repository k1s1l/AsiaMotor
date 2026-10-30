// The car used by the 3D hero, described as data, so a different model (for example a licensed
// Haval H6 GLB with named parts) can be swapped in without touching the scene code.
// How to prepare and check a model: spec/06-3d-model.md, `npm run model:inspect`.
// Kept free of three.js imports: the hero reads `url` from the main bundle.
import { asset } from '../lib/asset'

/** where a unit waits in the exploded view before it travels to its place */
export type Explode =
  | 'base' // stays in place (chassis), only lifted with the whole car
  | 'brake' // slightly out to its side
  | 'up' // above its place (engine, interior)
  | 'high' // high above (body shell)
  | 'side' // out to its side; centred parts (hood) go up and forward instead
  | 'wheel' // out to the side, rolls in
  | 'ends' // out of the nearest end of the car (lamps, plate)

export interface StageDef {
  id: string
  /** node names; every matching node (with its children) becomes one moving unit */
  match: RegExp[]
  explode: Explode
  /** start time on the desktop timeline, seconds */
  at: number
}

export interface PaintDef {
  color?: string
  metalness?: number
  roughness?: number
  clearcoat?: number
  clearcoatRoughness?: number
  emissive?: string
  emissiveIntensity?: number
  /** replace the texture with the Asia Motor number plate */
  plate?: boolean
}

export interface ModelConfig {
  url: string
  credit: { title: string; author: string; license: string; href: string }
  /** the car is scaled to this length, metres */
  length: number
  /** a node at the front of the car: used to turn the model nose to +Z */
  frontNode: string
  stages: StageDef[]
  /** when the finale (lights, fly-around) starts on the desktop timeline, seconds */
  finale: number
  /** the stage that takes every node the rules did not catch */
  restStage: string
  /** material name → overrides */
  paint: Record<string, PaintDef>
  /** nodes that must not be shown (e.g. third-party emblems) */
  hide: RegExp[]
  /** material name → emissive intensity when the lights are on */
  lamps: Record<string, number>
  /** nodes of the headlights: light pools are placed in front of them */
  headlights: RegExp
}

/**
 * “Car Concept”, Khronos glTF Sample Assets (CC BY 4.0) — the only freely licensed, realistic car
 * we found with separately named parts. A Chinese crossover with the same structure is a paid
 * asset; see spec/06-3d-model.md.
 */
export const carConcept: ModelConfig = {
  url: asset('models/car.glb'),
  credit: {
    title: 'Car Concept',
    author: 'Eric Chadwick, Darmstadt Graphics Group',
    license: 'CC BY 4.0',
    href: 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept',
  },
  length: 4.6,
  frontNode: 'BodyHeadlights',
  stages: [
    { id: 'chassis', match: [/^BodyUnderside$/, /^InteriorFloor$/], explode: 'base', at: 4.3 },
    { id: 'suspension', match: [/^Axles$/, /BrakeDisc$/, /BrakePad$/], explode: 'brake', at: 5.0 },
    { id: 'engine', match: [/^Engine$/], explode: 'up', at: 5.8 },
    { id: 'cabin', match: [/^Interior(?!Door)(?!Steering(Emblem|Wheel))/], explode: 'up', at: 6.3 },
    { id: 'body', match: [/^BodyPillars$/, /^BodyPanelsColor2$/, /^BodyRoofPanel$/, /^BodyRearPanelsColor1$/, /^BodyWindshield$/, /^BodyWindshieldGasket$/], explode: 'high', at: 7.2 },
    { id: 'closures', match: [/^BodyDoor[LR]Color1$/, /^BodyHood$/], explode: 'side', at: 8.4 },
    { id: 'wheels', match: [/^Wheel(Front|Rear)[LR]$/], explode: 'wheel', at: 9.3 },
    { id: 'optics', match: [/^BodyHeadlights$/, /^BodyTaillights$/, /^BodyTurnsignalsRear$/, /^BodyTaillightsPanels$/, /^BodyWindshieldWipers(Base)?$/, /^License Plate$/], explode: 'ends', at: 10.1 },
  ],
  finale: 11.3,
  restStage: 'body',
  paint: {
    'Paint 1 Carmine': { color: '#9aa1a9', metalness: 0.85, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04 }, // titanium silver
    'Paint 2 Carmine': { color: '#16181c', metalness: 0.5, roughness: 0.32 }, // gloss graphite trim
    'Interior 3 Carmine': { color: '#7a2a14' },
    Brake: { color: '#ff4b1f', roughness: 0.35, emissive: '#000000' }, // calipers in the brand colour
    Dashboard: { emissiveIntensity: 0.25 },
    License: { plate: true, emissive: '#000000' },
  },
  hide: [/SteeringEmblem/],
  lamps: { Headlight: 1.3, Brakelight: 2.4, Signallight: 2 },
  headlights: /Headlights/,
}

export const MODEL = carConcept
