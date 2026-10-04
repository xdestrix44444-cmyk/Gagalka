// Движок карт «Нить»: монохромная пиксельная графика в духе ASCII-хоррора.
// Сцена рисуется в буфер яркости (0 — чёрный, 1 — белый) затенёнными формами,
// затем переводится в 5 оттенков серого штриховкой по строкам, с потёками и рамкой.

export const W = 160
export const H = 240
/** Окно рисунка внутри рамки; сверху полоса номера, снизу полоса имени. */
export const AX0 = 8
export const AY0 = 20
export const AX1 = W - 8
export const AY1 = H - 32

export type Fn = (x: number, y: number) => number | null
type Src = Fn | number

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))

export const hash = (x: number, y: number, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  return (((h ^ (h >>> 16)) >>> 0) % 10000) / 10000
}

const at = (f: Src, x: number, y: number) => (typeof f === 'number' ? f : f(x, y))

export class Ink {
  v = new Float32Array(W * H)

  constructor(bg = 0.03) {
    this.v.fill(bg)
  }

  private ok(x: number, y: number) {
    return x >= AX0 && x < AX1 && y >= AY0 && y < AY1
  }

  get(x: number, y: number) {
    x = Math.round(x)
    y = Math.round(y)
    return this.ok(x, y) ? this.v[y * W + x] : 0
  }

  set(x: number, y: number, c: number | null, a = 1) {
    if (c === null) return
    x = Math.round(x)
    y = Math.round(y)
    if (!this.ok(x, y)) return
    const i = y * W + x
    this.v[i] = this.v[i] * (1 - a) + c * a
  }

  rect(x: number, y: number, w: number, h: number, f: Src, a = 1) {
    for (let j = Math.round(y); j < y + h; j++) for (let i = Math.round(x); i < x + w; i++) this.set(i, j, at(f, i, j), a)
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, f: Src, a = 1) {
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++)
      for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
        const nx = (i - cx) / rx
        const ny = (j - cy) / ry
        if (nx * nx + ny * ny <= 1) this.set(i, j, at(f, i, j), a)
      }
  }

  poly(pts: [number, number][], f: Src, a = 1) {
    const ys = pts.map((p) => p[1])
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const xs: number[] = []
      for (let k = 0; k < pts.length; k++) {
        const [ax, ay] = pts[k]
        const [bx, by] = pts[(k + 1) % pts.length]
        if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5)) xs.push(ax + ((y + 0.5 - ay) / (by - ay)) * (bx - ax))
      }
      xs.sort((p, q) => p - q)
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, at(f, x, y), a)
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, f: Src, t = 1, a = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
    for (let k = 0; k <= n; k++) {
      const x = x0 + ((x1 - x0) * k) / n
      const y = y0 + ((y1 - y0) * k) / n
      for (let j = 0; j < t; j++) for (let i = 0; i < t; i++) this.set(x + i - (t >> 1), y + j - (t >> 1), at(f, Math.round(x), Math.round(y)), a)
    }
  }

  /** Свет: прибавляет яркость с мягким спадом. */
  glow(cx: number, cy: number, r: number, s = 0.4, ry = r) {
    this.each(cx, cy, r, ry, (i, d) => (this.v[i] = clamp(this.v[i] + s * (1 - d) ** 2)))
  }

  /** Тень: затемняет с мягким спадом. */
  shade(cx: number, cy: number, r: number, s = 0.6, ry = r) {
    this.each(cx, cy, r, ry, (i, d) => (this.v[i] *= 1 - s * (1 - d) ** 1.4))
  }

  private each(cx: number, cy: number, rx: number, ry: number, fn: (i: number, d: number) => void) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        if (!this.ok(x, y)) continue
        const d = Math.hypot((x - cx) / rx, (y - cy) / ry)
        if (d < 1) fn(y * W + x, d)
      }
  }
}

// ── затенение: свет падает сверху слева, как на референсе ──
const L = (() => {
  const l = [-0.55, -0.6, 0.58]
  const n = Math.hypot(...l)
  return l.map((c) => c / n)
})()

export function sphere(cx: number, cy: number, rx: number, ry = rx, lo = 0.04, hi = 0.95): Fn {
  return (x, y) => {
    const nx = (x - cx) / rx
    const ny = (y - cy) / ry
    const d = nx * nx + ny * ny
    if (d > 1) return lo
    const l = clamp(nx * L[0] + ny * L[1] + Math.sqrt(1 - d) * L[2])
    return lo + (hi - lo) * l ** 1.3
  }
}

export function cyl(x0: number, x1: number, lo = 0.04, hi = 0.85): Fn {
  return (x) => {
    const t = clamp((x - x0) / (x1 - x0)) * 2 - 1
    const l = clamp(t * L[0] + Math.sqrt(Math.max(0, 1 - t * t)) * L[2] + 0.08)
    return lo + (hi - lo) * l ** 1.4
  }
}

export function vgrad(y0: number, y1: number, a: number, b: number): Fn {
  return (_, y) => a + (b - a) * clamp((y - y0) / (y1 - y0))
}

/** Ткань со складками: свет слева, тень справа и книзу. */
export function cloth(x0: number, x1: number, folds: number, lo = 0.04, hi = 0.7, phase = 0): Fn {
  return (x, y) => {
    const t = clamp((x - x0) / (x1 - x0))
    const f = 0.5 + 0.5 * Math.sin((t * folds + phase) * Math.PI * 2 + y * 0.03)
    return lo + (hi - lo) * clamp((0.2 + 0.7 * f) * (1 - t * 0.65) + (hash(x, y, 3) - 0.5) * 0.06)
  }
}

export function grain(f: Fn, amt = 0.08, seed = 0): Fn {
  return (x, y) => {
    const v = f(x, y)
    return v === null ? null : v + (hash(x, y, seed) - 0.5) * amt
  }
}

// ── эффекты ──

/** Вертикальные полосы-дождь на тёмном фоне. Только осветляют. */
export function rain(ink: Ink, seed: number, n: number, lo = 0.12, hi = 0.3) {
  for (let k = 0; k < n; k++) {
    const x = AX0 + Math.floor(hash(k, 1, seed) * (AX1 - AX0))
    const y0 = AY0 + Math.floor(hash(k, 2, seed) * (AY1 - AY0))
    const len = 8 + Math.floor(hash(k, 3, seed) * 50)
    const v = lo + hash(k, 4, seed) * (hi - lo)
    for (let j = 0; j < len; j++) ink.set(x, y0 + j, Math.max(ink.get(x, y0 + j), v * (1 - (j / len) * 0.7)))
  }
}

/** Потёк: тонкая струйка с каплей на конце. */
export function drip(ink: Ink, x: number, y: number, len: number, c = 0.85, w = 1) {
  for (let j = 0; j < len; j++) for (let i = 0; i < w; i++) ink.set(x + i, y + j, c, 0.9)
  ink.ellipse(x + (w - 1) / 2, y + len, w * 0.6 + 0.6, 1.4, c)
}

/** «Таяние»: пиксели стекают вниз полосами. */
export function melt(ink: Ink, seed: number, n: number, maxLen = 36) {
  for (let k = 0; k < n; k++) {
    const x = AX0 + Math.floor(hash(k, 11, seed) * (AX1 - AX0))
    const y = AY0 + Math.floor(hash(k, 12, seed) * (AY1 - AY0 - 20))
    const len = 6 + Math.floor(hash(k, 13, seed) * maxLen)
    const src = ink.get(x, y)
    for (let j = 1; j < len; j++) ink.set(x, y + j, ink.get(x, y + j) * 0.45 + src * (1 - j / len) * 0.55)
  }
}

/** Светящийся глаз: тёмная глазница и белая точка с ореолом. */
export function eye(ink: Ink, x: number, y: number, r = 1.4, socket = true) {
  if (socket) ink.shade(x, y, r * 3.4, 0.92, r * 2.6)
  ink.ellipse(x, y, r, r * 0.9, 1)
  ink.glow(x, y, r * 2.4, 0.22)
}

export type MaskKind = 'porcelain' | 'plague' | 'veil' | 'skull'

/** Голова в маске. Лиц нет: только маска, глазницы со светом и потёки. */
export function maskHead(ink: Ink, cx: number, cy: number, r: number, kind: MaskKind = 'porcelain', mouth: 'open' | 'slit' | 'none' = 'slit') {
  const ry = r * 1.28
  const ex = r * 0.42
  const ey = cy - ry * 0.12
  if (kind === 'veil') {
    ink.ellipse(cx, cy + 2, r + 3, ry + 4, cloth(cx - r - 3, cx + r + 3, 2, 0.03, 0.4))
    ink.rect(cx - r, ey - 2, 2 * r, 5, 0.02)
    for (const s of [-1, 1]) eye(ink, cx + s * ex, ey, Math.max(1, r * 0.12), false)
    return
  }
  ink.ellipse(cx, cy, r, ry, grain(sphere(cx, cy, r, ry, 0.05, 0.97), 0.06, 7))
  for (const s of [-1, 1]) {
    ink.shade(cx + s * ex, ey, r * 0.5, 1, r * 0.4)
    ink.ellipse(cx + s * ex, ey, r * 0.3, r * 0.24, 0.01)
    ink.shade(cx + s * r * 0.55, cy + ry * 0.35, r * 0.3, 0.5, r * 0.4)
    eye(ink, cx + s * ex, ey, Math.max(0.9, r * 0.11), false)
  }
  if (kind === 'plague') {
    ink.poly([[cx - r * 0.25, cy + 1], [cx + r * 0.25, cy + 1], [cx + 1, cy + ry * 1.5]], cyl(cx - r * 0.25, cx + r * 0.25, 0.05, 0.8))
    return
  }
  ink.line(cx + 1, ey + 2, cx + 1, cy + ry * 0.3, 0.3)
  if (kind === 'skull') {
    ink.ellipse(cx, cy + ry * 0.3, 1.5, 1.2, 0.02)
    for (let i = -3; i <= 3; i += 2) ink.rect(cx + i * r * 0.1, cy + ry * 0.55, 1, 2, 0.02)
  } else if (mouth === 'open') {
    ink.ellipse(cx, cy + ry * 0.56, r * 0.26, r * 0.34, 0.01)
  } else if (mouth === 'slit') {
    ink.line(cx - r * 0.28, cy + ry * 0.58, cx + r * 0.28, cy + ry * 0.58, 0.05)
  }
  // трещина и слёзы-потёки
  ink.line(cx + r * 0.25, cy - ry, cx + r * 0.1, ey - 2, 0.1)
  ink.line(cx + r * 0.1, ey - 2, cx + r * 0.2, ey + 3, 0.1)
  for (const s of [-1, 1]) drip(ink, cx + s * ex, ey + 2, Math.round(r * (s > 0 ? 0.9 : 0.6)), 0.12)
}

// ── перевод в пиксели ──

const LEVELS = [6, 50, 108, 174, 240]
const ROW = [0, 0.5, 0.25, 0.75]
const COL = [0, 0.5, 0.25, 0.75]
/** Порог штриховки: в основном зависит от строки, поэтому полутона ложатся горизонтальными чёрточками. */
const thr = (x: number, y: number) => ROW[y & 3] * 0.78 + COL[x & 3] * 0.22 + 0.03

export function toPixels(ink: Ink): Uint8ClampedArray<ArrayBuffer> {
  const d = new Uint8ClampedArray(W * H * 4)
  const n = LEVELS.length - 1
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      // тени глубже: тёмный фон остаётся чёрным, а не серой штриховкой
      const p = clamp((ink.v[i] - 0.05) / 0.95) ** 1.12 * n
      const lo = Math.floor(p)
      const g = LEVELS[Math.min(n, thr(x, y) < p - lo ? lo + 1 : lo)]
      d[i * 4] = g
      d[i * 4 + 1] = g
      d[i * 4 + 2] = Math.min(255, g + 3)
      d[i * 4 + 3] = 255
    }
  return d
}

function px(d: Uint8ClampedArray, x: number, y: number, g: number) {
  if (x < 0 || y < 0 || x >= W || y >= H) return
  const i = (y * W + x) * 4
  d[i] = g
  d[i + 1] = g
  d[i + 2] = Math.min(255, g + 3)
}

/** Текст пиксельной маской: рисуем шрифтом во временный холст и оставляем только плотные точки. */
function text(d: Uint8ClampedArray, s: string, cy: number, size: number, g: number) {
  const c = document.createElement('canvas')
  c.width = W
  c.height = size + 8
  const ctx = c.getContext('2d')
  if (!ctx) return
  let fs = size
  const setFont = () => {
    ctx.font = `700 ${fs}px ui-monospace, Menlo, Consolas, monospace`
    ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${Math.round(fs / 4)}px`
  }
  setFont()
  while (ctx.measureText(s).width > W - 28 && fs > 6) {
    fs--
    setFont()
  }
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(s, W / 2, c.height / 2)
  const m = ctx.getImageData(0, 0, c.width, c.height).data
  const top = Math.round(cy - c.height / 2)
  for (let y = 0; y < c.height; y++) for (let x = 0; x < W; x++) if (m[(y * W + x) * 4 + 3] > 120) px(d, x, top + y, g)
}

/** Рамка шаблона: чёрные поля, двойная тонкая линия, метки в углах, номер сверху и имя снизу. */
export function frame(d: Uint8ClampedArray, top: string, bottom: string) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < AX0 || x >= AX1 || y < AY0 || y >= AY1) px(d, x, y, 6)
  const box = (x0: number, y0: number, x1: number, y1: number, g: number) => {
    for (let x = x0; x <= x1; x++) {
      px(d, x, y0, g)
      px(d, x, y1, g)
    }
    for (let y = y0; y <= y1; y++) {
      px(d, x0, y, g)
      px(d, x1, y, g)
    }
  }
  box(2, 2, W - 3, H - 3, 108)
  box(4, 4, W - 5, H - 5, 50)
  box(AX0 - 1, AY0 - 1, AX1, AY1, 174)
  for (const [x, y] of [[AX0 - 1, AY0 - 1], [AX1, AY0 - 1], [AX0 - 1, AY1], [AX1, AY1]]) {
    for (let k = -3; k <= 3; k++) {
      px(d, x + k, y, 240)
      px(d, x, y + k, 240)
    }
  }
  // потёки с нижнего края рисунка на поле
  for (const x of [AX0 + 17, AX0 + 66, AX1 - 30]) for (let j = 1; j < 3 + (x % 3); j++) px(d, x, AY1 + j, 108)
  text(d, top, (AY0 - 1) / 2 + 1, 9, 240)
  text(d, bottom, (AY1 + H) / 2 - 1, 11, 240)
}
