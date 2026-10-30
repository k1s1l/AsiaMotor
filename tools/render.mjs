// Renders CGI media for the site: node tools/render.mjs [shot,shot|all|stills] [--preview]
import { createServer } from 'vite'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH ?? 'playwright')
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const out = path.join(root, 'tools/.frames')
const pub = path.join(root, 'public/media')
const arg = process.argv[2] ?? 'all'
const preview = process.argv.includes('--preview')

const FPS = 30
const CATS = ['cat-engine', 'cat-transmission', 'cat-brakes', 'cat-suspension', 'cat-electrics', 'cat-body', 'cat-optics', 'cat-cooling', 'cat-maintenance', 'cat-steering']
const PRODUCTS = ['p-hood', 'p-alternator', 'p-sensor', 'p-starter', 'p-tensioner', 'p-sprocket', 'p-headlight']

const sizes = (name) =>
  name === 'story-macro' ? [2400, 1200] : name.startsWith('cat') ? [1600, 1200] : [1200, 1200]

const server = await createServer({ root, configFile: false, logLevel: 'error', server: { port: 5199, hmr: false, watch: null } })
await server.listen()
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
mkdirSync(out, { recursive: true })
mkdirSync(pub, { recursive: true })

async function render(name, frames, scale = 1) {
  let [w, h] = sizes(name)
  w = Math.round(w * scale); h = Math.round(h * scale)
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  page.on('pageerror', (e) => console.error(name, e.message))
  page.on('console', (m) => m.type() === 'error' && console.error(name, m.text()))
  await page.goto('http://localhost:5199/tools/studio/index.html')
  await page.waitForFunction(() => window.__ready === true)
  await page.evaluate(([n, w, h]) => window.__init(n, w, h), [name, w, h])
  const dir = path.join(out, name)
  mkdirSync(dir, { recursive: true })
  const t0 = Date.now()
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.__frame(t), i / FPS)
    await page.locator('canvas').screenshot({ path: path.join(dir, `${String(i).padStart(4, '0')}.png`) })
  }
  console.log(`${name}: ${frames} frame(s) in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  await page.close()
  return dir
}

const grade = 'vignette=angle=PI/4.2,noise=alls=5:allf=t'
const ff = (...a) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...a], { stdio: 'inherit' })

async function still(name, outName, q = 82) {
  const dir = await render(name, 1, preview ? 0.5 : 1)
  const mood = name.startsWith('p-') ? 'noise=alls=2:allf=t' : grade
  ff('-i', path.join(dir, '0000.png'), '-vf', mood, '-c:v', 'libwebp', '-quality', String(q), path.join(pub, `${outName}.webp`))
}

try {
  if (arg === 'stills' || arg === 'all') {
    for (const c of CATS) await still(c, c)
    await still('story-macro', 'story-macro', 80)
    for (const p of PRODUCTS) await still(p, p, 84)
  } else for (const n of arg.split(',')) await still(n, n)
} finally {
  await browser.close()
  await server.close()
}
