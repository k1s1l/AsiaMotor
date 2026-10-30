// Offline CGI studio: renders shots frame-by-frame for tools/render.mjs (Playwright).
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import * as P from './parts'
import * as P2 from './parts2'

type Mood = 'dark' | 'light'
interface Shot {
  mood: Mood
  fov?: number
  build: (s: THREE.Scene) => (t: number, cam: THREE.PerspectiveCamera) => void
  floorY?: number
  bloom?: number
  exposure?: number
  /** horizontal framing offset (fraction of width) — moves the subject right to leave room for type */
  shift?: number
}

/** Studio "photo lamps" baked into an environment map — gives metal its strip-light reflections. */
function darkEnvironment(renderer: THREE.WebGLRenderer, warm = 1) {
  const s = new THREE.Scene()
  s.background = new THREE.Color(0x010102)
  const add = (w: number, h: number, pos: [number, number, number], color: number, k: number) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }),
    )
    m.position.set(...pos)
    m.lookAt(0, 0, 0)
    s.add(m)
  }
  add(14, 2.4, [0, 9, 1], 0xffffff, 3)
  add(1.4, 12, [-9, 2, 4], 0xffffff, 2.6)
  add(1, 12, [9, 1, -2], 0xdfe8ff, 2.6)
  add(1, 12, [6, 2, 7], 0xffffff, 1.6)
  add(8, 0.8, [4, -0.5, 9], 0xff6a2a, 1.8 * warm)
  add(5, 5, [-3, 4, 9], 0xffffff, 0.35)
  add(12, 6, [0, 3, 13], 0xffffff, 0.55)
  const pm = new THREE.PMREMGenerator(renderer)
  return pm.fromScene(s, 0.02).texture
}

function stage(scene: THREE.Scene, renderer: THREE.WebGLRenderer, mood: Mood, floorY: number) {
  if (mood === 'dark') {
    const bg = new THREE.Color(0x07080a)
    scene.background = bg
    scene.fog = new THREE.Fog(bg, 9, 22)
    scene.environment = darkEnvironment(renderer)
    scene.environmentIntensity = 0.85
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0x0b0c0f, roughness: 0.42, metalness: 0.3 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = floorY
    floor.receiveShadow = true
    scene.add(floor)
    const key = new THREE.SpotLight(0xffffff, 170, 30, 0.55, 0.65, 1.6)
    key.position.set(-4, 8, 5)
    key.target.position.set(0, 0.5, 0)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.bias = -0.0004
    key.shadow.radius = 6
    const rim = new THREE.SpotLight(0xff8a50, 95, 30, 0.6, 0.8, 1.6)
    rim.position.set(5, 3, -5)
    rim.target.position.set(0, 1.6, 0)
    const fill = new THREE.DirectionalLight(0x9fb4ff, 0.25)
    fill.position.set(3, 2, 6)
    scene.add(key, key.target, rim, rim.target, fill)
  } else {
    const bg = new THREE.Color(0xe9e7e2)
    scene.background = bg
    scene.fog = new THREE.Fog(bg, 14, 30)
    const pm = new THREE.PMREMGenerator(renderer)
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.03).texture
    scene.environmentIntensity = 0.85
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.22 }))
    floor.rotation.x = -Math.PI / 2
    floor.position.y = floorY
    floor.receiveShadow = true
    scene.add(floor)
    const key = new THREE.DirectionalLight(0xffffff, 2.2)
    key.position.set(-2, 9, 3)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.left = key.shadow.camera.bottom = -6
    key.shadow.camera.right = key.shadow.camera.top = 6
    key.shadow.radius = 14
    key.shadow.blurSamples = 20
    key.shadow.bias = -0.0005
    const fill = new THREE.DirectionalLight(0xffffff, 0.6)
    fill.position.set(5, 3, 6)
    scene.add(key, fill)
  }
}

// ------------------------------------------------------------ shots
const shots: Record<string, Shot> = {
  // ---- dark category stills ----
  'cat-engine': {
    mood: 'dark', fov: 30,
    build: (s) => {
      const p = P.pistonRod()
      p.position.set(0, 3.45, 0)
      p.rotation.set(0.1, 0.95, -0.12)
      s.add(p)
      return (_t, c) => { c.position.set(0.6, 3.0, 9.6); c.lookAt(0, 2.2, 0) }
    },
  },
  'cat-transmission': {
    mood: 'dark', fov: 30,
    build: (s) => {
      const { group, update } = P.gearSet()
      group.position.set(-0.9, 1.9, 0)
      group.rotation.set(-0.4, 0.5, 0.12)
      update(1.3)
      s.add(group)
      return (_t, c) => { c.position.set(0.4, 3.4, 10.5); c.lookAt(-0.1, 1.5, 0) }
    },
  },
  'cat-brakes': {
    mood: 'dark', fov: 30, bloom: 0.4,
    build: (s) => {
      const { rotor, caliper, heatMat } = P.brakeDisc({ caliper: true, heat: true })
      heatMat!.emissiveIntensity = 0.18
      const asm = new THREE.Group()
      asm.add(rotor, caliper!)
      rotor.rotation.z = 0.4
      asm.position.set(0, 1.72, 0)
      asm.rotation.y = -0.55
      s.add(asm)
      return (_t, c) => { c.position.set(1.0, 1.9, 7.6); c.lookAt(0, 1.6, 0) }
    },
  },
  'cat-suspension': {
    mood: 'dark', fov: 30,
    build: (s) => {
      const st = P.springStrut()
      st.position.set(0, 2.95, 0)
      st.rotation.set(0, 0.6, 0.18)
      s.add(st)
      return (_t, c) => { c.position.set(0.8, 2.4, 9.6); c.lookAt(0, 2.5, 0) }
    },
  },
  'cat-electrics': {
    mood: 'dark', fov: 30,
    build: (s) => {
      const a = P.alternator()
      a.position.set(0, 1.05, 0)
      a.rotation.set(0, 0.5, -Math.PI / 2 + 0.25)
      s.add(a)
      return (_t, c) => { c.position.set(1.0, 2.6, 6.4); c.lookAt(0, 0.95, 0) }
    },
  },
  'cat-body': {
    mood: 'dark', fov: 28,
    build: (s) => {
      const m = P.doorMirror()
      m.position.set(0, 1.85, 0)
      m.rotation.set(0.05, Math.PI + 0.55, 0)
      s.add(m)
      return (_t, c) => { c.position.set(0.6, 2.6, 7.6); c.lookAt(0.2, 1.4, 0) }
    },
  },
  'cat-optics': {
    mood: 'dark', fov: 30, bloom: 0.3,
    build: (s) => {
      const h = P.headlight()
      h.position.set(0, 1.35, 0)
      h.rotation.y = -0.55
      s.add(h)
      return (_t, c) => { c.position.set(0.9, 1.9, 6.2); c.lookAt(0, 1.3, 0) }
    },
  },
  'cat-cooling': {
    mood: 'dark', fov: 30,
    build: (s) => {
      const { group, fan } = P.coolingFan()
      fan.rotation.z = 0.3
      group.position.set(0, 2.05, 0)
      group.rotation.set(0, -0.6, 0)
      s.add(group)
      return (_t, c) => { c.position.set(1.4, 2.7, 8.6); c.lookAt(0, 1.85, 0) }
    },
  },
  'cat-maintenance': {
    mood: 'dark', fov: 30,
    build: (s) => {
      const f = P.oilFilter()
      f.position.set(-0.7, 0.24, 0)
      const sp = P.sparkPlug()
      sp.rotation.set(0, 0, Math.PI / 2 - 0.05)
      sp.position.set(1.15, 0.3, 0.9)
      sp.rotation.y = -0.5
      s.add(f, sp)
      return (_t, c) => { c.position.set(0.6, 2.6, 6.2); c.lookAt(0.2, 0.75, 0) }
    },
  },
  'cat-steering': {
    mood: 'dark', fov: 30,
    build: (s) => {
      const w = P.steeringWheel()
      w.position.set(0, 1.75, 0)
      w.rotation.set(-0.15, -0.55, 0)
      s.add(w)
      return (_t, c) => { c.position.set(0.8, 2.3, 7.4); c.lookAt(0, 1.65, 0) }
    },
  },
  // wide brand-story frame
  'story-macro': {
    mood: 'dark', fov: 22, bloom: 0.6,
    build: (s) => {
      const { rotor, caliper, heatMat } = P.brakeDisc({ caliper: true, heat: true })
      heatMat!.emissiveIntensity = 1.0
      const asm = new THREE.Group()
      asm.add(rotor, caliper!)
      rotor.rotation.z = 0.15
      asm.position.set(0, 1.72, 0)
      asm.rotation.y = -0.5
      s.add(asm)
      return (_t, c) => { c.position.set(0.9, 2.1, 9.0); c.lookAt(-1.7, 1.6, 0) }
    },
  },

  // ---- light product packshots ----
  'p-hood': {
    mood: 'light', fov: 26,
    build: (s) => {
      const b = P.bodyPanel(0x2c3036, true)
      b.rotation.set(-Math.PI / 2 + 0.32, 0, 0.55)
      b.position.set(0, 0.75, 0)
      s.add(b)
      return (_t, c) => { c.position.set(1.6, 8.4, 11.8); c.lookAt(0, 0.3, 0) }
    },
  },
  'p-alternator': {
    mood: 'light', fov: 26,
    build: (s) => {
      const a = P.alternator()
      a.position.set(0, 1.03, 0)
      a.rotation.set(0, 0.7, -Math.PI / 2 + 0.2)
      s.add(a)
      return (_t, c) => { c.position.set(1.2, 3.4, 7.8); c.lookAt(0, 0.85, 0) }
    },
  },
  'p-sensor': {
    mood: 'light', fov: 24,
    build: (s) => {
      const x = P.sensor()
      x.position.set(0, 0.42, 0)
      x.rotation.set(Math.PI / 2 - 0.05, 0, 0.5)
      s.add(x)
      return (_t, c) => { c.position.set(0.8, 3.6, 5.6); c.lookAt(0.1, 0.25, 0) }
    },
  },
  'p-starter': {
    mood: 'light', fov: 26,
    build: (s) => {
      const x = P.starter()
      x.position.set(-0.4, 0.66, 0)
      x.rotation.y = -0.45
      s.add(x)
      return (_t, c) => { c.position.set(1.0, 3.6, 8.2); c.lookAt(0, 0.7, 0) }
    },
  },
  'p-tensioner': {
    mood: 'light', fov: 24,
    build: (s) => {
      const x = P.tensioner()
      x.position.set(-1.0, 0.5, 0)
      x.rotation.y = -0.4
      s.add(x)
      return (_t, c) => { c.position.set(0.8, 3.2, 7.0); c.lookAt(0.1, 0.45, 0) }
    },
  },
  'p-sprocket': {
    mood: 'light', fov: 24,
    build: (s) => {
      const x = P.sprocket()
      x.position.set(0, 1.75, 0)
      x.rotation.set(-0.25, -0.5, 0)
      s.add(x)
      return (_t, c) => { c.position.set(0.8, 2.6, 8.0); c.lookAt(0, 1.6, 0) }
    },
  },
  'p-headlight': {
    mood: 'light', fov: 26,
    build: (s) => {
      const x = P.headlight()
      x.position.set(0, 1.27, 0)
      x.rotation.set(0, -0.6, 0)
      s.add(x)
      return (_t, c) => { c.position.set(0.9, 2.6, 7.8); c.lookAt(0, 1.15, 0) }
    },
  },
}

/** Light packshot with automatic framing: the part is scaled to a common size and centred on the floor. */
function pack(build: () => THREE.Object3D, rot: [number, number, number] = [0, -0.5, 0]): Shot {
  return {
    mood: 'light',
    fov: 26,
    build: (s) => {
      const o = build()
      const holder = new THREE.Group()
      holder.add(o)
      o.rotation.x += rot[0]
      o.rotation.y += rot[1]
      o.rotation.z += rot[2]
      holder.updateMatrixWorld(true)
      let box = new THREE.Box3().setFromObject(holder)
      const size = box.getSize(new THREE.Vector3())
      holder.scale.setScalar(3.4 / Math.max(size.x, size.y, size.z))
      holder.updateMatrixWorld(true)
      box = new THREE.Box3().setFromObject(holder)
      const c = box.getCenter(new THREE.Vector3())
      holder.position.set(-c.x, -box.min.y, -c.z)
      s.add(holder)
      holder.updateMatrixWorld(true)
      const sphere = new THREE.Box3().setFromObject(holder).getBoundingSphere(new THREE.Sphere())
      const dist = (sphere.radius / Math.sin(THREE.MathUtils.degToRad(13))) * 0.86
      const dir = new THREE.Vector3(0.28, 0.62, 1).normalize()
      return (_t, cam) => {
        cam.position.copy(sphere.center).addScaledVector(dir, dist)
        cam.lookAt(sphere.center)
      }
    },
  }
}

const packs: Record<string, Shot> = {
  'p-fender': pack(P2.fender, [-0.25, -0.6, 0]),
  'p-bumper': pack(P2.bumper, [-0.2, 0.25, 0]),
  'p-door': pack(P2.door, [-0.1, -0.45, 0]),
  'p-grille': pack(P2.grille, [-0.15, -0.35, 0]),
  'p-mirror': pack(P2.mirror, [0, Math.PI + 0.6, 0]),
  'p-bracket': pack(P2.bracket, [0, -0.6, 0]),
  'p-piston': pack(P.pistonRod, [0.1, 0.9, 0]),
  'p-gasket': pack(P2.gasket, [0.5, -0.3, 0]),
  'p-pump': pack(P2.pump, [0, -0.4, 0]),
  'p-mount': pack(P2.mount, [0, -0.5, 0]),
  'p-turbo': pack(P2.turbo, [0, 0, 0]),
  'p-strut': pack(P2.strut, [0, 0.6, 0.15]),
  'p-arm': pack(P2.controlArm, [0, -0.4, 0]),
  'p-balljoint': pack(P2.ballJoint, [0.2, 0, 0]),
  'p-bushing': pack(P2.bushing, [0, 0, 0.5]),
  'p-link': pack(P2.stabLink, [0, -0.4, 0]),
  'p-hub': pack(P2.hub, [0.4, 0, 0]),
  'p-tierod': pack(P2.tieRod, [0, -0.45, 0]),
  'p-rack': pack(P2.rack, [0, -0.35, 0]),
  'p-disc': pack(P2.disc, [0, -0.6, 0]),
  'p-caliper': pack(P2.caliper, [0, -0.6, 0]),
  'p-pads': pack(P2.pads, [0, -0.3, 0]),
  'p-ecu': pack(P2.ecu, [0.25, -0.5, 0]),
  'p-coil': pack(P2.coil, [0, -0.4, 0]),
  'p-taillight': pack(P2.taillight, [-0.2, 0.45, 0]),
  'p-foglight': pack(P2.foglight, [0, -0.5, 0]),
  'p-gears': pack(() => P.gearSet().group, [-0.3, 0.4, 0]),
  'p-clutch': pack(P2.clutch, [0.5, 0, 0]),
  'p-cv': pack(P2.cvAxle, [0, -0.35, 0]),
  'p-radiator': pack(P2.radiator, [-0.1, -0.5, 0]),
  'p-fan': pack(() => P.coolingFan().group, [0, -0.6, 0]),
  'p-thermostat': pack(P2.thermostat, [0, 0, 0]),
  'p-compressor': pack(P2.compressor, [0, -0.5, 0]),
  'p-oilfilter': pack(P.oilFilter, [0, -0.4, 0]),
  'p-airfilter': pack(P2.airFilter, [0.35, -0.5, 0]),
  'p-sparkplug': pack(P.sparkPlug, [0, 0, Math.PI / 2 - 0.1]),
  'p-belt': pack(P2.belt, [0, -0.3, 0]),
  'p-muffler': pack(P2.muffler, [0, -0.45, 0]),
}

// ------------------------------------------------------------ runtime
let renderer: THREE.WebGLRenderer
let composer: EffectComposer
let camera: THREE.PerspectiveCamera
let update: (t: number, cam: THREE.PerspectiveCamera) => void

declare global {
  interface Window {
    __init: (name: string, w: number, h: number) => string[]
    __frame: (t: number) => void
    __ready: boolean
  }
}

window.__init = (name, w, h) => {
  const shot = shots[name] ?? packs[name]
  if (!shot) throw new Error('unknown shot ' + name)
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(1)
  renderer.setSize(w, h)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = shot.exposure ?? (shot.mood === 'dark' ? 1.0 : 1.05)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = shot.mood === 'light' ? THREE.VSMShadowMap : THREE.PCFSoftShadowMap
  document.body.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  stage(scene, renderer, shot.mood, shot.floorY ?? 0)
  camera = new THREE.PerspectiveCamera(shot.fov ?? 30, w / h, 0.1, 100)
  if (shot.shift) camera.setViewOffset(w, h, -w * shot.shift, 0, w, h)
  update = shot.build(scene)
  const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 })
  composer = new EffectComposer(renderer, rt)
  composer.addPass(new RenderPass(scene, camera))
  if (shot.mood === 'dark') composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), (shot.bloom ?? 0.25) * 0.5, 0.25, 1.6))
  composer.addPass(new OutputPass())
  return Object.keys(shots)
}

window.__frame = (t) => {
  update(t, camera)
  camera.updateMatrixWorld()
  composer.render()
}
window.__ready = true

export {}
