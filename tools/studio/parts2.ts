// Second batch of procedural parts for catalogue packshots (one per subcategory).
// Every builder returns an object roughly centred on the origin; the studio frames it automatically.
import * as THREE from 'three'
import { ACCENT, mat, lathe, extrude, mesh, holeAt, canvasTex, noiseTex, brakeDisc, springStrut, doorMirror } from './parts'

const TAU = Math.PI * 2
const rubber = () => new THREE.MeshPhysicalMaterial({ color: 0x18191c, roughness: 0.75, metalness: 0 })
const steel = (r = 0.35, c = 0xb3b7bd) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.85, roughness: r, roughnessMap: noiseTex(3) })
const paint = (c = 0x2b2f35) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.45, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.04, side: THREE.DoubleSide })
const primer = () => new THREE.MeshPhysicalMaterial({ color: 0x3a3d42, metalness: 0.1, roughness: 0.55, side: THREE.DoubleSide })
const plastic = (c = 0x1b1c20, r = 0.5) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, side: THREE.DoubleSide })

/** ribbed rubber boot along Y */
function boot(r0: number, r1: number, len: number, ribs = 8) {
  const prof: [number, number][] = [[0, 0]]
  for (let i = 0; i <= ribs * 2; i++) {
    const t = i / (ribs * 2)
    const r = r0 + (r1 - r0) * t
    prof.push([i % 2 ? r * 0.82 : r, t * len])
  }
  prof.push([0, len])
  return mesh(lathe(prof, 64), rubber())
}

/** a curved sheet with a silhouette mask — fenders, bumpers, doors */
function panel(w: number, h: number, bend: (x: number, y: number) => number, draw: (g: CanvasRenderingContext2D, s: number) => void, m: THREE.Material) {
  const g = new THREE.PlaneGeometry(w, h, 160, 120)
  const p = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) p.setZ(i, bend(p.getX(i) / (w / 2), p.getY(i) / (h / 2)))
  g.computeVertexNormals()
  const mm = (m as THREE.MeshPhysicalMaterial).clone()
  mm.alphaMap = canvasTex(1024, (c, s) => {
    c.fillStyle = '#000'
    c.fillRect(0, 0, s, s)
    c.fillStyle = '#fff'
    draw(c, s)
  })
  mm.alphaTest = 0.5
  return mesh(g, mm)
}

// ------------------------------------------------------------------ body
export function fender() {
  return panel(
    3.2,
    1.8,
    (x, y) => 0.35 * Math.cos(x * 0.9) * 0.6 + 0.25 * (1 - y * y) - 0.15 * x * x,
    (g, s) => {
      g.beginPath()
      g.moveTo(s * 0.04, s * 0.18)
      g.quadraticCurveTo(s * 0.5, s * 0.02, s * 0.96, s * 0.12)
      g.lineTo(s * 0.98, s * 0.92)
      g.lineTo(s * 0.86, s * 0.92)
      g.arc(s * 0.55, s * 0.95, s * 0.31, 0, Math.PI, true)
      g.lineTo(s * 0.06, s * 0.92)
      g.closePath()
      g.fill()
    },
    paint(0x2c3036),
  )
}

export function bumper() {
  const grp = new THREE.Group()
  const shell = panel(
    4,
    1.3,
    (x, y) => 0.9 * (1 - x * x) * 0.55 + 0.12 * (1 - y * y),
    (g, s) => {
      g.beginPath()
      g.roundRect(s * 0.02, s * 0.08, s * 0.96, s * 0.84, s * 0.12)
      g.fill()
      g.fillStyle = '#000'
      g.beginPath()
      g.roundRect(s * 0.22, s * 0.52, s * 0.56, s * 0.22, s * 0.06)
      g.fill()
      for (const x of [0.07, 0.83]) {
        g.beginPath()
        g.roundRect(s * x, s * 0.48, s * 0.1, s * 0.14, s * 0.03)
        g.fill()
      }
    },
    paint(0x2c3036),
  )
  grp.add(shell)
  return grp
}

export function door() {
  const grp = new THREE.Group()
  const skin = panel(
    3,
    2.4,
    (x, y) => 0.1 * (1 - x * x) + 0.18 * (1 - (y + 0.2) ** 2) * 0.6,
    (g, s) => {
      g.beginPath()
      g.moveTo(s * 0.05, s * 0.98)
      g.lineTo(s * 0.95, s * 0.98)
      g.lineTo(s * 0.97, s * 0.42)
      g.lineTo(s * 0.62, s * 0.06)
      g.lineTo(s * 0.12, s * 0.06)
      g.lineTo(s * 0.05, s * 0.4)
      g.closePath()
      g.fill()
      g.fillStyle = '#000'
      g.beginPath()
      g.moveTo(s * 0.13, s * 0.4)
      g.lineTo(s * 0.17, s * 0.12)
      g.lineTo(s * 0.58, s * 0.12)
      g.lineTo(s * 0.86, s * 0.4)
      g.closePath()
      g.fill()
    },
    paint(0x2c3036),
  )
  const handle = mesh(new THREE.CapsuleGeometry(0.05, 0.36, 8, 16), mat.chrome())
  handle.rotation.z = Math.PI / 2
  handle.position.set(0.55, -0.05, 0.2)
  grp.add(skin, handle)
  return grp
}

export function grille() {
  const grp = new THREE.Group()
  const frame = new THREE.Shape()
  frame.moveTo(-1.6, -0.6)
  frame.lineTo(1.6, -0.6)
  frame.lineTo(1.75, 0.55)
  frame.lineTo(-1.75, 0.55)
  frame.closePath()
  const inner = new THREE.Path()
  inner.moveTo(-1.45, -0.48)
  inner.lineTo(1.45, -0.48)
  inner.lineTo(1.58, 0.43)
  inner.lineTo(-1.58, 0.43)
  inner.closePath()
  frame.holes.push(inner)
  grp.add(mesh(extrude(frame, 0.18, 0.04), mat.chrome()))
  // diamond mesh
  const cell = new THREE.CylinderGeometry(0.11, 0.11, 0.12, 4)
  const im = new THREE.InstancedMesh(cell, mat.glossBlack(), 260)
  const m4 = new THREE.Matrix4()
  let n = 0
  for (let y = -0.4; y <= 0.38; y += 0.13)
    for (let x = -1.5; x <= 1.5; x += 0.16) {
      const xx = x + (Math.round((y + 0.4) / 0.13) % 2 ? 0.08 : 0)
      if (Math.abs(xx) > 1.45 + (y + 0.48) * 0.14) continue
      m4.makeRotationX(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(xx, y, 0.08))
      if (n < 260) im.setMatrixAt(n++, m4)
    }
  im.count = n
  im.castShadow = true
  grp.add(im)
  const badge = mesh(new THREE.BoxGeometry(0.5, 0.14, 0.05), mat.chrome())
  badge.position.set(0, 0.05, 0.2)
  grp.add(badge)
  return grp
}

export function bracket() {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.lineTo(2, 0)
  s.lineTo(2, 0.5)
  s.lineTo(0.5, 0.5)
  s.lineTo(0.5, 1.6)
  s.lineTo(0, 1.6)
  s.closePath()
  s.holes.push(holeAt(1.5, 0.25, 0.12), holeAt(1.0, 0.25, 0.12), holeAt(0.25, 1.2, 0.1))
  const g = extrude(s, 0.14, 0.03)
  g.translate(-1, -0.8, -0.07)
  return mesh(g, primer())
}

// ------------------------------------------------------------------ engine
export function gasket() {
  const s = new THREE.Shape()
  s.moveTo(-2, -0.7)
  s.lineTo(2, -0.7)
  s.lineTo(2, 0.7)
  s.lineTo(-2, 0.7)
  s.closePath()
  for (let i = 0; i < 4; i++) s.holes.push(holeAt(-1.5 + i, 0, 0.42))
  for (let i = 0; i < 5; i++) for (const y of [-0.55, 0.55]) s.holes.push(holeAt(-2 + 0.5 + i * 0.75, y, 0.06))
  const g = extrude(s, 0.04, 0.008)
  g.rotateX(-Math.PI / 2)
  const grp = new THREE.Group()
  grp.add(mesh(g, new THREE.MeshPhysicalMaterial({ color: 0x9a9da3, metalness: 0.9, roughness: 0.28, roughnessMap: noiseTex(6) })))
  for (let i = 0; i < 4; i++) {
    const r = mesh(new THREE.TorusGeometry(0.44, 0.025, 8, 64), mat.steel(0.2))
    r.rotation.x = Math.PI / 2
    r.position.set(-1.5 + i, 0.03, 0)
    grp.add(r)
  }
  return grp
}

export function pump() {
  const grp = new THREE.Group()
  const body = mesh(lathe([[0, 0], [0.7, 0], [0.75, 0.1], [0.55, 0.5], [0.3, 0.6], [0.28, 1.2], [0, 1.2]]), new THREE.MeshPhysicalMaterial({ color: 0xa8acb2, metalness: 0.8, roughness: 0.55, roughnessMap: noiseTex(4) }))
  const flange = new THREE.Shape()
  flange.absarc(0, 0, 0.95, 0, TAU, false)
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.4
    flange.holes.push(holeAt(Math.cos(a) * 0.8, Math.sin(a) * 0.8, 0.07))
  }
  const fl = mesh(extrude(flange, 0.08, 0.02), body.material as THREE.Material)
  fl.rotation.x = -Math.PI / 2
  const pulley = mesh(lathe([[0.1, 1.2], [0.6, 1.2], [0.62, 1.25], [0.55, 1.3], [0.62, 1.35], [0.55, 1.4], [0.62, 1.45], [0.1, 1.45]]), mat.steel(0.25))
  const pipe = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.7, 32), body.material as THREE.Material)
  pipe.rotation.z = Math.PI / 2
  pipe.position.set(0.7, 0.35, 0)
  grp.add(body, fl, pulley, pipe)
  return grp
}

export function mount() {
  const grp = new THREE.Group()
  const base = mesh(new THREE.BoxGeometry(1.8, 0.1, 1.0), primer())
  const block = mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.6, 48), rubber())
  block.position.y = 0.35
  const top = mesh(new THREE.BoxGeometry(1.2, 0.1, 0.8), primer())
  top.position.y = 0.7
  const stud = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 6), mat.chrome())
  stud.position.y = 0.95
  grp.add(base, block, top, stud)
  for (const x of [-0.75, 0.75]) {
    const b = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 6), mat.chrome())
    b.position.set(x, 0.1, 0)
    grp.add(b)
  }
  return grp
}

// ------------------------------------------------------------------ suspension & steering
export function controlArm() {
  const s = new THREE.Shape()
  s.moveTo(-1.6, -0.25)
  s.quadraticCurveTo(0, -0.35, 1.6, -0.2)
  s.lineTo(1.6, 0.25)
  s.quadraticCurveTo(0.4, 0.3, 0.2, 1.4)
  s.lineTo(-0.3, 1.4)
  s.quadraticCurveTo(-0.6, 0.3, -1.6, 0.25)
  s.closePath()
  s.holes.push(holeAt(0, 0.35, 0.22))
  const g = extrude(s, 0.18, 0.05)
  g.rotateX(-Math.PI / 2)
  const grp = new THREE.Group()
  grp.add(mesh(g, primer()))
  for (const [x, z] of [[-1.6, 0], [1.6, 0]] as const) {
    const bush = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 32), rubber())
    bush.rotation.x = Math.PI / 2
    bush.position.set(x, 0.1, z)
    const sleeve = mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.42, 32, 1, true), mat.steel(0.3))
    sleeve.rotation.x = Math.PI / 2
    sleeve.position.copy(bush.position)
    grp.add(bush, sleeve)
  }
  const bj = ballJoint()
  bj.scale.setScalar(0.6)
  bj.position.set(-0.05, 0.05, -1.4)
  grp.add(bj)
  return grp
}

export function ballJoint() {
  const grp = new THREE.Group()
  const housing = mesh(lathe([[0, 0], [0.45, 0], [0.5, 0.1], [0.5, 0.45], [0.35, 0.55], [0, 0.55]]), steel(0.4, 0xa0a4aa))
  const bt = boot(0.38, 0.2, 0.45, 4)
  bt.position.y = 0.5
  const stud = mesh(lathe([[0, 0.9], [0.17, 0.9], [0.12, 1.5], [0.1, 1.5], [0, 1.5]]), mat.chrome())
  const nut = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 6), steel(0.3))
  nut.position.y = 1.45
  grp.add(housing, bt, stud, nut)
  return grp
}

export function bushing() {
  const grp = new THREE.Group()
  const outer = mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.9, 64, 1, true), mat.steel(0.3))
  const rub = mesh(lathe([[0.25, -0.45], [0.68, -0.45], [0.68, 0.45], [0.25, 0.45]], 64), rubber())
  const inner = mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.1, 48), mat.steel(0.2, 0xcfd2d6))
  const hole = mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.12, 32), new THREE.MeshBasicMaterial({ color: 0x050505 }))
  grp.add(outer, rub, inner, hole)
  grp.rotation.x = Math.PI / 2
  return grp
}

export function stabLink() {
  const grp = new THREE.Group()
  const rod = mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 24), primer())
  rod.rotation.z = Math.PI / 2
  grp.add(rod)
  for (const s of [-1, 1]) {
    const head = mesh(new THREE.SphereGeometry(0.25, 32, 16), steel(0.35))
    head.position.x = s * 1.35
    const bt = boot(0.2, 0.14, 0.3, 3)
    bt.position.set(s * 1.35, 0.15, 0)
    const stud = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 16), mat.chrome())
    stud.position.set(s * 1.35, 0.6, 0)
    grp.add(head, bt, stud)
  }
  return grp
}

export function hub() {
  const grp = new THREE.Group()
  const body = mesh(lathe([[0.3, 0], [0.75, 0], [0.75, 0.12], [1.1, 0.14], [1.1, 0.25], [0.55, 0.3], [0.5, 0.9], [0.3, 0.9]], 96), new THREE.MeshPhysicalMaterial({ color: 0x8e9298, metalness: 0.85, roughness: 0.4, roughnessMap: noiseTex(4) }))
  grp.add(body)
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU
    const stud = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 16), mat.chrome())
    stud.position.set(Math.cos(a) * 0.85, -0.1, Math.sin(a) * 0.85)
    grp.add(stud)
  }
  const bearing = mesh(new THREE.TorusGeometry(0.42, 0.05, 12, 64), mat.chrome())
  bearing.rotation.x = Math.PI / 2
  bearing.position.y = 0.9
  grp.add(bearing)
  return grp
}

export function tieRod() {
  const grp = new THREE.Group()
  const rod = mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.4, 24), steel(0.3))
  rod.rotation.z = Math.PI / 2
  rod.position.x = -0.4
  const thread = mesh(lathe(Array.from({ length: 24 }, (_, i) => [i % 2 ? 0.12 : 0.1, i * 0.02] as [number, number]), 32), mat.steel(0.25))
  thread.rotation.z = -Math.PI / 2
  thread.position.x = 0.8
  const end = mesh(lathe([[0, 0], [0.22, 0], [0.26, 0.3], [0.2, 0.7], [0, 0.7]]), steel(0.4, 0x9a9ea4))
  end.rotation.z = -Math.PI / 2
  end.position.x = 1.25
  const ball = ballJoint()
  ball.scale.setScalar(0.55)
  ball.position.set(2.05, -0.15, 0)
  grp.add(rod, thread, end, ball)
  return grp
}

export function rack() {
  const grp = new THREE.Group()
  const tube = mesh(new THREE.CylinderGeometry(0.2, 0.2, 3.4, 32), new THREE.MeshPhysicalMaterial({ color: 0xa6aab0, metalness: 0.8, roughness: 0.5 }))
  tube.rotation.z = Math.PI / 2
  const valve = mesh(lathe([[0, 0], [0.38, 0], [0.38, 0.7], [0.15, 0.8], [0, 0.8]]), tube.material as THREE.Material)
  valve.position.set(-0.9, 0, 0)
  valve.rotation.x = -0.4
  grp.add(tube, valve)
  for (const s of [-1, 1]) {
    const b = boot(0.28, 0.14, 0.9, 6)
    b.rotation.z = (s * -Math.PI) / 2
    b.position.x = s * 1.7
    const r = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 16), mat.chrome())
    r.rotation.z = Math.PI / 2
    r.position.x = s * 2.9
    grp.add(b, r)
  }
  return grp
}

export function strut() {
  return springStrut()
}

// ------------------------------------------------------------------ brakes
export function disc() {
  const { rotor } = brakeDisc()
  return rotor
}

export function caliper() {
  const { rotor, caliper: c } = brakeDisc({ caliper: true })
  const g = new THREE.Group()
  g.add(rotor, c!)
  return g
}

export function pads() {
  const grp = new THREE.Group()
  for (const [z, ry] of [[0, 0.15], [0.6, -0.2]] as const) {
    const back = new THREE.Shape()
    back.moveTo(-1.1, -0.35)
    back.quadraticCurveTo(0, -0.55, 1.1, -0.35)
    back.lineTo(1.25, 0.25)
    back.lineTo(0.9, 0.5)
    back.quadraticCurveTo(0, 0.62, -0.9, 0.5)
    back.lineTo(-1.25, 0.25)
    back.closePath()
    const plate = mesh(extrude(back, 0.08, 0.02), new THREE.MeshPhysicalMaterial({ color: 0x2a2c30, metalness: 0.6, roughness: 0.45 }))
    const fr = new THREE.Shape()
    fr.moveTo(-1.0, -0.3)
    fr.quadraticCurveTo(0, -0.48, 1.0, -0.3)
    fr.lineTo(1.05, 0.25)
    fr.quadraticCurveTo(0, 0.5, -1.05, 0.25)
    fr.closePath()
    const friction = mesh(extrude(fr, 0.22, 0.02), new THREE.MeshStandardMaterial({ color: 0x3b3835, roughness: 0.95, roughnessMap: noiseTex(8) }))
    friction.position.z = 0.1
    const slot = mesh(new THREE.BoxGeometry(0.04, 0.8, 0.12), new THREE.MeshBasicMaterial({ color: 0x0a0a0a }))
    slot.position.z = 0.27
    const clip = mesh(new THREE.BoxGeometry(0.5, 0.05, 0.3), mat.steel(0.25))
    clip.position.set(0, 0.55, 0.1)
    const pad = new THREE.Group()
    pad.add(plate, friction, slot, clip)
    pad.position.z = z
    pad.rotation.y = ry
    pad.rotation.x = -Math.PI / 2 + 0.2
    pad.position.x = z * 1.6 - 0.5
    grp.add(pad)
  }
  return grp
}

// ------------------------------------------------------------------ electrics & optics
export function ecu() {
  const grp = new THREE.Group()
  const box = mesh(new THREE.BoxGeometry(2.2, 0.35, 1.6), new THREE.MeshPhysicalMaterial({ color: 0xb4b8be, metalness: 0.8, roughness: 0.42, roughnessMap: noiseTex(5) }))
  grp.add(box)
  for (let i = 0; i < 9; i++) {
    const fin = mesh(new THREE.BoxGeometry(0.05, 0.12, 1.3), box.material as THREE.Material)
    fin.position.set(-0.9 + i * 0.16, 0.23, 0)
    grp.add(fin)
  }
  const conn = mesh(new THREE.BoxGeometry(1.2, 0.3, 0.35), plastic(0x16171a, 0.4))
  conn.position.set(0.2, 0.05, 0.95)
  const latch = mesh(new THREE.BoxGeometry(0.3, 0.12, 0.2), new THREE.MeshStandardMaterial({ color: ACCENT, roughness: 0.5 }))
  latch.position.set(0.2, 0.25, 0.95)
  grp.add(conn, latch)
  for (const [x, z] of [[-1.15, -0.6], [1.15, -0.6], [-1.15, 0.6], [1.15, 0.6]]) {
    const ear = mesh(new THREE.BoxGeometry(0.25, 0.06, 0.25), box.material as THREE.Material)
    ear.position.set(x, -0.15, z)
    grp.add(ear)
  }
  return grp
}

export function coil() {
  const grp = new THREE.Group()
  const body = mesh(lathe([[0, 0], [0.18, 0], [0.2, 0.2], [0.2, 2.0], [0, 2.0]], 48), plastic(0x121316, 0.35))
  const head = mesh(new THREE.BoxGeometry(0.75, 0.45, 0.55), plastic(0x121316, 0.35))
  head.position.y = 2.15
  const conn = mesh(new THREE.BoxGeometry(0.3, 0.3, 0.4), plastic(0x2a2c31, 0.5))
  conn.position.set(0.45, 2.2, 0)
  const boot0 = mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.35, 32), new THREE.MeshStandardMaterial({ color: ACCENT, roughness: 0.6 }))
  boot0.position.y = -0.1
  grp.add(body, head, conn, boot0)
  grp.rotation.z = Math.PI / 2 - 0.2
  return grp
}

export function taillight() {
  const grp = new THREE.Group()
  const s = new THREE.Shape()
  s.moveTo(-1.6, -0.25)
  s.lineTo(1.4, -0.35)
  s.quadraticCurveTo(1.8, -0.3, 1.7, 0.1)
  s.lineTo(1.2, 0.45)
  s.lineTo(-1.6, 0.3)
  s.closePath()
  const housing = mesh(extrude(s, 0.35, 0.06), plastic(0x0d0d0f, 0.3))
  const lens = mesh(extrude(s, 0.06, 0.05), new THREE.MeshPhysicalMaterial({ color: 0xb01010, roughness: 0.05, transmission: 0.6, thickness: 0.3, clearcoat: 1 }))
  lens.position.z = 0.36
  const strip = mesh(new THREE.BoxGeometry(2.6, 0.06, 0.04), new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2010, emissiveIntensity: 1.2 }))
  strip.position.set(0.05, 0.05, 0.45)
  grp.add(housing, lens, strip)
  return grp
}

export function foglight() {
  const grp = new THREE.Group()
  const housing = mesh(lathe([[0, -0.4], [0.75, -0.4], [0.85, -0.2], [0.85, 0.15], [0.78, 0.2]], 96), plastic(0x0d0d0f, 0.3))
  housing.rotation.x = Math.PI / 2
  const refl = mesh(lathe(Array.from({ length: 16 }, (_, i) => [0.15 + (i / 15) * 0.6, -0.35 + ((0.15 + (i / 15) * 0.6) / 0.75) ** 2 * 0.5] as [number, number]), 96), mat.chrome())
  refl.rotation.x = Math.PI / 2
  ;(refl.material as THREE.Material).side = THREE.DoubleSide
  const lens = mesh(new THREE.CylinderGeometry(0.76, 0.76, 0.04, 96), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, transmission: 1, thickness: 0.2 }))
  lens.rotation.x = Math.PI / 2
  lens.position.z = 0.2
  const ring0 = mesh(new THREE.TorusGeometry(0.8, 0.05, 16, 96), mat.chrome())
  ring0.position.z = 0.2
  grp.add(housing, refl, lens, ring0)
  return grp
}

// ------------------------------------------------------------------ transmission
export function clutch() {
  const grp = new THREE.Group()
  const disc0 = mesh(lathe([[0.55, -0.05], [1.4, -0.05], [1.4, 0.05], [0.55, 0.05]], 128), new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.9, roughnessMap: noiseTex(8) }))
  grp.add(disc0)
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU
    const r = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 12), mat.chrome())
    r.position.set(Math.cos(a) * 1.05, 0, Math.sin(a) * 1.05)
    grp.add(r)
  }
  const hubp = mesh(lathe([[0.15, -0.2], [0.55, -0.12], [0.55, 0.12], [0.15, 0.25]], 64), mat.steel(0.35))
  grp.add(hubp)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU
    const spr = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 16), new THREE.MeshStandardMaterial({ color: ACCENT, roughness: 0.45 }))
    spr.rotation.z = Math.PI / 2
    spr.rotation.y = -a
    spr.position.set(Math.cos(a) * 0.4, 0.12, Math.sin(a) * 0.4)
    grp.add(spr)
  }
  const spline = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.5, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x0a0a0a, side: THREE.DoubleSide }))
  grp.add(spline)
  grp.rotation.x = 0.3
  return grp
}

export function cvAxle() {
  const grp = new THREE.Group()
  const shaft = mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.0, 24), steel(0.3))
  shaft.rotation.z = Math.PI / 2
  grp.add(shaft)
  for (const s of [-1, 1]) {
    const b = boot(0.38, 0.13, 0.75, 6)
    b.rotation.z = (s * -Math.PI) / 2 + (s > 0 ? Math.PI : 0)
    b.position.x = s * 1.0
    const joint = mesh(lathe([[0, 0], [0.42, 0], [0.48, 0.2], [0.4, 0.5], [0.15, 0.6], [0, 0.6]], 64), steel(0.35, 0xa3a7ad))
    joint.rotation.z = (s * -Math.PI) / 2
    joint.position.x = s * 1.75
    grp.add(b, joint)
  }
  const stub = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.6, 24), mat.chrome())
  stub.rotation.z = Math.PI / 2
  stub.position.x = 2.65
  grp.add(stub)
  return grp
}

// ------------------------------------------------------------------ cooling
export function radiator() {
  const grp = new THREE.Group()
  const fins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, 2.4, 0.28), mat.alu(0.45), 140)
  const m4 = new THREE.Matrix4()
  for (let i = 0; i < 140; i++) fins.setMatrixAt(i, m4.makeTranslation(-1.7 + (i / 139) * 3.4, 0, 0))
  fins.castShadow = true
  const tubes = new THREE.InstancedMesh(new THREE.BoxGeometry(3.45, 0.04, 0.26), mat.alu(0.3), 20)
  for (let i = 0; i < 20; i++) tubes.setMatrixAt(i, m4.makeTranslation(0, -1.15 + (i / 19) * 2.3, 0))
  grp.add(fins, tubes)
  for (const s of [-1, 1]) {
    const tank = mesh(new THREE.BoxGeometry(0.28, 2.6, 0.42), plastic(0x15161a, 0.55))
    tank.position.x = s * 1.85
    const pipe = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 24), plastic(0x15161a, 0.55))
    pipe.rotation.x = Math.PI / 2
    pipe.position.set(s * 1.85, s * 0.9, 0.4)
    grp.add(tank, pipe)
  }
  return grp
}

export function thermostat() {
  const grp = new THREE.Group()
  const flange = mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.06, 64), mat.steel(0.3))
  const cage = mesh(lathe([[0.3, -1.0], [0.45, -0.9], [0.45, 0], [0.3, 0]], 6), mat.steel(0.3, 0xc5a24a))
  ;(cage.material as THREE.MeshPhysicalMaterial).wireframe = false
  const valve = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 64), mat.copper())
  valve.position.y = 0.08
  class Helix extends THREE.Curve<THREE.Vector3> {
    getPoint(u: number, t = new THREE.Vector3()) {
      const a = u * 6 * TAU
      return t.set(Math.cos(a) * 0.32, -0.05 - u * 0.8, Math.sin(a) * 0.32)
    }
  }
  const spring = mesh(new THREE.TubeGeometry(new Helix(), 300, 0.03, 8), mat.steel(0.25))
  const pellet = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.5, 32), mat.copper())
  pellet.position.y = -0.95
  grp.add(flange, valve, spring, pellet)
  grp.rotation.x = 0.35
  return grp
}

export function compressor() {
  const grp = new THREE.Group()
  const body = mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.9, 64), new THREE.MeshPhysicalMaterial({ color: 0xb6bac0, metalness: 0.85, roughness: 0.45, roughnessMap: noiseTex(5) }))
  body.rotation.z = Math.PI / 2
  const pulley = mesh(lathe([[0.15, 0], [0.82, 0], [0.86, 0.05], [0.8, 0.1], [0.86, 0.15], [0.8, 0.2], [0.86, 0.25], [0.82, 0.32], [0.15, 0.32]], 96), mat.steel(0.25))
  pulley.rotation.z = -Math.PI / 2
  pulley.position.x = 0.95
  const plate = mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 64), mat.chrome())
  plate.rotation.z = Math.PI / 2
  plate.position.x = 1.3
  grp.add(body, pulley, plate)
  for (const x of [-0.5, 0.4]) {
    const ear = mesh(new THREE.BoxGeometry(0.3, 0.3, 1.9), body.material as THREE.Material)
    ear.position.set(x, -0.55, 0)
    grp.add(ear)
  }
  const port = mesh(new THREE.BoxGeometry(0.5, 0.35, 0.4), body.material as THREE.Material)
  port.position.set(-0.6, 0.8, 0)
  const conn = mesh(new THREE.BoxGeometry(0.2, 0.2, 0.25), plastic(0x16171a, 0.4))
  conn.position.set(0.1, 0.8, 0.2)
  grp.add(port, conn)
  return grp
}

// ------------------------------------------------------------------ maintenance & exhaust
export function airFilter() {
  const grp = new THREE.Group()
  const frame = new THREE.Shape()
  frame.moveTo(-1.5, -1)
  frame.lineTo(1.5, -1)
  frame.lineTo(1.5, 1)
  frame.lineTo(-1.5, 1)
  frame.closePath()
  const hole = new THREE.Path()
  hole.moveTo(-1.35, -0.85)
  hole.lineTo(1.35, -0.85)
  hole.lineTo(1.35, 0.85)
  hole.lineTo(-1.35, 0.85)
  hole.closePath()
  frame.holes.push(hole)
  const f = mesh(extrude(frame, 0.35, 0.03), plastic(0x15161a, 0.6))
  f.rotation.x = -Math.PI / 2
  grp.add(f)
  const n = 34
  const pleat = new THREE.BoxGeometry(0.012, 0.3, 1.72)
  const media = new THREE.MeshStandardMaterial({ color: 0xe9e1cf, roughness: 0.95, side: THREE.DoubleSide })
  for (let i = 0; i < n; i++) {
    const p = mesh(pleat, media)
    p.position.set(-1.33 + (i / (n - 1)) * 2.66, 0.18, 0)
    p.rotation.z = i % 2 ? 0.32 : -0.32
    grp.add(p)
  }
  return grp
}

export function belt() {
  const prof: [number, number][] = []
  for (let i = 0; i <= 12; i++) prof.push([i % 2 ? 1.36 : 1.32, -0.22 + (i / 12) * 0.44])
  prof.push([1.48, 0.22], [1.48, -0.22], [1.36, -0.22])
  const g = mesh(lathe(prof, 160), rubber())
  g.scale.set(1.4, 1, 0.8)
  g.rotation.x = 0.5
  return g
}

export function muffler() {
  const grp = new THREE.Group()
  const can = mesh(new THREE.CylinderGeometry(1, 1, 2.6, 64), new THREE.MeshPhysicalMaterial({ color: 0x9a9da2, metalness: 0.9, roughness: 0.38, roughnessMap: noiseTex(4) }))
  can.rotation.z = Math.PI / 2
  can.scale.set(1, 1, 0.6)
  grp.add(can)
  for (const s of [-1, 1]) {
    const pipe = mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.2, 32, 1, true), can.material as THREE.Material)
    ;(pipe.material as THREE.Material).side = THREE.DoubleSide
    pipe.rotation.z = Math.PI / 2
    pipe.position.set(s * 1.85, s * 0.25, 0)
    const lip = mesh(new THREE.TorusGeometry(0.2, 0.03, 12, 48), mat.chrome())
    lip.rotation.y = Math.PI / 2
    lip.position.set(s * 2.45, s * 0.25, 0)
    grp.add(pipe, lip)
  }
  return grp
}

export function mirror() {
  return doorMirror(0x2c3036)
}

export function turbo() {
  const grp = new THREE.Group()
  const snail = mesh(new THREE.TorusGeometry(0.75, 0.38, 32, 96, Math.PI * 1.7), new THREE.MeshPhysicalMaterial({ color: 0xb6bac0, metalness: 0.85, roughness: 0.4 }))
  const hot = mesh(new THREE.TorusGeometry(0.65, 0.32, 32, 96, Math.PI * 1.7), new THREE.MeshPhysicalMaterial({ color: 0x5a4a40, metalness: 0.7, roughness: 0.65, roughnessMap: noiseTex(6) }))
  hot.position.z = -1.0
  const core = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.8, 48), mat.steel(0.3))
  core.rotation.x = Math.PI / 2
  core.position.z = -0.5
  const inlet = mesh(new THREE.CylinderGeometry(0.45, 0.4, 0.5, 48, 1, true), snail.material as THREE.Material)
  inlet.rotation.x = Math.PI / 2
  inlet.position.z = 0.4
  grp.add(snail, hot, core, inlet)
  grp.rotation.y = 0.7
  return grp
}

