// Real-time 3D assembly of the hero car. Loaded lazily (own chunk) by AssemblyHero.
//
// The model is split into "units" by node name (see STAGES). Every unit gets a pivot at its
// own centre, starts away from the car and travels to its real position, stage by stage.
// To use another car (e.g. a licensed Haval H6 model) export it as GLB with named parts and
// adjust the regular expressions in STAGES — nothing else depends on the model.
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import gsap from 'gsap'

type From = 'below' | 'above' | 'side' | 'ends' | 'wheel'

interface StageDef {
  id: string
  match: RegExp[]
  from: From
  /** start time on the desktop timeline, seconds */
  at: number
}

export const STAGES: StageDef[] = [
  { id: 'platform', match: [/^BodyUnderside$/, /^Axles$/, /^InteriorFloor$/], from: 'below', at: 0.5 },
  { id: 'brakes', match: [/BrakeDisc$/, /BrakePad$/], from: 'side', at: 1.5 },
  { id: 'cabin', match: [/^Engine$/, /^Interior(?!Door)(?!Steering(Emblem|Wheel))/], from: 'above', at: 2.4 },
  { id: 'body', match: [/^BodyPillars$/, /^BodyPanelsColor2$/, /^BodyRoofPanel$/, /^BodyRearPanelsColor1$/, /^BodyWindshield$/, /^BodyWindshieldGasket$/], from: 'above', at: 3.5 },
  { id: 'closures', match: [/^BodyDoor[LR]Color1$/, /^BodyHood$/], from: 'side', at: 4.9 },
  { id: 'wheels', match: [/^Wheel(Front|Rear)[LR]$/], from: 'wheel', at: 5.9 },
  { id: 'optics', match: [/^BodyHeadlights$/, /^BodyTaillights$/, /^BodyTurnsignalsRear$/, /^BodyTaillightsPanels$/, /^BodyWindshieldWipers(Base)?$/, /^License Plate$/], from: 'ends', at: 6.9 },
]
const FINALE = 8.0

const ACCENT = new THREE.Color('#ff4b1f')

export interface AssemblyOptions {
  quality: 'high' | 'low'
  onStage?: (index: number) => void
  onFinale?: () => void
  /** desktop layout: shift the car right in the final frame to leave room for the headline */
  layout: () => 'wide' | 'tall'
}

interface Unit {
  pivot: THREE.Group
  stage: number
  home: THREE.Vector3
  from: THREE.Vector3
  fromRot: THREE.Euler
  mats: THREE.MeshStandardMaterial[]
  meshes: THREE.Mesh[]
  /** timeline time at which the part seats (drives the warm glint), -1 = none */
  land: number
  flash: THREE.MeshStandardMaterial[]
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
  private lamps: THREE.SpotLight[] = []
  private lightMats: { mat: THREE.MeshStandardMaterial; peak: number }[] = []
  private raf = 0
  private visible = true
  private pointer = new THREE.Vector2()
  private pointerSmooth = new THREE.Vector2()
  private clock = new THREE.Clock()
  // animated rig values (GSAP tweens these)
  rig = { azimuth: -2.5, elevation: 0.62, radius: 11, targetY: 0.55, shift: 0, spin: 0, grid: 1, scan: 0, lights: 0, idle: 0 }

  private canvas: HTMLCanvasElement
  private opts: AssemblyOptions

  constructor(canvas: HTMLCanvasElement, opts: AssemblyOptions) {
    this.canvas = canvas
    this.opts = opts
    const high = opts.quality === 'high'
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

    const key = new THREE.DirectionalLight('#ffffff', 2.4)
    key.position.set(-3, 9, 4)
    key.castShadow = true
    const s = this.opts.quality === 'high' ? 2048 : 1024
    key.shadow.mapSize.set(s, s)
    Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 })
    key.shadow.radius = 5
    key.shadow.bias = -0.0004
    const rim = new THREE.DirectionalLight('#ff8a55', 1.4)
    rim.position.set(5, 2.5, -6)
    this.scene.add(key, rim)

    // engineering floor: dark ground, blueprint grid and a scanning ring (fades out once assembled)
    this.floor = new THREE.ShaderMaterial({
      uniforms: { uGrid: { value: 1 }, uScan: { value: 0 }, uAccent: { value: ACCENT.clone() }, uBg: { value: new THREE.Color('#07080a') } },
      vertexShader: /* glsl */ `varying vec3 vPos; void main(){ vPos = (modelMatrix * vec4(position,1.)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vPos,1.); }`,
      fragmentShader: /* glsl */ `
        uniform float uGrid; uniform float uScan; uniform vec3 uAccent; uniform vec3 uBg; varying vec3 vPos;
        float grid(vec2 p, float k){ vec2 q = p * k; vec2 g = abs(fract(q - .5) - .5) / fwidth(q); return 1. - min(min(g.x, g.y), 1.); }
        void main(){
          float r = length(vPos.xz);
          float fade = smoothstep(11., 2., r);
          vec3 col = vec3(.03, .032, .036) + vec3(.05) * smoothstep(4.5, 0., r);
          float lines = grid(vPos.xz, 2.) * .07 + grid(vPos.xz, .5) * .18;
          col += uAccent * lines * uGrid * smoothstep(8., 1., r);
          float ring = smoothstep(.16, 0., abs(r - uScan)) * step(.01, uScan) * smoothstep(9., 4., uScan);
          col += uAccent * ring * .32;
          gl_FragColor = vec4(mix(uBg, col, fade), 1.);
          #include <colorspace_fragment>
        }`,
    })
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 96), this.floor)
    floor.rotation.x = -Math.PI / 2
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.55 }))
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = 0.002
    shadow.receiveShadow = true
    this.scene.add(floor, shadow)
  }

  // ------------------------------------------------------------------ model
  async load(url: string, onProgress: (p: number) => void) {
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    const gltf = await loader.loadAsync(url, (e) => e.total && onProgress(e.loaded / e.total))
    const model = gltf.scene
    const root = new THREE.Group()
    root.add(model)
    root.updateMatrixWorld(true)
    // orientation: height must be the smallest extent (Y up) and the headlights must face +Z
    let size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
    if (size.z < size.y && size.z < size.x) model.rotation.x = -Math.PI / 2
    else if (size.x < size.y && size.x < size.z) model.rotation.z = Math.PI / 2
    root.updateMatrixWorld(true)
    size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
    if (size.x > size.z) model.rotation.y += Math.PI / 2
    root.updateMatrixWorld(true)
    const front = model.getObjectByName('BodyHeadlights')
    if (front) {
      const all = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3())
      const head = new THREE.Box3().setFromObject(front).getCenter(new THREE.Vector3())
      if (head.z < all.z) model.rotation.y += Math.PI
      root.updateMatrixWorld(true)
    }
    // normalise: ~4.6 m long, centred, wheels on the floor
    const box = new THREE.Box3().setFromObject(model)
    const k = 4.6 / Math.max(size.x, size.z)
    root.scale.setScalar(k)
    root.updateMatrixWorld(true)
    box.setFromObject(model)
    const c = box.getCenter(new THREE.Vector3())
    root.position.set(-c.x, -box.min.y, -c.z)
    root.updateMatrixWorld(true)

    this.restyle(model)

    // collect units, then re-parent each into a pivot at its own centre (keeps world transforms)
    const found: { node: THREE.Object3D; stage: number }[] = []
    model.traverse((o) => {
      const s = STAGES.findIndex((st) => st.match.some((r) => r.test(o.name)))
      if (s >= 0) found.push({ node: o, stage: s })
    })
    for (const { node, stage } of found) {
      const b = new THREE.Box3().setFromObject(node)
      if (b.isEmpty()) continue
      const pivot = new THREE.Group()
      b.getCenter(pivot.position)
      this.car.add(pivot)
      pivot.updateMatrixWorld(true)
      pivot.attach(node)
      this.units.push({ pivot, stage, home: pivot.position.clone(), from: new THREE.Vector3(), fromRot: new THREE.Euler(), mats: [], meshes: [], land: -1, flash: [] })
    }
    // anything the rules did not catch stays on the model root; ship it with the body stage
    if (model.children.length) {
      const pivot = new THREE.Group()
      this.car.add(pivot)
      while (model.children.length) pivot.attach(model.children[0])
      this.units.push({ pivot, stage: 3, home: new THREE.Vector3(), from: new THREE.Vector3(), fromRot: new THREE.Euler(), mats: [], meshes: [], land: -1, flash: [] })
    }
    root.removeFromParent()

    // per-unit materials (so each part can fade/flash on its own) + start positions
    let i = 0
    for (const u of this.units) {
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
      u.flash = u.mats.filter((m) => !m.emissiveMap && m.emissive && m.name !== 'Glass' && m.emissive.getHex() === 0)
      this.placeStart(u, i++)
    }
    this.findLights()
    this.applyRig()
    // compile every shader now, so the first assembly frames do not stutter
    await this.renderer.compileAsync(this.scene, this.camera)
  }

  private restyle(model: THREE.Object3D) {
    const plate = this.plateTexture()
    model.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      for (const mat of (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshPhysicalMaterial[]) {
        switch (mat.name) {
          case 'Paint 1 Carmine': // main body: titanium silver metallic
            mat.color.set('#9aa1a9')
            mat.metalness = 0.85
            mat.roughness = 0.3
            mat.clearcoat = 1
            mat.clearcoatRoughness = 0.04
            break
          case 'Paint 2 Carmine': // trim: gloss graphite
            mat.color.set('#16181c')
            mat.metalness = 0.5
            mat.roughness = 0.32
            break
          case 'Interior 3 Carmine':
            mat.color.set('#7a2a14')
            break
          case 'Brake': // calipers in the brand colour
            mat.color.copy(ACCENT)
            mat.roughness = 0.35
            mat.emissive.set('#000000')
            break
          case 'Dashboard': // its orange glow blooms through the glass
            mat.emissiveIntensity = 0.25
            break
          case 'License':
            mat.map = plate
            mat.emissiveMap = null
            mat.emissive.set('#000000')
            break
        }
      }
      // the source asset carries a third-party emblem on the steering wheel
      if (/SteeringEmblem/.test(m.name)) m.visible = false
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

  private placeStart(u: Unit, i: number) {
    const def = STAGES[u.stage]
    const h = u.home
    const side = Math.abs(h.x) > 0.15 ? Math.sign(h.x) : i % 2 ? 1 : -1
    const jitter = (n: number) => (Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1
    switch (def.from) {
      case 'below':
        u.from.set(h.x, h.y - 0.45, h.z)
        break
      case 'above':
        u.from.set(h.x * 1.35, h.y + 2.4 + Math.abs(jitter(1)) * 1.4, h.z * 1.25)
        u.fromRot.set(jitter(2) * 0.35, jitter(3) * 0.5, jitter(4) * 0.35)
        break
      case 'side':
        u.from.set(h.x + side * 2.8, h.y + 0.5 + Math.abs(jitter(1)) * 0.6, h.z * 1.15)
        u.fromRot.set(jitter(2) * 0.3, side * 0.45, jitter(4) * 0.25)
        break
      case 'wheel':
        u.from.set(h.x + side * 2.4, h.y, h.z)
        u.fromRot.set(-Math.PI * 2 * Math.sign(h.z || 1), side * 0.35, 0)
        break
      case 'ends':
        u.from.set(h.x * 1.4, h.y + 0.25, h.z + Math.sign(h.z || 1) * 2.6)
        u.fromRot.set(0, jitter(3) * 0.4, 0)
        break
    }
  }

  private findLights() {
    const head: THREE.Box3 = new THREE.Box3()
    for (const u of this.units)
      u.pivot.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        for (const mat of (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[]) {
          if (mat.name === 'Headlight') this.lightMats.push({ mat, peak: 1.3 })
          if (mat.name === 'Brakelight') this.lightMats.push({ mat, peak: 2.4 })
          if (mat.name === 'Signallight') this.lightMats.push({ mat, peak: 2 })
        }
        if (/Headlights/.test(m.name)) head.expandByObject(m)
      })
    for (const l of this.lightMats) l.mat.emissiveIntensity = 0
    if (head.isEmpty()) return
    // two light cones and floor spots in front of the headlights
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
  /** Full assembly. `speed` < 1 shortens it (phones). */
  play(speed = 1) {
    this.tl?.kill()
    const r = this.rig
    const t = (s: number) => s * speed
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.inOut' } })
    Object.assign(r, { azimuth: -2.5, elevation: 0.62, radius: 11, targetY: 0.55, shift: 0, spin: 0, grid: 1, scan: 0, lights: 0, idle: 0 })
    // camera: high rear three-quarter → low front three-quarter
    tl.to(r, { azimuth: -0.9, elevation: 0.42, radius: 9.6, duration: t(FINALE), ease: 'sine.inOut' }, 0)
    tl.to(r, { scan: 9, duration: t(FINALE - 0.5), ease: 'none' }, t(0.3))
    this.units.forEach((u, i) => {
      const def = STAGES[u.stage]
      const order = this.units.filter((v, j) => v.stage === u.stage && j < i).length
      const at = t(def.at + order * 0.09)
      const dur = t(def.from === 'wheel' ? 1.3 : def.from === 'below' ? 1.1 : 1.25)
      u.pivot.position.copy(u.from)
      u.pivot.rotation.copy(u.fromRot)
      u.mats.forEach((m) => (m.opacity = 0))
      tl.to(u.mats, { opacity: 1, duration: dur * 0.45, ease: 'power1.out' }, at)
      tl.to(u.pivot.position, { x: u.home.x, y: u.home.y, z: u.home.z, duration: dur, ease: def.from === 'wheel' ? 'power2.out' : 'expo.out' }, at)
      tl.to(u.pivot.rotation, { x: 0, y: 0, z: 0, duration: dur, ease: 'power3.out' }, at)
      u.land = at + dur * 0.55
    })
    STAGES.forEach((s, i) => tl.call(() => this.opts.onStage?.(i), [], t(s.at)))
    this.addFinale(tl, t(FINALE), speed)
    this.tl = tl
    // draw the first frame before the clock starts, so the opening is never skipped on slow GPUs
    tl.pause(0)
    this.frame()
    requestAnimationFrame(() => tl.play(0))
    this.start()
  }

  private addFinale(tl: gsap.core.Timeline, at: number, speed: number) {
    const r = this.rig
    tl.addLabel('finale', at)
    tl.call(() => this.opts.onStage?.(STAGES.length), [], at)
    tl.to(r, { azimuth: 0.7, elevation: 0.17, radius: 10.4, targetY: 0.62, shift: 1, duration: 2.4 * Math.max(speed, 0.8), ease: 'power3.inOut' }, at)
    tl.to(r, { spin: 0.28, duration: 2.6, ease: 'power2.inOut' }, at + 0.2)
    tl.to(r, { grid: 0.12, duration: 1.6, ease: 'power2.out' }, at)
    tl.to(r, { lights: 1, duration: 0.9, ease: 'power2.in' }, at + 0.9)
    tl.call(() => this.opts.onFinale?.(), [], at + 1.2)
    tl.to(r, { idle: 1, duration: 1.5, ease: 'none' }, at + 2.2)
  }

  /** Jump straight to the finished car (repeat visits, “Skip”). */
  showAssembled(animate = true) {
    if (this.tl && animate) {
      // fast-forward what is left of the assembly, then let the finale play
      const fin = this.tl.labels.finale
      if (this.tl.time() < fin) {
        this.tl.pause()
        gsap.to(this.tl, { time: fin, duration: 0.9, ease: 'power2.inOut', onComplete: () => void this.tl!.play() })
      }
      return
    }
    this.tl?.kill()
    const tl = gsap.timeline({ paused: true })
    for (const u of this.units) {
      u.land = -1
      u.pivot.position.copy(u.home)
      u.pivot.rotation.set(0, 0, 0)
      u.mats.forEach((m) => (m.opacity = 1))
    }
    Object.assign(this.rig, { azimuth: -0.6, elevation: 0.3, radius: 8.6, scan: 0, grid: 0.6, lights: 0, idle: 0 })
    this.addFinale(tl, 0, 1)
    this.tl = tl
    tl.play(animate ? 0 : tl.duration())
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
    // parts only cast shadows once they have materialised; a short warm glint when they seat
    const now = this.tl?.time() ?? 0
    for (const u of this.units) {
      const on = (u.mats[0]?.opacity ?? 1) > 0.6
      for (const m of u.meshes) m.castShadow = on && m.userData.shadow
      const d = u.land < 0 ? -1 : now - u.land
      const k = d < 0 || d > 0.5 ? 0 : d < 0.08 ? d / 0.08 : 1 - (d - 0.08) / 0.42
      for (const m of u.flash) m.emissive.copy(ACCENT).multiplyScalar(k * 0.16)
    }
    this.floor.uniforms.uGrid.value = r.grid
    this.floor.uniforms.uScan.value = r.scan
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
