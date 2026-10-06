// Шаблон «Нить» для готового рисунка: рисунок вписывается в рамку колоды почти в исходном разрешении.
// Рисунки из Gemini уже пиксельные и тёмные, поэтому цвет лишь слегка приглушается, без штриховки;
// немного потёков связывает их с рамкой. Карта вчетверо крупнее кодовых сцен: 640×960.

import { AX0, AX1, AY0, AY1, H, Ink, W, clamp, frame, hash, labels, toPixels } from './ink'

export const K = 4
const LEVELS = [6, 50, 108, 174, 240]
const ROW = [0, 0.5, 0.25, 0.75]
const COL = [0, 0.5, 0.25, 0.75]
const thr = (x: number, y: number) => ROW[y & 3] * 0.78 + COL[x & 3] * 0.22 + 0.03


export function presetFromImage(
  canvas: HTMLCanvasElement,
  img: CanvasImageSource & { width: number; height: number },
  top: string,
  bottom: string,
  color = true,
  framed = true,
) {
  const w = W * K
  const h = H * K
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const out = ctx.createImageData(w, h)
  if (framed) {
    // рамка из обычного шаблона, увеличенная вдвое; подписи потом рисуются поверх в полном разрешении
    const small = toPixels(new Ink(0))
    frame(small, '', '')
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const s = (Math.floor(y / K) * W + Math.floor(x / K)) * 4
        const t = (y * w + x) * 4
        out.data[t] = small[s]
        out.data[t + 1] = small[s + 1]
        out.data[t + 2] = small[s + 2]
        out.data[t + 3] = 255
      }
  } else for (let t = 3; t < out.data.length; t += 4) out.data[t] = 255
  // рисунок: заполняем окно (или всю карту без рамки) с обрезкой по центру
  const ax0 = framed ? AX0 * K : 0
  const ay0 = framed ? AY0 * K : 0
  const aw = framed ? (AX1 - AX0) * K : w
  const ah = framed ? (AY1 - AY0) * K : h
  const tmp = document.createElement('canvas')
  tmp.width = aw
  tmp.height = ah
  const tc = tmp.getContext('2d')
  if (!tc) return
  const sc = Math.max(aw / img.width, ah / img.height)
  tc.drawImage(img, (aw - img.width * sc) / 2, (ah - img.height * sc) / 2, img.width * sc, img.height * sc)
  const src = tc.getImageData(0, 0, aw, ah).data
  const v = new Float32Array(aw * ah)
  const rgb = new Float32Array(aw * ah * 3)
  for (let i = 0; i < aw * ah; i++) {
    const r = src[i * 4] / 255
    const g = src[i * 4 + 1] / 255
    const b = src[i * 4 + 2] / 255
    const l = r * 0.3 + g * 0.55 + b * 0.15
    v[i] = l
    // цвет приглушаем совсем чуть-чуть и слегка приподнимаем средние тона: рисунки и так тёмные
    for (const [k, c] of [r, g, b].entries()) rgb[i * 3 + k] = clamp(l + (c - l) * 0.9) ** 0.92
  }
  // редкие потёки: светлые пиксели стекают вниз полоской в два пикселя, чтобы не теряться при уменьшении
  for (let k = 0; k < 24; k++) {
    const x = Math.floor(hash(k, 11, 5) * (aw - 1))
    const y0 = Math.floor(hash(k, 12, 5) * (ah - 80))
    const len = 20 + Math.floor(hash(k, 13, 5) * 120)
    for (const dx of [0, 1]) {
      const i0 = y0 * aw + x + dx
      for (let j = 1; j < len && y0 + j < ah; j++) {
        const i = (y0 + j) * aw + x + dx
        const f = (1 - j / len) * 0.35
        v[i] = v[i] * (1 - f) + v[i0] * f
        for (let c = 0; c < 3; c++) rgb[i * 3 + c] = rgb[i * 3 + c] * (1 - f) + rgb[i0 * 3 + c] * f
      }
    }
  }
  if (color) {
    for (let y = 0; y < ah; y++)
      for (let x = 0; x < aw; x++) {
        const t = ((ay0 + y) * w + ax0 + x) * 4
        for (let c = 0; c < 3; c++) out.data[t + c] = Math.round(clamp(rgb[(y * aw + x) * 3 + c]) * 255)
      }
    if (framed) labels(out.data, top, bottom, K)
    ctx.putImageData(out, 0, 0)
    return
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
  if (framed) labels(out.data, top, bottom, K)
  ctx.putImageData(out, 0, 0)
}
