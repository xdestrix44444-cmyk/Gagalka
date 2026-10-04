// Шаблон «Нить» для готового рисунка: любая детальная картинка (рисунок художника или
// генерация) приводится к стилю колоды — 5 оттенков серого, штриховка строками, потёки, рамка.
// Карта получается вдвое крупнее кодовых сцен: 320×480.

import { AX0, AX1, AY0, AY1, H, Ink, W, clamp, frame, hash, toPixels } from './ink'

export const K = 2
const LEVELS = [6, 50, 108, 174, 240]
const ROW = [0, 0.5, 0.25, 0.75]
const COL = [0, 0.5, 0.25, 0.75]
const thr = (x: number, y: number) => ROW[y & 3] * 0.78 + COL[x & 3] * 0.22 + 0.03

export function presetFromImage(canvas: HTMLCanvasElement, img: CanvasImageSource & { width: number; height: number }, top: string, bottom: string) {
  const w = W * K
  const h = H * K
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  // рамка из обычного шаблона, увеличенная вдвое
  const small = toPixels(new Ink(0))
  frame(small, top, bottom)
  const out = ctx.createImageData(w, h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const s = ((y >> 1) * W + (x >> 1)) * 4
      const t = (y * w + x) * 4
      out.data[t] = small[s]
      out.data[t + 1] = small[s + 1]
      out.data[t + 2] = small[s + 2]
      out.data[t + 3] = 255
    }
  // рисунок: заполняем окно с обрезкой по центру
  const ax0 = AX0 * K
  const ay0 = AY0 * K
  const aw = (AX1 - AX0) * K
  const ah = (AY1 - AY0) * K
  const tmp = document.createElement('canvas')
  tmp.width = aw
  tmp.height = ah
  const tc = tmp.getContext('2d')
  if (!tc) return
  const sc = Math.max(aw / img.width, ah / img.height)
  tc.drawImage(img, (aw - img.width * sc) / 2, (ah - img.height * sc) / 2, img.width * sc, img.height * sc)
  const src = tc.getImageData(0, 0, aw, ah).data
  const v = new Float32Array(aw * ah)
  for (let i = 0; i < aw * ah; i++) v[i] = (src[i * 4] * 0.3 + src[i * 4 + 1] * 0.55 + src[i * 4 + 2] * 0.15) / 255
  // потёки: светлые пиксели стекают вниз
  for (let k = 0; k < 70; k++) {
    const x = Math.floor(hash(k, 11, 5) * aw)
    const y0 = Math.floor(hash(k, 12, 5) * (ah - 40))
    const len = 10 + Math.floor(hash(k, 13, 5) * 70)
    const s0 = v[y0 * aw + x]
    for (let j = 1; j < len && y0 + j < ah; j++) v[(y0 + j) * aw + x] = v[(y0 + j) * aw + x] * 0.5 + s0 * (1 - j / len) * 0.5
  }
  const n = LEVELS.length - 1
  for (let y = 0; y < ah; y++)
    for (let x = 0; x < aw; x++) {
      const p = clamp((v[y * aw + x] - 0.04) / 0.92) ** 1.1 * n
      const lo = Math.floor(p)
      const g = LEVELS[Math.min(n, thr(x, y) < p - lo ? lo + 1 : lo)]
      const t = ((ay0 + y) * w + ax0 + x) * 4
      out.data[t] = g
      out.data[t + 1] = g
      out.data[t + 2] = Math.min(255, g + 3)
    }
  ctx.putImageData(out, 0, 0)
}
