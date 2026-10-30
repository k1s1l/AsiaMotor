// Checks a GLB against the hero's model config: which node goes to which assembly stage,
// what is left over, size and triangle count. No dependencies: reads the glTF JSON chunk.
//   npm run model:inspect                 → the configured model (public/models/car.glb)
//   npm run model:inspect -- path/to.glb  → any other file, with the same stage rules
import { readFileSync, statSync } from 'node:fs'
import { MODEL } from '../src/three/models'

const file = process.argv[2] ?? 'public/models/car.glb'
const buf = readFileSync(file)
if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${file} is not a binary glTF (.glb)`)
const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8'))

type Node = { name?: string; mesh?: number; children?: number[] }
const nodes: Node[] = json.nodes ?? []
const tris = (mesh?: number) =>
  mesh === undefined
    ? 0
    : json.meshes[mesh].primitives.reduce((n: number, p: { indices?: number; attributes: { POSITION: number } }) => n + (p.indices !== undefined ? json.accessors[p.indices].count : json.accessors[p.attributes.POSITION].count) / 3, 0)

const stageOf = (name = '') => MODEL.stages.findIndex((s) => s.match.some((r) => r.test(name)))
/** triangles a unit carries: its subtree without the nested nodes that form units of their own */
const subtree = (i: number, top = true): number =>
  !top && stageOf(nodes[i].name) >= 0 ? 0 : tris(nodes[i].mesh) + (nodes[i].children ?? []).reduce((n, c) => n + subtree(c, false), 0)
const all = (i: number): number => tris(nodes[i].mesh) + (nodes[i].children ?? []).reduce((n, c) => n + all(c), 0)
const byStage = MODEL.stages.map(() => [] as string[])
const taken = new Set<number>()
const walk = (i: number, inUnit: boolean) => {
  const s = stageOf(nodes[i].name)
  if (s >= 0) {
    byStage[s].push(`${nodes[i].name} (${Math.round(subtree(i))} tris)`)
    inUnit = true
  }
  if (inUnit) taken.add(i)
  for (const c of nodes[i].children ?? []) walk(c, inUnit)
}
const roots: number[] = json.scenes[json.scene ?? 0].nodes
roots.forEach((r) => walk(r, false))

const total = roots.reduce((n, r) => n + all(r), 0)
console.log(`${file}: ${(statSync(file).size / 1048576).toFixed(2)} MB, ${nodes.length} nodes, ${Math.round(total)} triangles`)
console.log(`extensions: ${(json.extensionsUsed ?? []).join(', ') || 'none'}\n`)
MODEL.stages.forEach((s, i) => console.log(`${s.id.padEnd(11)} ${byStage[i].length ? byStage[i].join(', ') : '— NOTHING MATCHED'}`))
const rest = nodes.map((n, i) => ({ n, i })).filter(({ n, i }) => n.mesh !== undefined && !taken.has(i))
console.log(`\nnot matched (travel with "${MODEL.restStage}"): ${rest.length ? rest.map(({ n }) => n.name ?? '(unnamed)').join(', ') : 'none'}`)
const empty = MODEL.stages.filter((_, i) => !byStage[i].length).length
if (empty) console.log(`\n${empty} stage(s) matched nothing: adjust the regular expressions in src/three/models.ts`)
