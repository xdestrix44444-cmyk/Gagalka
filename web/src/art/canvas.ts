// Мини-движок «16-битной» живописи: буфер пикселей, палитры-рампы с цветовым сдвигом,
// дизеринг по матрице Байера, затенённые формы и обводка цветом тени (sel-out).

export const W = 128
export const H = 192
export const X0 = 8
export const Y0 = 8
export const X1 = W - 8
export const Y1 = H - 8

export type RGB = [number, number, number]
/** Функция цвета; null означает «не рисовать этот пиксель». */
export type Shader = (x: number, y: number) => RGB
export type ColorFn = (x: number, y: number) => RGB | null

export const hex = (s: string): RGB => {
  const n = parseInt(s.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
]

const SHADOW = hex('#150d2e')
const LIGHT = hex('#fff1c4')

/** Рампа из 6 тонов: от тёмной тени с холодным сдвигом до тёплого блика. */
export function ramp(base: string): RGB[] {
  const b = hex(base)
  return [mix(b, SHADOW, 0.72), mix(b, SHADOW, 0.48), mix(b, SHADOW, 0.22), b, mix(b, LIGHT, 0.24), mix(b, LIGHT, 0.5)]
}

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((r) => r.map((v) => (v + 0.5) / 16))
export const bayer = (x: number, y: number) => BAYER[y & 3][x & 3]

/** Выбор тона рампы по освещённости v (0–1) с дизерингом между соседними тонами. */
export function tone(r: RGB[], v: number, x: number, y: number): RGB {
  const p = Math.min(Math.max(v, 0), 1) * (r.length - 1)
  const lo = Math.floor(p)
  const frac = p - lo
  return r[bayer(x, y) < frac ? Math.min(lo + 1, r.length - 1) : lo]
}

export const hash = (x: number, y: number, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  return (((h ^ (h >>> 16)) >>> 0) % 10000) / 10000
}

export class Art {
  d = new Uint8ClampedArray(W * H * 4)
  fg = new Uint8Array(W * H)

  constructor() {
    for (let i = 0; i < W * H; i++) this.d[i * 4 + 3] = 255
  }

  set(x: number, y: number, c: RGB | null, fg = true) {
    if (!c) return
    x = Math.round(x)
    y = Math.round(y)
    if (x < X0 || x >= X1 || y < Y0 || y >= Y1) return
    const i = y * W + x
    this.d[i * 4] = c[0]
    this.d[i * 4 + 1] = c[1]
    this.d[i * 4 + 2] = c[2]
    if (fg) this.fg[i] = 1
  }

  get(x: number, y: number): RGB {
    const i = (y * W + x) * 4
    return [this.d[i], this.d[i + 1], this.d[i + 2]]
  }

  rect(x: number, y: number, w: number, h: number, f: ColorFn | RGB, fg = true) {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) this.set(i, j, typeof f === 'function' ? f(i, j) : f, fg)
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, f: ColorFn | RGB, fg = true) {
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++)
      for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
        const nx = (i - cx) / rx
        const ny = (j - cy) / ry
        if (nx * nx + ny * ny <= 1) this.set(i, j, typeof f === 'function' ? f(i, j) : f, fg)
      }
  }

  poly(pts: [number, number][], f: ColorFn | RGB, fg = true) {
    const ys = pts.map((p) => p[1])
    const minY = Math.floor(Math.min(...ys))
    const maxY = Math.ceil(Math.max(...ys))
    for (let y = minY; y <= maxY; y++) {
      const xs: number[] = []
      for (let k = 0; k < pts.length; k++) {
        const [ax, ay] = pts[k]
        const [bx, by] = pts[(k + 1) % pts.length]
        if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5))
          xs.push(ax + ((y + 0.5 - ay) / (by - ay)) * (bx - ax))
      }
      xs.sort((a, b) => a - b)
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, typeof f === 'function' ? f(x, y) : f, fg)
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: ColorFn | RGB, t = 1, fg = true) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
    for (let k = 0; k <= n; k++) {
      const x = x0 + ((x1 - x0) * k) / n
      const y = y0 + ((y1 - y0) * k) / n
      for (let j = 0; j < t; j++)
        for (let i = 0; i < t; i++) this.set(x + i - (t >> 1), y + j - (t >> 1), typeof c === 'function' ? c(Math.round(x), Math.round(y)) : c, fg)
    }
  }

  /** Мягкое свечение: точки заменяются цветом по дизерингу. Не считается объектом. */
  glow(cx: number, cy: number, r: number, c: RGB, strength = 1, ry = r) {
    for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++)
      for (let i = Math.floor(cx - r); i <= Math.ceil(cx + r); i++) {
        if (i < X0 || i >= X1 || j < Y0 || j >= Y1) continue
        const d = Math.hypot((i - cx) / r, (j - cy) / ry)
        if (d >= 1) continue
        const a = Math.pow(1 - d, 1.6) * strength
        if (bayer(i, j) < a) this.set(i, j, mix(this.get(i, j), c, 0.6), false)
      }
  }

  /** Обводка: пиксели фона, прилегающие к объекту, получают тёмный оттенок его цвета. */
  outline(strength = 0.72) {
    const out: [number, RGB][] = []
    for (let y = Y0; y < Y1; y++)
      for (let x = X0; x < X1; x++) {
        const i = y * W + x
        if (this.fg[i]) continue
        const n = [i - 1, i + 1, i - W, i + W].filter((k) => k >= 0 && k < W * H && this.fg[k] && this.inInner(k))
        if (!n.length) continue
        const k = n[0]
        const c: RGB = [this.d[k * 4], this.d[k * 4 + 1], this.d[k * 4 + 2]]
        out.push([i, mix(c, SHADOW, strength)])
      }
    for (const [i, c] of out) {
      this.d[i * 4] = c[0]
      this.d[i * 4 + 1] = c[1]
      this.d[i * 4 + 2] = c[2]
    }
  }

  private inInner(i: number) {
    const x = i % W
    const y = (i / W) | 0
    return x >= X0 && x < X1 && y >= Y0 && y < Y1
  }
}

// ---------- цветовые функции ----------

/** Сфера, освещённая сверху слева. */
export function sphere(r: RGB[], cx: number, cy: number, rx: number, ry = rx): Shader {
  return (x, y) => {
    const nx = (x - cx) / rx
    const ny = (y - cy) / ry
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))
    const v = nx * -0.45 + ny * -0.55 + nz * 0.7
    return tone(r, 0.12 + v * 0.78, x, y)
  }
}

/** Цилиндр (колонна, рука, ствол): свет слева. */
export function cylinder(r: RGB[], x0: number, x1: number): Shader {
  return (x, y) => {
    const t = (x - x0) / Math.max(1, x1 - x0)
    return tone(r, 0.95 - t * 0.85 + (t > 0.06 && t < 0.2 ? 0.08 : 0), x, y)
  }
}

/** Ткань со складками: v зависит от x и от синусоиды складок. */
export function cloth(r: RGB[], x0: number, x1: number, folds: number, phase = 0, bias = 0.62): Shader {
  return (x, y) => {
    const t = (x - x0) / Math.max(1, x1 - x0)
    const wave = Math.sin(t * folds * Math.PI * 2 + phase + y * 0.045) * 0.2
    return tone(r, bias + 0.18 - t * 0.28 + wave, x, y)
  }
}

export function vgrad(r: RGB[], y0: number, y1: number, rev = false): Shader {
  return (x, y) => {
    let t = (y - y0) / Math.max(1, y1 - y0)
    if (rev) t = 1 - t
    return tone(r, 1 - t, x, y)
  }
}

/** Плавный градиент по стопам с дизерингом между 14 ступенями. */
export function gradient(stops: [number, string][], y0: number, y1: number, steps = 14): Shader {
  const cs = stops.map(([p, c]) => [p, hex(c)] as [number, RGB])
  const at = (t: number): RGB => {
    for (let k = 0; k + 1 < cs.length; k++) {
      if (t <= cs[k + 1][0]) {
        const u = (t - cs[k][0]) / (cs[k + 1][0] - cs[k][0] || 1)
        return mix(cs[k][1], cs[k + 1][1], Math.min(Math.max(u, 0), 1))
      }
    }
    return cs[cs.length - 1][1]
  }
  return (x, y) => {
    const t = Math.min(Math.max((y - y0) / (y1 - y0), 0), 1)
    const s = t * steps
    const lo = Math.floor(s)
    const frac = s - lo
    return at(Math.min((bayer(x, y) < frac ? lo + 1 : lo) / steps, 1))
  }
}

/** Каменная кладка/скала: базовый тон + шум + швы. */
export function stone(r: RGB[], brick?: { w: number; h: number }, light = 0.55): Shader {
  return (x, y) => {
    let v = light + (hash(x, y) - 0.5) * 0.22
    if (brick) {
      const row = Math.floor(y / brick.h)
      const bx = x + (row % 2) * (brick.w / 2)
      if (y % brick.h === 0) v -= 0.38
      else if (Math.floor(bx) % brick.w === 0) v -= 0.3
      else if (y % brick.h === 1) v += 0.14
    }
    return tone(r, v, x, y)
  }
}

export function frame(art: Art) {
  const put = (x: number, y: number, w: number, h: number, c: RGB) => {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++) {
        const k = (j * W + i) * 4
        art.d[k] = c[0]
        art.d[k + 1] = c[1]
        art.d[k + 2] = c[2]
      }
  }
  const gold = ramp('#c9962c')
  put(0, 0, W, H, hex('#0d0820'))
  // золотая фаска: сверху и слева светлее, снизу и справа темнее
  for (let k = 0; k < 6; k++) {
    const lightSide = gold[Math.min(5, 5 - Math.abs(k - 2))]
    const darkSide = gold[Math.max(0, 2 - Math.abs(k - 2))]
    put(2 + k, 2 + k, W - 4 - k * 2, 1, lightSide)
    put(2 + k, 2 + k, 1, H - 4 - k * 2, lightSide)
    put(2 + k, H - 3 - k, W - 4 - k * 2, 1, darkSide)
    put(W - 3 - k, 2 + k, 1, H - 4 - k * 2, darkSide)
  }
  put(7, 7, W - 14, H - 14, hex('#0d0820'))
}

export function cornerOrnaments(art: Art) {
  const g = ramp('#e8c872')
  const dark = hex('#0d0820')
  for (const [cx, cy] of [[11, 11], [W - 12, 11], [11, H - 12], [W - 12, H - 12]]) {
    for (let j = -5; j <= 5; j++)
      for (let i = -5; i <= 5; i++) {
        const d = Math.abs(i) + Math.abs(j)
        const k = ((cy + j) * W + cx + i) * 4
        const c = d <= 1 ? g[5] : d <= 3 ? g[3] : d <= 5 ? g[1] : null
        if (!c) continue
        art.d[k] = c[0]
        art.d[k + 1] = c[1]
        art.d[k + 2] = c[2]
      }
    const k = (cy * W + cx) * 4
    art.d[k] = dark[0]
    art.d[k + 1] = dark[1]
    art.d[k + 2] = dark[2]
  }
}
