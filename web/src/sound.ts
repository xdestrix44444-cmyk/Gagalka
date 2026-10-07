// Звук «Нити»: всё синтезируется Web Audio, без файлов. По умолчанию выключен, включается кнопкой ♪.
// Браузеры разрешают звук только после жеста пользователя, поэтому контекст создаётся при включении.

const KEY = 'nit.sound.v1'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let drone: { stop: () => void } | null = null

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return { ctx, out: master! }
}

function noiseBuffer(c: AudioContext, seconds: number): AudioBuffer {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return buf
}

/** Тихий гул: две расстроенные низкие ноты и шум за фильтром, медленно «дышит». */
function startDrone() {
  const a = audio()
  if (!a || drone) return
  const { ctx: c, out } = a
  const g = c.createGain()
  g.gain.value = 0
  g.gain.linearRampToValueAtTime(0.07, c.currentTime + 3)
  g.connect(out)
  const oscs = [55, 55.4, 82.6].map((f) => {
    const o = c.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = f
    return o
  })
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 220
  const lfo = c.createOscillator()
  const lfoGain = c.createGain()
  lfo.frequency.value = 0.07
  lfoGain.gain.value = 120
  lfo.connect(lfoGain).connect(lp.frequency)
  oscs.forEach((o) => o.connect(lp))
  const hiss = c.createBufferSource()
  hiss.buffer = noiseBuffer(c, 2)
  hiss.loop = true
  const hissGain = c.createGain()
  hissGain.gain.value = 0.12
  hiss.connect(hissGain).connect(lp)
  lp.connect(g)
  ;[...oscs, lfo, hiss].forEach((n) => n.start())
  drone = {
    stop: () => {
      g.gain.cancelScheduledValues(c.currentTime)
      g.gain.setValueAtTime(g.gain.value, c.currentTime)
      g.gain.linearRampToValueAtTime(0, c.currentTime + 0.6)
      ;[...oscs, lfo, hiss].forEach((n) => n.stop(c.currentTime + 0.7))
      drone = null
    },
  }
}

export function setSound(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    // без сохранения
  }
  if (on) startDrone()
  else drone?.stop()
  // звук переключают и в шапке, и на экране входа: пусть обе кнопки знают
  window.dispatchEvent(new Event(SOUND_EVENT))
}

/** Событие на window при включении и выключении звука. */
export const SOUND_EVENT = 'nit-sound'

/** Возобновить гул после перезагрузки: вызывается из первого жеста пользователя. */
export function resumeSound() {
  if (soundEnabled()) startDrone()
}

/** Короткий всплеск шума через полосовой фильтр. */
function burst(freq: number, q: number, dur: number, vol: number, at = 0) {
  const a = audio()
  if (!a) return
  const { ctx: c, out } = a
  const t = c.currentTime + at
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c, dur)
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = freq
  bp.Q.value = q
  const g = c.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(bp).connect(g).connect(out)
  src.start(t)
}

function tone(freq: number, dur: number, vol: number, type: OscillatorType = 'square', at = 0, slideTo?: number) {
  const a = audio()
  if (!a) return
  const { ctx: c, out } = a
  const t = c.currentTime + at
  const o = c.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + dur + 0.02)
}

export type Sfx = 'tap' | 'shuffle' | 'flip' | 'static' | 'corrupt' | 'boot' | 'type'

export function play(sfx: Sfx) {
  if (!soundEnabled()) return
  switch (sfx) {
    case 'tap':
      tone(880, 0.04, 0.05)
      break
    case 'type':
      burst(3200, 6, 0.02, 0.05)
      break
    case 'shuffle':
      for (let i = 0; i < 6; i++) burst(1800 + i * 200, 1.2, 0.12, 0.18, i * 0.17)
      break
    case 'flip':
      burst(1200, 0.8, 0.09, 0.3)
      tone(196, 0.35, 0.05, 'triangle', 0.05, 147)
      break
    case 'static':
      burst(2400, 3, 0.35, 0.04, 0.64)
      break
    case 'corrupt':
      for (let i = 0; i < 8; i++) tone(80 + Math.random() * 900, 0.05, 0.07, 'square', 0.64 + i * 0.05)
      tone(110, 0.8, 0.08, 'sawtooth', 0.64, 40)
      break
    case 'boot':
      tone(110, 0.6, 0.06, 'sawtooth', 0, 220)
      tone(1760, 0.08, 0.04, 'square', 0.65)
      break
  }
}
