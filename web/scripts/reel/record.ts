// Запись ролика: расписание → звуковая дорожка → кадры из Chrome → mp4 1080×1920.
// npx tsx scripts/reel/record.ts <папка ролика>   (FFMPEG — путь к ffmpeg, PYTHON — к python3)
// В папке должны быть plan.json, texts.json и voice/ (scripts/reel/audio/voice.py).
import { spawn, execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createServer } from 'vite'
import { buildTimeline, type Voices } from '../../src/reel/timeline'
import type { ReelPlan } from '../../src/reel/plan'

const FPS = 30
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg'
const PYTHON = process.env.PYTHON ?? 'python3'
const WEB = resolve(import.meta.dirname, '../..')

const reel = resolve(process.argv[2] ?? '')
const plan: ReelPlan = JSON.parse(readFileSync(join(reel, 'plan.json'), 'utf8'))
const texts = JSON.parse(readFileSync(join(reel, 'texts.json'), 'utf8'))
const voices: Voices = JSON.parse(readFileSync(join(reel, 'voice', 'durations.json'), 'utf8'))
const timeline = buildTimeline(voices, plan.cards.map((c) => c.state))
writeFileSync(join(reel, 'timeline.json'), JSON.stringify(timeline, null, 2))
console.log(`расписание: ${(timeline.total / 1000).toFixed(1)} с`)

execFileSync(PYTHON, [join(WEB, 'scripts/reel/audio/mix.py'), reel, join(WEB, 'src/sounds/modem.mp3')], { stdio: 'inherit' })

// страница ролика с dev-сервера Vite
const server = await createServer({ root: WEB, logLevel: 'error', server: { port: 5199, strictPort: false } })
await server.listen()
const base = server.resolvedUrls!.local[0]

const port = 9333
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'nit-reel-'))}`,
  '--hide-scrollbars', '--mute-audio', '--force-color-profile=srgb', '--window-size=360,640', 'about:blank',
], { stdio: 'ignore' })

async function json(url: string, method = 'GET') {
  for (let i = 0; i < 50; i++) {
    try {
      return await (await fetch(url, { method })).json()
    } catch {
      await new Promise((r) => setTimeout(r, 200))
    }
  }
  throw new Error('Chrome не отвечает')
}

const target = await json(`http://127.0.0.1:${port}/json/new?about:blank`, 'PUT')
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let seq = 0
const waiting = new Map<number, (v: any) => void>()
const events: ((m: any) => void)[] = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(String(e.data))
  if (m.id && waiting.has(m.id)) {
    waiting.get(m.id)!(m)
    waiting.delete(m.id)
  } else events.forEach((f) => f(m))
})
function cdp(method: string, params: object = {}): Promise<any> {
  const id = ++seq
  ws.send(JSON.stringify({ id, method, params }))
  return new Promise((res, rej) =>
    waiting.set(id, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result))),
  )
}
async function evaluate(expression: string) {
  const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'ошибка на странице')
  return r.result.value
}

await cdp('Page.enable')
await cdp('Runtime.enable')
events.push((m) => {
  if (m.method === 'Runtime.exceptionThrown') console.error('страница:', m.params.exceptionDetails.exception?.description)
})
await cdp('Emulation.setDeviceMetricsOverride', { width: 360, height: 640, deviceScaleFactor: 3, mobile: false })
await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `window.__REEL_DATA__ = ${JSON.stringify({ plan, texts, timeline })};` })
const loaded = new Promise((r) => events.push((m) => m.method === 'Page.loadEventFired' && r(null)))
await cdp('Page.navigate', { url: `${base}reel.html` })
await loaded
for (let i = 0; i < 100 && !(await evaluate('!!window.__reelReady')); i++) await new Promise((r) => setTimeout(r, 100))
await evaluate('window.__reelReady')

const out = join(reel, `${plan.sign.slug}.mp4`)
const ff = spawn(FFMPEG, [
  '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-i', join(reel, 'audio.wav'), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-shortest', '-movflags', '+faststart', out,
], { stdio: ['pipe', 'inherit', 'inherit'] })

const frames = Math.ceil((timeline.total / 1000) * FPS)
const shot = async () => Buffer.from((await cdp('Page.captureScreenshot', { format: 'jpeg', quality: 94 })).data, 'base64')
const started = Date.now()
for (let f = 0; f < frames; f++) {
  await evaluate(`window.__reelSeek(${(f * 1000) / FPS})`)
  const img = await shot()
  if (!ff.stdin.write(img)) await new Promise((r) => ff.stdin.once('drain', r))
  if (f % 90 === 0) process.stdout.write(`\rкадры ${f}/${frames}`)
}
ff.stdin.end()
await new Promise((r) => ff.on('close', r))
console.log(`\rкадры ${frames}/${frames} за ${((Date.now() - started) / 1000).toFixed(0)} с`)

// обложка: кадр с именем знака и тремя рубашками
await evaluate(`window.__reelSeek(${timeline.hook.end - 300})`)
writeFileSync(join(reel, 'cover.jpg'), await shot())

ws.close()
chrome.kill()
await server.close()
console.log(`→ ${out}`)
