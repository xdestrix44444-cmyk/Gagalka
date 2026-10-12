// Звуки ролика из звукового движка приложения: гул и эффекты отрисовываются в OfflineAudioContext
// по расписанию. Левый канал — гул, правый — эффекты: громкость им выставляет сведение (mix.py).
import { renderSfx } from '../sound'
import type { Timeline } from './timeline'

const SR = 22050

/** Гул «Нити» (как startDrone в sound.ts): три расстроенные низкие ноты и шум за «дышащим» фильтром.
 *  Пропадает в тишине перед переворотами, гаснет вместе с кинескопом. */
function drone(c: OfflineAudioContext, out: AudioNode, tl: Timeline) {
  const level = 0.07
  const g = c.createGain()
  g.gain.setValueAtTime(0, 0)
  g.gain.linearRampToValueAtTime(level, 0.6)
  for (const [a, b] of tl.silence) {
    g.gain.setValueAtTime(level, a / 1000 - 0.08)
    g.gain.linearRampToValueAtTime(0, a / 1000)
    g.gain.setValueAtTime(0, b / 1000)
    g.gain.linearRampToValueAtTime(level, b / 1000 + 0.06)
  }
  g.gain.setValueAtTime(level, tl.off.start / 1000)
  g.gain.linearRampToValueAtTime(0, tl.off.end / 1000)
  g.connect(out)

  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 220
  const lfo = c.createOscillator()
  const lfoGain = c.createGain()
  lfo.frequency.value = 0.07
  lfoGain.gain.value = 120
  lfo.connect(lfoGain).connect(lp.frequency)
  const oscs = [55, 55.4, 82.6].map((f) => {
    const o = c.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = f
    o.connect(lp)
    return o
  })
  const noise = c.createBuffer(1, SR * 2, SR)
  const d = noise.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const hiss = c.createBufferSource()
  hiss.buffer = noise
  hiss.loop = true
  const hissGain = c.createGain()
  hissGain.gain.value = 0.12
  hiss.connect(hissGain).connect(lp)
  lp.connect(g)
  ;[...oscs, lfo, hiss].forEach((n) => n.start(0))
}

/** 16-битный WAV из отрисованного буфера, в base64 — чтобы отдать скрипту записи. */
function wavBase64(buf: AudioBuffer): string {
  const ch = buf.numberOfChannels
  const n = buf.length
  const bytes = new DataView(new ArrayBuffer(44 + n * ch * 2))
  const str = (o: number, s: string) => [...s].forEach((x, i) => bytes.setUint8(o + i, x.charCodeAt(0)))
  str(0, 'RIFF')
  bytes.setUint32(4, 36 + n * ch * 2, true)
  str(8, 'WAVEfmt ')
  bytes.setUint32(16, 16, true)
  bytes.setUint16(20, 1, true)
  bytes.setUint16(22, ch, true)
  bytes.setUint32(24, buf.sampleRate, true)
  bytes.setUint32(28, buf.sampleRate * ch * 2, true)
  bytes.setUint16(32, ch * 2, true)
  bytes.setUint16(34, 16, true)
  str(36, 'data')
  bytes.setUint32(40, n * ch * 2, true)
  const data = Array.from({ length: ch }, (_, k) => buf.getChannelData(k))
  let o = 44
  for (let i = 0; i < n; i++)
    for (let k = 0; k < ch; k++) {
      const v = Math.max(-1, Math.min(1, data[k][i]))
      bytes.setInt16(o, v * 32767, true)
      o += 2
    }
  let bin = ''
  const u8 = new Uint8Array(bytes.buffer)
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000))
  return btoa(bin)
}

/** Гул (левый канал) и эффекты (правый) на всю длину ролика. */
export async function renderTrack(tl: Timeline): Promise<string> {
  const c = new OfflineAudioContext(2, Math.ceil((tl.total / 1000) * SR), SR)
  const merge = c.createChannelMerger(2)
  merge.connect(c.destination)
  const droneBus = c.createGain()
  droneBus.connect(merge, 0, 0)
  const sfxBus = c.createGain()
  sfxBus.connect(merge, 0, 1)
  drone(c, droneBus, tl)
  renderSfx(
    c,
    sfxBus,
    tl.sfx.filter((s) => s.kind !== 'modem').map((s) => ({ sfx: s.kind, at: s.at / 1000, vol: s.vol })),
  )
  return wavBase64(await c.startRendering())
}
