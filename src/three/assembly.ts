// Real-time cinematic assembly of the hero car. Loaded lazily (own chunk) by the Hero.
//
// Sequence (desktop seconds; phones run it faster):
//   0.0  the dark studio lights up
//   0.7  the car materialises in the centre as an engineering hologram (edges of every part)
//   2.9  it comes apart into an exploded view
//   4.3  units return stage by stage (see models.ts) and turn from wireframe into real parts
//  11.3  headlights on, the camera closes in and flies around the car, then settles beside the headline
//
// The car is split into "units" by node name. Every unit gets a pivot at its own centre, so it
// can move and turn on its own. Nothing here is specific to one model: see src/three/models.ts.
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import gsap from 'gsap'
import { MODEL, type ModelConfig } from './models'

const ACCENT = new THREE.Color('#ff4b1f')
const TAU = Math.PI * 2
/** the whole car floats this high in the exploded view */
const LIFT = 0.3
/** desktop timeline marks, seconds */
const REVEAL = 0.7
const EXPLODE = 2.9
/** the resting composition next to the headline */
const REST = { azimuth: 0.7, elevation: 0.17, radius: 10.4, targetY: 0.62, shift: 1, spin: 0.28, grid: 0.12, scan: 0, lights: 1, studio: 1, holo: 1 }

export const STAGES = MODEL.stages
/** onStage() ids before the first assembly stage */
export const PRELUDE = { studio: -3, scan: -2, explode: -1 } as const

export interface AssemblyOptions {
  quality: 'high' | 'low'
  /** PRELUDE ids, then 0…STAGES.length-1, then STAGES.length for the finale */
  onStage?: (index: number) => void
  onFinale?: () => void
  /** desktop layout: shift the car right in the final frame to leave room for the headline */
  layout: () => 'wide' | 'tall'
  model?: ModelConfig
}

interface Unit {
  pivot: THREE.Group
  stage: number
  home: THREE.Vector3
  apart: THREE.Vector3
  apartRot: THREE.Euler
  mats: THREE.MeshStandardMaterial[]
  meshes: THREE.Mesh[]
  /** hologram outline of the unit */
  edge: THREE.LineBasicMaterial
  lines: THREE.LineSegments[]
  /** 0 = front of the car … 1 = rear: the scan reveals the hologram in this order */
  sweep: number
  /** timeline time at which the part seats (drives the warm glint), -1 = none */
  land: number
  flash: THREE.MeshStandardMaterial[]
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export class AssemblyScene {
  readonly renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  private composer?: EffectComposer
  private car = new THREE.Group()
  private units: Unit[] = []
  private tl?: gsap.core.Timeline
  private floor!: THREE.ShaderMaterial
  private shadow!: THREE.ShadowMaterial
  private key!: THREE.DirectionalLight
  private rim!: THREE.DirectionalLight
  private lamps: THREE.SpotLight[] = []
  private lightMats: { mat: THREE.MeshStandardMaterial; peak: number }[] = []
  private raf = 0
  private visible = true
  private pointer = new THREE.Vector2()
  private pointerSmooth = new THREE.Vector2()
  private clock = new THREE.Clock()
  private model: ModelConfig
  private edgePeak: number
  // animated rig values (GSAP tweens these)
  rig = { azimuth: -2.2, elevation: 0.5, radius: 13, targetY: 0.9, shift: 0, spin: 0, grid: 0, scan: 0, lights: 0, idle: 0, studio: 0, holo: 0 }

  private canvas: HTMLCanvasElement
  private opts: AssemblyOptions

  constructor(canvas: HTMLCanvasElement, opts: AssemblyOptions) {
    this.canvas = canvas
    this.opts = opts
    this.model = opts.model ?? MODEL
    const high = opts.quality === 'high'
    // without bloom the lines need a little more strength to read as light
    this.edgePeak = high ? 0.5 : 0.7
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !high, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, high ? 1.75 : 1.5))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.scene.background = new THREE.Color('#07080a')
    this.scene.add(this.car)
    this.buildStage()
    if (high) {
      const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 })
      this.composer = new EffectComposer(this.renderer, rt)
      this.composer.addPass(new RenderPass(this.scene, this.camera))
      this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), 0.38, 0.22, 0.95))
      this.composer.addPass(new OutputPass())
    }
    this.resize()
  }

  // ------------------------------------------------------------------ studio
  private buildStage() {
    // environment: a dark room with long softboxes — gives the paint its strip reflections
    const env = new THREE.Scene()
    const lamp = (w: number, h: number, pos: [number, number, number], color: string, k: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }))
      m.position.set(...pos)
      m.lookAt(0, 0, 0)
      env.add(m)
    }
    lamp(16, 2.4, [0, 9, 0], '#ffffff', 3.2)
    lamp(1.2, 10, [-9, 2.5, 3], '#ffffff', 2.4)
    lamp(1.2, 10, [9, 2.5, -3], '#dfe7ff', 2.0)
    lamp(10, 0.6, [2, 0.6, 10], '#ffffff', 1.4)
    lamp(8, 0.7, [-3, 0.4, -10], '#ff6a35', 0.9)
    const pm = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pm.fromScene(env, 0.03).texture
    pm.dispose()

    this.key = new THREE.DirectionalLight('#ffffff', 2.4)
    this.key.position.set(-3, 9, 4)
    this.key.castShadow = true
    const s = this.opts.quality === 'high' ? 2048 : 1024
    this.key.shadow.mapSize.set(s, s)
    Object.assign(this.key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 })
    this.key.shadow.radius = 5
    this.key.shadow.bias = -0.0004
    this.rim = new THREE.DirectionalLight('#ff8a55', 1.4)
    this.rim.position.set(5, 2.5, -6)
    this.scene.add(this.key, this.rim)

    // engineering floor: dark ground, blueprint grid and a scanning ring; uLight fades the studio in
    this.floor = new THREE.ShaderMaterial({
      uniforms: { uGrid: { value: 0 }, uScan: { value: 0 }, uLight: { value: 0 }, uAccent: { value: ACCENT.clone() }, uBg: { value: new THREE.Color('#07080a') } },
      vertexShader: /* glsl */ `varying vec3 vPos; void main(){ vPos = (modelMatrix * vec4(position,1.)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vPos,1.); }`,
      fragmentShader: /* glsl */ `
        uniform float uGrid; uniform float uScan; uniform float uLight; uniform vec3 uAccent; uniform vec3 uBg; varying vec3 vPos;
        float grid(vec2 p, float k){ vec2 q = p * k; vec2 g = abs(fract(q - .5) - .5) / fwidth(q); return 1. - min(min(g.x, g.y), 1.); }
        void main(){
          float r = length(vPos.xz);
          float fade = smoothstep(11., 2., r) * uLight;
          vec3 col = vec3(.03, .032, .036) + vec3(.05) * smoothstep(4.5, 0., r);
          float lines = grid(vPos.xz, 2.) * .07 + grid(vPos.xz, .5) * .18;
          col += uAccent * lines * uGrid * smoothstep(8., 1., r);
          float ring = smoothstep(.16, 0., abs(r - uScan)) * step(.01, uScan) * smoothstep(9., 4., uScan);
          gl_FragColor = vec4(mix(uBg, col, fade) + uAccent * ring * .32, 1.);
          #include <colorspace_fragment>
        }`,
    })
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 96), this.floor)
    floor.rotation.x = -Math.PI / 2
    this.shadow = new THREE.ShadowMaterial({ opacity: 0.55 })
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), this.shadow)
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = 0.002
    shadow.receiveShadow = true
    this.scene.add(floor, shadow)
  }

  // ------------------------------------------------------------------ model
  async load(url: string, onProgress: (p: number) => void) {
    const cfg = this.model
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    const gltf = await loader.loadAsync(url, (e) => e.total && onProgress(e.loaded / e.total))
    const model = gltf.scene
    const root = new THREE.Group()
    root.add(model)
    root.updateMatrixWorld(true)
    // orientation: height must be the smallest extent (Y up) and the front must face +Z
    let size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
    if (size.z < size.y && size.z < size.x) model.rotation.x = -Math.PI / 2
    else if (size.x < size.y && size.x < size.z) model.rotation.z = Math.PI / 2
    root.updateMatrixWorld(true)
    size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
    if (size.x > size.z) model.rotation.y += Math.PI / 2
    root.updateMatrixWorld(true)
    const front = model.getObjectByName(cfg.frontNode)
    if (front) {
      const all = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3())
      const head = new THREE.Box3().setFromObject(front).getCenter(new THREE.Vector3())
      if (head.z < all.z) model.rotation.y += Math.PI
      root.updateMatrixWorld(true)
    }
    // normalise: real length, centred, wheels on the floor
    const box = new THREE.Box3().setFromObject(model)
    root.scale.setScalar(cfg.length / Math.max(size.x, size.z))
    root.updateMatrixWorld(true)
    box.setFromObject(model)
    const c = box.getCenter(new THREE.Vector3())
    root.position.set(-c.x, -box.min.y, -c.z)
    root.updateMatrixWorld(true)

    this.restyle(model)

    // collect units, then re-parent each into a pivot at its own centre (keeps world transforms)
    const stages = cfg.stages
    const found: { node: THREE.Object3D; stage: number }[] = []
    model.traverse((o) => {
      const s = stages.findIndex((st) => st.match.some((r) => r.test(o.name)))
      if (s >= 0) found.push({ node: o, stage: s })
    })
    const unit = (pivot: THREE.Group, stage: number): Unit => ({
      pivot,
      stage,
      home: pivot.position.clone(),
      apart: new THREE.Vector3(),
      apartRot: new THREE.Euler(),
      mats: [],
      meshes: [],
      edge: new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      lines: [],
      sweep: 0,
      land: -1,
      flash: [],
    })
    for (const { node, stage } of found) {
      const b = new THREE.Box3().setFromObject(node)
      if (b.isEmpty()) continue
      const pivot = new THREE.Group()
      b.getCenter(pivot.position)
      this.car.add(pivot)
      pivot.updateMatrixWorld(true)
      pivot.attach(node)
      this.units.push(unit(pivot, stage))
    }
    // anything the rules did not catch stays on the model root; it ships with `restStage`
    if (model.children.length) {
      const pivot = new THREE.Group()
      this.car.add(pivot)
      while (model.children.length) pivot.attach(model.children[0])
      this.units.push(unit(pivot, Math.max(0, stages.findIndex((s) => s.id === cfg.restStage))))
    }
    root.removeFromParent()

    // per-unit materials (so each part can fade/flash on its own), hologram edges, exploded positions
    const edgeCache = new Map<string, THREE.EdgesGeometry>()
    const angle = this.opts.quality === 'high' ? 30 : 40
    const half = cfg.length / 2
    this.units.forEach((u, i) => {
      u.pivot.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        m.castShadow = !/Glass/.test((m.material as THREE.Material).name)
        m.receiveShadow = true
        u.meshes.push(m)
        m.userData.shadow = m.castShadow
        const cloned = (Array.isArray(m.material) ? m.material : [m.material]).map((src) => {
          const mat = (src as THREE.MeshStandardMaterial).clone()
          mat.alphaHash = true
          u.mats.push(mat)
          return mat
        })
        m.material = Array.isArray(m.material) ? cloned : cloned[0]
      })
      for (const m of u.meshes) {
        if (!m.visible) continue
        let g = edgeCache.get(m.geometry.uuid)
        if (!g) edgeCache.set(m.geometry.uuid, (g = new THREE.EdgesGeometry(m.geometry, angle)))
        const l = new THREE.LineSegments(g, u.edge)
        l.raycast = () => {}
        m.add(l)
        u.lines.push(l)
      }
      u.flash = u.mats.filter((m) => !m.emissiveMap && m.emissive && m.name !== 'Glass' && m.emissive.getHex() === 0)
      u.sweep = Math.min(1, Math.max(0, (half - u.home.z) / (2 * half)))
      this.placeApart(u, i)
    })
    this.findLights()
    this.applyRig()
    // compile every shader now, so the first frames do not stutter
    await this.renderer.compileAsync(this.scene, this.camera)
  }

  private restyle(model: THREE.Object3D) {
    const { paint, hide } = this.model
    let plate: THREE.Texture | undefined
    model.traverse((o) => {
      const m = o as THREE.Mesh
      if (hide.some((r) => r.test(o.name))) o.visible = false
      if (!m.isMesh) return
      for (const mat of (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshPhysicalMaterial[]) {
        const p = paint[mat.name]
        if (!p) continue
        if (p.color) mat.color.set(p.color)
        if (p.metalness !== undefined) mat.metalness = p.metalness
        if (p.roughness !== undefined) mat.roughness = p.roughness
        if (p.clearcoat !== undefined) mat.clearcoat = p.clearcoat
        if (p.clearcoatRoughness !== undefined) mat.clearcoatRoughness = p.clearcoatRoughness
        if (p.emissive) mat.emissive.set(p.emissive)
        if (p.emissiveIntensity !== undefined) mat.emissiveIntensity = p.emissiveIntensity
        if (p.plate) {
          mat.map = plate ??= this.plateTexture()
          mat.emissiveMap = null
        }
      }
    })
  }

  private plateTexture() {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 128
    const g = c.getContext('2d')!
    g.fillStyle = '#f2f2ee'
    g.fillRect(0, 0, 512, 128)
    g.fillStyle = '#1b3a8a'
    g.fillRect(0, 0, 60, 128)
    g.fillStyle = '#ffd500'
    g.fillRect(14, 70, 32, 20)
    g.fillStyle = '#111'
    g.font = '700 64px "Unbounded Variable", Arial, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('ASIA MOTOR', 290, 68)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.flipY = false
    return t
  }

  /** exploded-view position: far enough to read every unit, close enough to stay in frame */
  private placeApart(u: Unit, i: number) {
    const h = u.home
    const side = Math.abs(h.x) > 0.15 ? Math.sign(h.x) : i % 2 ? 1 : -1
    const end = Math.sign(h.z || 1)
    const j = (n: number) => (Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1
    const off = new THREE.Vector3()
    const rot = u.apartRot
    switch (this.model.stages[u.stage].explode) {
      case 'base':
        break
      case 'brake':
        off.set(Math.abs(h.x) > 0.15 ? side * 0.7 : 0, Math.abs(h.x) > 0.15 ? 0 : -0.12, 0)
        break
      case 'up':
        off.set(h.x * 0.3, 1.05 + Math.abs(j(1)) * 0.3, h.z * 0.12)
        rot.set(j(2) * 0.12, j(3) * 0.2, j(4) * 0.1)
        break
      case 'high':
        off.set(h.x * 0.45, 1.75 + Math.abs(j(1)) * 0.4, h.z * 0.22)
        rot.set(j(2) * 0.1, j(3) * 0.15, j(4) * 0.08)
        break
      case 'side':
        if (Math.abs(h.x) < 0.25) {
          off.set(0, 1.5, h.z * 0.35)
          rot.set(-0.35 * end, 0, 0)
        } else {
          off.set(side * 1.7, 0.35, h.z * 0.1)
          rot.set(0, side * 0.35, 0)
        }
        break
      case 'wheel':
        off.set(side * 1.45, 0, h.z * 0.12)
        rot.set(TAU * end, side * 0.5, 0)
        break
      case 'ends':
        off.set(h.x * 0.2, 0.35, end * 1.3)
        rot.set(0, j(3) * 0.3, 0)
        break
    }
    u.apart.copy(h).add(off)
    u.apart.y += LIFT
  }

  private findLights() {
    const head: THREE.Box3 = new THREE.Box3()
    for (const u of this.units)
      u.pivot.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        for (const mat of (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[]) {
          const peak = this.model.lamps[mat.name]
          if (peak) this.lightMats.push({ mat, peak })
        }
        if (this.model.headlights.test(m.name)) head.expandByObject(m)
      })
    for (const l of this.lightMats) l.mat.emissiveIntensity = 0
    if (head.isEmpty()) return
    // two pools of light on the floor in front of the car
    const c = head.getCenter(new THREE.Vector3())
    const w = head.max.x - head.min.x
    for (const s of [-1, 1]) {
      const spot = new THREE.SpotLight('#dce6ff', 0, 12, 0.42, 0.6, 1.5)
      // placed ahead of the bumper so the pools land on the floor, not on the car's own nose
      spot.position.set(c.x + s * w * 0.36, c.y * 0.9, head.max.z + 0.9)
      spot.target.position.set(spot.position.x + s * 0.35, 0, spot.position.z + 4.5)
      this.scene.add(spot, spot.target)
      this.lamps.push(spot)
    }
  }

  // ------------------------------------------------------------------ timelines
  /** Full sequence. `speed` < 1 shortens it (phones). */
  play(speed = 1) {
    this.tl?.kill()
    const r = this.rig
    const stages = this.model.stages
    const t = (s: number) => s * speed
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.inOut' } })
    Object.assign(r, { azimuth: -2.2, elevation: 0.5, radius: 13, targetY: 0.9, shift: 0, spin: 0, grid: 0, scan: 0, lights: 0, idle: 0, studio: 0, holo: 0 })

    // 1. studio lights up, 2. the hologram is scanned in, centre stage
    tl.call(() => this.opts.onStage?.(PRELUDE.studio), [], 0)
    tl.to(r, { studio: 1, grid: 1, duration: t(1.8), ease: 'power2.inOut' }, 0)
    tl.call(() => this.opts.onStage?.(PRELUDE.scan), [], t(REVEAL))
    tl.to(r, { holo: 1, duration: t(2), ease: 'power1.inOut' }, t(REVEAL))
    tl.to(r, { scan: 9, duration: t(2.8), ease: 'none' }, t(REVEAL))
    // camera: slow push from the rear three-quarter to a front view of the exploded car…
    tl.to(r, { azimuth: -0.55, elevation: 0.34, radius: 13.2, targetY: 1.1, duration: t(EXPLODE + 1.6), ease: 'sine.inOut' }, 0)
    // …then drifts round and down while the car comes together
    const assembleAt = t(EXPLODE + 1.6)
    tl.to(r, { azimuth: -1.25, elevation: 0.3, radius: 10.2, targetY: 0.7, duration: t(this.model.finale) - assembleAt, ease: 'sine.inOut' }, assembleAt)

    // 3. exploded view
    tl.call(() => this.opts.onStage?.(PRELUDE.explode), [], t(EXPLODE))
    // 4–8. units travel home stage by stage, from wireframe to finished part
    this.units.forEach((u, i) => {
      const def = stages[u.stage]
      const order = this.units.filter((v, k) => v.stage === u.stage && k < i).length
      u.land = -1
      u.pivot.position.copy(u.home)
      u.pivot.rotation.set(0, 0, 0)
      u.mats.forEach((m) => (m.opacity = 0))
      const out = t(EXPLODE + u.stage * 0.05 + Math.abs(Math.sin(i * 7.31)) * 0.18)
      tl.to(u.pivot.position, { x: u.apart.x, y: u.apart.y, z: u.apart.z, duration: t(1.3) }, out)
      // wheels wait upright and roll in: a full turn back to 0 is invisible at the start
      const roll = def.explode === 'wheel'
      tl.to(u.pivot.rotation, { x: roll ? 0 : u.apartRot.x, y: u.apartRot.y, z: u.apartRot.z, duration: t(1.3) }, out)
      if (roll) tl.set(u.pivot.rotation, { x: u.apartRot.x }, out + t(1.31))
      const at = t(def.at + order * 0.07)
      const dur = t(def.explode === 'wheel' ? 1.3 : def.explode === 'base' ? 1 : 1.2)
      tl.to(u.pivot.position, { x: u.home.x, y: u.home.y, z: u.home.z, duration: dur, ease: def.explode === 'wheel' ? 'power2.out' : 'expo.out' }, at)
      tl.to(u.pivot.rotation, { x: 0, y: 0, z: 0, duration: dur, ease: 'power3.out' }, at)
      tl.to(u.mats, { opacity: 1, duration: dur * 0.55, ease: 'power1.inOut' }, at + dur * 0.2)
      u.land = at + dur * 0.6
    })
    stages.forEach((s, i) => tl.call(() => this.opts.onStage?.(i), [], t(s.at)))
    // 9–10. finished: lights, fly-around, rest
    this.addFinale(tl, t(this.model.finale), speed)
    this.tl = tl
    // draw the first frame before the clock starts, so the opening is never skipped on slow GPUs
    tl.pause(0)
    this.frame()
    requestAnimationFrame(() => tl.play(0))
    this.start()
  }

  private addFinale(tl: gsap.core.Timeline, at: number, speed: number) {
    const r = this.rig
    const k = Math.max(speed, 0.75)
    const orbit = 5.4 * k
    const go = at + 0.3
    tl.addLabel('finale', at)
    tl.call(() => this.opts.onStage?.(this.model.stages.length), [], at)
    tl.to(r, { lights: 1, duration: 0.9, ease: 'power2.in' }, at)
    tl.to(r, { grid: REST.grid, duration: 2, ease: 'power2.out' }, at)
    // three quarters of a turn round the car, closing in on the way and pulling back to rest
    tl.to(r, { azimuth: REST.azimuth - TAU, duration: orbit, ease: 'power2.inOut' }, go)
    tl.to(r, { radius: 7.6, elevation: 0.13, targetY: 0.55, duration: orbit * 0.45, ease: 'power2.inOut' }, go)
    tl.to(r, { radius: REST.radius, elevation: REST.elevation, targetY: REST.targetY, duration: orbit * 0.55, ease: 'power2.inOut' }, go + orbit * 0.45)
    tl.to(r, { shift: REST.shift, spin: REST.spin, duration: 2.2, ease: 'power3.inOut' }, go + orbit - 1.5)
    tl.call(() => this.opts.onFinale?.(), [], go + orbit - 0.5)
    tl.to(r, { idle: 1, duration: 1.5, ease: 'none' }, go + orbit + 0.7)
  }

  /** Finish now: `animate` brings the parts home and the camera to rest quickly (“Skip”), otherwise it is instant (repeat visits). */
  showAssembled(animate = true) {
    this.tl?.kill()
    const r = this.rig
    const tl = gsap.timeline()
    const dest = { ...REST, azimuth: REST.azimuth + TAU * Math.round((r.azimuth - REST.azimuth) / TAU) }
    for (const u of this.units) {
      u.land = -1
      if (animate) {
        tl.to(u.pivot.position, { x: u.home.x, y: u.home.y, z: u.home.z, duration: 1, ease: 'expo.out' }, 0)
        tl.to(u.pivot.rotation, { x: 0, y: 0, z: 0, duration: 1, ease: 'power3.out' }, 0)
        tl.to(u.mats, { opacity: 1, duration: 0.6, ease: 'power1.out' }, 0)
      } else {
        u.pivot.position.copy(u.home)
        u.pivot.rotation.set(0, 0, 0)
        u.mats.forEach((m) => (m.opacity = 1))
      }
    }
    this.opts.onStage?.(this.model.stages.length)
    if (animate) {
      tl.to(r, { ...dest, duration: 1.6, ease: 'power3.inOut' }, 0)
      tl.call(() => this.opts.onFinale?.(), [], 0.9)
      tl.to(r, { idle: 1, duration: 1.5, ease: 'none' }, 1.6)
    } else {
      Object.assign(r, dest, { idle: 1 })
    }
    this.tl = tl
    this.start()
  }

  /** Deterministic seek, used by visual tests and for the static fallback render. */
  seek(seconds: number) {
    this.tl?.pause().seek(seconds)
    this.frame()
  }

  get duration() {
    return this.tl?.duration() ?? 0
  }

  // ------------------------------------------------------------------ loop
  private applyRig() {
    const r = this.rig
    const tall = this.opts.layout() === 'tall'
    const idleT = this.clock.getElapsedTime()
    const az = r.azimuth + r.idle * (Math.sin(idleT * 0.12) * 0.06 + this.pointerSmooth.x * 0.08)
    const el = r.elevation + r.idle * this.pointerSmooth.y * 0.04
    const radius = r.radius * (tall ? Math.max(1, 0.64 / this.camera.aspect) : 1)
    this.camera.position.set(Math.sin(az) * Math.cos(el) * radius, Math.sin(el) * radius + r.targetY, Math.cos(az) * Math.cos(el) * radius)
    this.camera.lookAt(0, r.targetY, 0)
    const w = this.canvas.clientWidth || 1
    const h = this.canvas.clientHeight || 1
    // final framing: car to the right on wide screens, higher up on tall ones
    if (tall) this.camera.setViewOffset(w, h, 0, h * 0.24 * r.shift, w, h)
    else this.camera.setViewOffset(w, h, -w * 0.3 * r.shift, h * 0.05 * r.shift, w, h)
    this.car.rotation.y = r.spin

    // studio light level
    this.scene.environmentIntensity = r.studio
    this.key.intensity = 2.4 * r.studio
    this.rim.intensity = 1.4 * r.studio
    this.shadow.opacity = 0.55 * r.studio
    this.floor.uniforms.uLight.value = r.studio
    this.floor.uniforms.uGrid.value = r.grid
    this.floor.uniforms.uScan.value = r.scan

    const now = this.tl?.time() ?? 0
    for (const u of this.units) {
      const solid = u.mats[0]?.opacity ?? 1
      // hologram: revealed front to back by the scan, gives way to the real part as it solidifies
      const e = smooth(u.sweep * 0.6, u.sweep * 0.6 + 0.4, r.holo) * (1 - solid) * this.edgePeak
      u.edge.opacity = e
      for (const l of u.lines) l.visible = e > 0.004
      // parts only cast shadows once they have materialised; a short warm glint when they seat
      for (const m of u.meshes) m.castShadow = solid > 0.6 && m.userData.shadow
      const d = u.land < 0 ? -1 : now - u.land
      const k = d < 0 || d > 0.5 ? 0 : d < 0.08 ? d / 0.08 : 1 - (d - 0.08) / 0.42
      for (const m of u.flash) m.emissive.copy(ACCENT).multiplyScalar(k * 0.16)
    }
    for (const l of this.lightMats) l.mat.emissiveIntensity = l.peak * r.lights
    for (const s of this.lamps) s.intensity = 9 * r.lights
  }

  private frame = () => {
    this.pointerSmooth.lerp(this.pointer, 0.05)
    this.applyRig()
    if (this.composer) this.composer.render()
    else this.renderer.render(this.scene, this.camera)
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop)
    if (!this.visible) return
    this.frame()
  }

  private start() {
    if (!this.raf) this.raf = requestAnimationFrame(this.loop)
  }

  setVisible(v: boolean) {
    this.visible = v
    if (this.tl) v ? this.tl.resume() : this.tl.pause()
  }

  setPointer(x: number, y: number) {
    this.pointer.set(x, y)
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    this.renderer.setSize(w, h, false)
    this.composer?.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.fov = w / h < 1 ? 42 : 30
    this.camera.updateProjectionMatrix()
    this.frame()
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.tl?.kill()
    this.renderer.dispose()
    this.composer?.dispose()
  }
}
