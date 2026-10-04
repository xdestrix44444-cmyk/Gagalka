// Пиксельная колода, нарисованная кодом, в стиле «битой» игры: сетка 96×144,
// мотивы рисуются на логической сетке 48×72 (пиксель ×2), затем проходят
// обводку, дизеринг и глитч уже в полном разрешении, а поверх лежат «существа».
// Это набросок настроения. Позже арт можно заменить на нарисованный художником.

export const W = 96
export const H = 144
const LW = 48
const LH = 72
const S = 2

const C = {
  ink: '#120e22',
  gold: '#c9962c',
  line: '#e8c872',
  paper: '#f1e6c9',
  skin: '#e9b98a',
  night: '#241a47',
  violet: '#3a2c6e',
  violet2: '#5a46a0',
  sky: '#2a3f7a',
  teal: '#1f4f5a',
  green: '#2f7a4f',
  greenDark: '#1f4a3a',
  red: '#a8323f',
  redDark: '#4a1730',
  blue: '#3b57a8',
  water: '#2a4f9a',
  moon: '#f4efd0',
  stone: '#6c6486',
  stone2: '#4a4366',
  flame: '#e8793a',
  wood: '#7a5a2a',
  gray: '#8a8aa5',
  blood: '#c4161c',
  magenta: '#ff2bd6',
  cyan: '#2bffe0',
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

class Pen {
  constructor(
    private x: CanvasRenderingContext2D,
    private s = S,
  ) {}

  r(x: number, y: number, w: number, h: number, c: string) {
    this.x.fillStyle = c
    this.x.fillRect(x * this.s, y * this.s, w * this.s, h * this.s)
  }

  p(x: number, y: number, c: string) {
    this.r(x, y, 1, 1, c)
  }

  disc(cx: number, cy: number, r: number, c: string) {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.4) this.p(cx + x, cy + y, c)
  }

  ring(cx: number, cy: number, r: number, c: string, t = 1) {
    const inner = (r - t) * (r - t)
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) {
        const d = x * x + y * y
        if (d <= r * r + r * 0.4 && d >= inner) this.p(cx + x, cy + y, c)
      }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: string) {
    const dx = Math.abs(x1 - x0)
    const dy = -Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    let x = x0
    let y = y0
    for (;;) {
      this.p(x, y, c)
      if (x === x1 && y === y1) break
      const e2 = 2 * err
      if (e2 >= dy) {
        err += dy
        x += sx
      }
      if (e2 <= dx) {
        err += dx
        y += sy
      }
    }
  }

  /** Треугольник с вершиной сверху. */
  tri(cx: number, top: number, h: number, c: string) {
    for (let i = 0; i < h; i++) this.r(cx - i, top + i, 2 * i + 1, 1, c)
  }

  /** Фигурка человека: голова с пустыми глазами, плечи, ряса, расширяющаяся книзу. */
  person(cx: number, top: number, robe: string, small = false) {
    const head = small ? 2 : 3
    const rows = small ? 9 : 20
    this.disc(cx, top + head, head, C.skin)
    if (!small) {
      this.p(cx - 1, top + head, C.ink)
      this.p(cx + 1, top + head, C.ink)
    }
    const bodyTop = top + head * 2 + 1
    for (let i = 0; i < rows; i++) {
      const half = (small ? 2 : 3) + Math.floor(i / 4)
      this.r(cx - half, bodyTop + i, half * 2 + 1, 1, robe)
    }
  }

  stars(seed: number, count = 22, yMax = 44) {
    let s = seed
    for (let i = 0; i < count; i++) {
      s = (s * 9301 + 49297) % 233280
      const x = 6 + Math.floor((s / 233280) * (LW - 12))
      s = (s * 9301 + 49297) % 233280
      const y = 6 + Math.floor((s / 233280) * (yMax - 6))
      this.p(x, y, i % 3 ? C.violet2 : C.moon)
    }
  }

  crescent(cx: number, cy: number, r: number, bg: string) {
    this.disc(cx, cy, r, C.moon)
    this.disc(cx + Math.ceil(r * 0.5), cy - 1, r - 1, bg)
  }

  ground(y: number, c: string) {
    this.r(4, y, LW - 8, LH - 4 - y, c)
  }
}

const INNER = { x0: 8, y0: 8, x1: W - 8, y1: H - 8 }

function frame(x: CanvasRenderingContext2D, bg: string) {
  const raw = new Pen(x, 1)
  raw.r(0, 0, W, H, C.ink)
  raw.r(2, 2, W - 4, H - 4, C.gold)
  raw.r(4, 4, W - 8, H - 8, C.ink)
  raw.r(6, 6, W - 12, H - 12, C.line)
  x.save()
  x.beginPath()
  x.rect(INNER.x0, INNER.y0, INNER.x1 - INNER.x0, INNER.y1 - INNER.y0)
  x.clip()
  raw.r(INNER.x0, INNER.y0, INNER.x1 - INNER.x0, INNER.y1 - INNER.y0, bg)
  return { p: new Pen(x), raw }
}

function corners(p: Pen) {
  for (const [x, y] of [[5, 5], [LW - 8, 5], [5, LH - 8], [LW - 8, LH - 8]]) p.r(x, y, 3, 3, C.gold)
}

// ---------- «существа»: оригинальные образы в духе .exe-крипипаст ----------

type Entity = 'eyes' | 'smile' | 'tears' | 'faceless' | 'staticFace' | 'errorWin'

const entities: Record<Entity, (p: Pen, x: number, y: number, seed: number) => void> = {
  // Красные глаза из пустоты.
  eyes(p, x, y) {
    p.r(x, y, 22, 9, C.ink)
    p.r(x + 3, y + 3, 4, 3, C.blood)
    p.r(x + 15, y + 3, 4, 3, C.blood)
    p.p(x + 4, y + 4, '#ffd0d0')
    p.p(x + 16, y + 4, '#ffd0d0')
  },
  // Слишком широкая улыбка.
  smile(p, x, y) {
    p.r(x, y, 34, 12, C.ink)
    for (let i = 0; i < 10; i++) p.r(x + 3 + i * 3, y + 3, 2, 3, C.paper)
    for (let i = 0; i < 9; i++) p.r(x + 4 + i * 3, y + 7, 2, 3, C.paper)
    p.r(x + 1, y + 2, 2, 2, C.paper)
    p.r(x + 31, y + 2, 2, 2, C.paper)
  },
  // Красные потёки.
  tears(p, x, y) {
    for (let i = 0; i < 5; i++) {
      const len = 8 + ((i * 7) % 15)
      p.r(x + i * 3, y, 1, len, C.blood)
      p.r(x + i * 3 - 1, y + len, 3, 2, C.blood)
    }
  },
  // Безликая высокая фигура.
  faceless(p, x, y) {
    p.r(x + 2, y + 8, 4, 28, C.ink)
    p.r(x, y + 12, 1, 18, C.ink)
    p.r(x + 7, y + 12, 1, 18, C.ink)
    p.disc(x + 4, y + 4, 4, '#cfc8d8')
  },
  // Лицо из помех.
  staticFace(p, x, y, seed) {
    const rnd = mulberry32(seed)
    for (let j = 0; j < 16; j++)
      for (let i = 0; i < 14; i++) {
        const g = 70 + Math.floor(rnd() * 150)
        p.p(x + i, y + j, `rgb(${g},${g},${g})`)
      }
    p.r(x + 3, y + 5, 2, 3, C.ink)
    p.r(x + 9, y + 5, 2, 3, C.ink)
    p.r(x + 3, y + 11, 8, 1, C.ink)
  },
  // Окошко «программа не отвечает».
  errorWin(p, x, y) {
    p.r(x, y, 28, 18, '#c0c0c8')
    p.r(x, y, 28, 4, '#1a2a8a')
    p.r(x + 23, y + 1, 4, 2, '#c02020')
    p.r(x + 3, y + 7, 6, 6, '#c02020')
    p.r(x + 4, y + 8, 1, 1, '#fff')
    p.r(x + 7, y + 8, 1, 1, '#fff')
    p.r(x + 5, y + 9, 2, 2, '#fff')
    p.r(x + 4, y + 11, 1, 1, '#fff')
    p.r(x + 7, y + 11, 1, 1, '#fff')
    p.r(x + 11, y + 8, 14, 1, '#444')
    p.r(x + 11, y + 11, 10, 1, '#444')
    p.r(x + 9, y + 14, 10, 3, '#e0e0e8')
  },
}

/** Какое существо живёт на какой карте и где (координаты на сетке 96×144). */
const placements: Record<number, [Entity, number, number]> = {
  0: ['smile', 12, 114],
  1: ['eyes', 60, 12],
  2: ['tears', 44, 40],
  3: ['faceless', 70, 70],
  4: ['staticFace', 58, 110],
  5: ['errorWin', 56, 100],
  6: ['eyes', 12, 112],
  7: ['faceless', 66, 96],
  8: ['smile', 8, 118],
  9: ['eyes', 56, 16],
  10: ['errorWin', 34, 118],
  11: ['tears', 60, 30],
  12: ['staticFace', 60, 44],
  13: ['faceless', 70, 86],
  14: ['eyes', 10, 14],
  15: ['smile', 50, 114],
  16: ['errorWin', 10, 76],
  17: ['faceless', 60, 80],
  18: ['eyes', 56, 62],
  19: ['staticFace', 68, 96],
  20: ['tears', 20, 60],
  21: ['smile', 24, 118],
}

// ---------- постобработка: обводка, дизеринг, глитч ----------

interface PostOptions {
  outline: boolean
  shade: boolean
  seed: number
}

function postprocess(x: CanvasRenderingContext2D, bg: string, o: PostOptions) {
  const { x0, y0, x1, y1 } = INNER
  const img = x.getImageData(0, 0, W, H)
  const d = img.data
  const src = new Uint8ClampedArray(d)
  const [br, bgc, bb] = rgb(bg)
  const [ir, ig, ib] = rgb(C.ink)
  const mask = new Uint8Array(W * H)
  for (let y = y0; y < y1; y++)
    for (let xx = x0; xx < x1; xx++) {
      const i = (y * W + xx) * 4
      mask[y * W + xx] = src[i] === br && src[i + 1] === bgc && src[i + 2] === bb ? 0 : 1
    }
  const inside = (xx: number, y: number) => xx >= x0 && xx < x1 && y >= y0 && y < y1
  const m = (xx: number, y: number) => (inside(xx, y) ? mask[y * W + xx] : 0)

  for (let y = y0; y < y1; y++)
    for (let xx = x0; xx < x1; xx++) {
      const i = (y * W + xx) * 4
      if (!m(xx, y)) {
        if (o.outline && (m(xx - 1, y) || m(xx + 1, y) || m(xx, y - 1) || m(xx, y + 1))) {
          d[i] = ir
          d[i + 1] = ig
          d[i + 2] = ib
        }
      } else if (o.shade && (xx + y) % 2 === 0 && (!m(xx + 1, y) || !m(xx, y + 1))) {
        d[i] = src[i] * 0.68
        d[i + 1] = src[i + 1] * 0.68
        d[i + 2] = src[i + 2] * 0.68
      }
    }

  // Глитч: сдвинутые горизонтальные полосы с расщеплением красного канала.
  const rnd = mulberry32(o.seed * 7919 + 13)
  const bands = 3 + Math.floor(rnd() * 3)
  const row = new Uint8ClampedArray((x1 - x0) * 4)
  for (let b = 0; b < bands; b++) {
    const by = y0 + Math.floor(rnd() * (y1 - y0 - 5))
    const bh = 1 + Math.floor(rnd() * 4)
    const shift = (rnd() < 0.5 ? -1 : 1) * (3 + Math.floor(rnd() * 9))
    for (let y = by; y < by + bh; y++) {
      for (let xx = x0; xx < x1; xx++) {
        const sx = x0 + ((xx - x0 - shift + (x1 - x0) * 4) % (x1 - x0))
        const si = (y * W + sx) * 4
        const ri = (y * W + Math.min(x1 - 1, Math.max(x0, sx + 2))) * 4
        const o4 = (xx - x0) * 4
        row[o4] = d[ri]
        row[o4 + 1] = d[si + 1]
        row[o4 + 2] = d[si + 2]
        row[o4 + 3] = 255
      }
      for (let xx = x0; xx < x1; xx++) {
        const i = (y * W + xx) * 4
        const o4 = (xx - x0) * 4
        d[i] = row[o4]
        d[i + 1] = row[o4 + 1]
        d[i + 2] = row[o4 + 2]
      }
    }
  }
  // Битые блоки.
  const palette = [C.magenta, C.cyan, C.paper, C.ink]
  for (let k = 0; k < 7; k++) {
    const bx = x0 + Math.floor(rnd() * (x1 - x0 - 8))
    const by = y0 + Math.floor(rnd() * (y1 - y0 - 4))
    const bw = 2 + Math.floor(rnd() * 6)
    const bh = 1 + Math.floor(rnd() * 3)
    const [pr, pg, pb] = rgb(palette[Math.floor(rnd() * palette.length)])
    for (let y = by; y < by + bh; y++)
      for (let xx = bx; xx < bx + bw; xx++) {
        const i = (y * W + xx) * 4
        d[i] = pr
        d[i + 1] = pg
        d[i + 2] = pb
      }
  }
  x.putImageData(img, 0, 0)
}

type Motif = (p: Pen) => void

const motifs: Record<number, { bg: string; draw: Motif }> = {
  0: {
    bg: C.sky,
    draw: (p) => {
      p.disc(36, 14, 5, C.gold)
      p.ground(48, C.stone2)
      p.r(4, 48, 26, 3, C.green)
      p.person(20, 22, C.paper)
      p.line(27, 28, 33, 44, C.wood)
      p.r(26, 24, 3, 3, C.red)
    },
  },
  1: {
    bg: C.redDark,
    draw: (p) => {
      p.ring(20, 13, 4, C.gold)
      p.ring(28, 13, 4, C.gold)
      p.person(24, 22, C.paper)
      p.r(18, 38, 12, 5, C.red)
      p.line(31, 32, 37, 20, C.gold)
      p.r(8, 52, 32, 3, C.stone)
      for (const x of [12, 19, 26, 33]) p.r(x, 47, 3, 4, C.gold)
    },
  },
  2: {
    bg: C.night,
    draw: (p) => {
      p.r(7, 12, 5, 54, C.paper)
      p.r(36, 12, 5, 54, C.ink)
      p.crescent(24, 14, 5, C.night)
      p.person(24, 24, C.blue)
      p.r(21, 44, 6, 2, C.moon)
    },
  },
  3: {
    bg: C.greenDark,
    draw: (p) => {
      for (let x = 6; x < 42; x += 4) {
        p.r(x, 56, 1, 10, C.gold)
        p.r(x - 1, 54, 3, 3, C.gold)
      }
      p.person(24, 18, C.red)
      for (const [x, y] of [[20, 14], [24, 12], [28, 14]]) p.p(x, y, C.line)
      p.ring(24, 21, 9, C.moon)
    },
  },
  4: {
    bg: C.redDark,
    draw: (p) => {
      p.r(12, 16, 24, 48, C.stone2)
      p.r(10, 44, 28, 4, C.stone)
      p.person(24, 20, C.red)
      p.r(21, 14, 7, 2, C.gold)
      p.line(34, 28, 34, 52, C.gold)
      p.disc(34, 27, 2, C.gold)
    },
  },
  5: {
    bg: C.violet,
    draw: (p) => {
      p.r(24, 8, 1, 54, C.gold)
      for (const y of [10, 14, 18]) p.r(20 - (y - 10) / 4, y, 9 + (y - 10) / 2, 1, C.gold)
      p.person(24, 26, C.red)
      p.r(21, 40, 7, 14, C.paper)
      p.r(9, 52, 6, 10, C.paper)
      p.r(33, 52, 6, 10, C.paper)
    },
  },
  6: {
    bg: C.teal,
    draw: (p) => {
      p.tri(24, 26, 24, C.stone2)
      p.disc(24, 12, 6, C.gold)
      for (let a = 0; a < 8; a++) {
        const dx = Math.round(Math.cos((a * Math.PI) / 4) * 10)
        const dy = Math.round(Math.sin((a * Math.PI) / 4) * 10)
        p.line(24 + Math.round(dx * 0.7), 12 + Math.round(dy * 0.7), 24 + dx, 12 + dy, C.line)
      }
      p.person(13, 32, C.red)
      p.person(35, 32, C.blue)
      p.ground(60, C.green)
    },
  },
  7: {
    bg: C.night,
    draw: (p) => {
      p.r(8, 12, 32, 3, C.violet2)
      for (const x of [12, 19, 26, 33]) p.p(x, 17, C.moon)
      p.person(24, 18, C.blue)
      p.r(10, 38, 28, 12, C.stone)
      p.ring(14, 54, 5, C.gold, 2)
      p.ring(34, 54, 5, C.gold, 2)
      p.disc(16, 62, 3, C.ink)
      p.disc(32, 62, 3, C.paper)
    },
  },
  8: {
    bg: '#4a3a14',
    draw: (p) => {
      p.ring(20, 12, 4, C.gold)
      p.ring(28, 12, 4, C.gold)
      p.person(16, 24, C.paper)
      p.r(24, 46, 14, 9, C.gold)
      p.r(26, 55, 2, 6, C.gold)
      p.r(34, 55, 2, 6, C.gold)
      p.disc(38, 48, 6, C.flame)
      p.disc(38, 48, 3, C.gold)
    },
  },
  9: {
    bg: '#252b45',
    draw: (p) => {
      p.tri(24, 30, 36, C.stone2)
      p.person(20, 28, C.gray)
      p.line(12, 32, 12, 64, C.wood)
      p.disc(30, 44, 7, C.moon)
      p.disc(30, 44, 3, C.gold)
      p.p(30, 44, C.flame)
    },
  },
  10: {
    bg: C.violet,
    draw: (p) => {
      p.ring(24, 36, 16, C.gold, 2)
      p.ring(24, 36, 6, C.gold, 2)
      for (let a = 0; a < 8; a++) {
        const dx = Math.round(Math.cos((a * Math.PI) / 4) * 16)
        const dy = Math.round(Math.sin((a * Math.PI) / 4) * 16)
        p.line(24, 36, 24 + dx, 36 + dy, C.gold)
      }
      for (const [x, y] of [[6, 8], [36, 8], [6, 58], [36, 58]]) p.r(x, y, 5, 5, C.paper)
    },
  },
  11: {
    bg: C.redDark,
    draw: (p) => {
      p.person(22, 12, C.red)
      p.r(33, 18, 1, 34, C.paper)
      p.r(30, 24, 7, 1, C.gold)
      p.r(6, 44, 20, 1, C.gold)
      p.line(8, 44, 8, 52, C.gold)
      p.line(24, 44, 24, 52, C.gold)
      p.r(5, 52, 7, 2, C.gold)
      p.r(21, 52, 7, 2, C.gold)
      p.r(16, 44, 1, 14, C.gold)
    },
  },
  12: {
    bg: C.night,
    draw: (p) => {
      p.r(8, 10, 32, 3, C.wood)
      p.r(8, 10, 3, 56, C.wood)
      p.r(35, 10, 3, 56, C.wood)
      p.line(24, 13, 24, 18, C.paper)
      p.r(21, 18, 7, 12, C.blue)
      p.r(22, 30, 5, 10, C.red)
      p.disc(24, 44, 3, C.skin)
      p.ring(24, 44, 6, C.gold)
    },
  },
  13: {
    bg: '#1a1424',
    draw: (p) => {
      p.disc(24, 50, 9, C.gold)
      p.ground(54, C.ink)
      p.line(10, 14, 10, 58, C.wood)
      p.r(10, 14, 22, 16, C.ink)
      p.r(10, 14, 22, 1, C.paper)
      p.r(10, 29, 22, 1, C.paper)
      p.disc(21, 22, 4, C.paper)
      p.disc(21, 22, 2, C.red)
      for (let x = 6; x < 42; x += 6) p.r(x, 60, 4, 1, C.water)
    },
  },
  14: {
    bg: C.teal,
    draw: (p) => {
      p.tri(10, 22, 12, C.gold)
      p.tri(38, 22, 12, C.gold)
      p.person(24, 18, C.paper)
      p.r(10, 40, 5, 6, C.paper)
      p.r(32, 42, 5, 6, C.paper)
      p.line(15, 42, 32, 46, '#6ab0ff')
      p.ground(58, C.green)
    },
  },
  15: {
    bg: '#2a0f1f',
    draw: (p) => {
      p.tri(10, 14, 14, C.stone2)
      p.tri(38, 14, 14, C.stone2)
      p.person(24, 12, C.ink)
      p.tri(19, 11, 4, C.red)
      p.tri(29, 11, 4, C.red)
      p.r(14, 40, 20, 6, C.stone2)
      p.line(24, 38, 12, 52, C.gold)
      p.line(24, 38, 36, 52, C.gold)
      p.person(12, 48, C.red, true)
      p.person(36, 48, C.red, true)
    },
  },
  16: {
    bg: C.night,
    draw: (p) => {
      p.stars(11)
      p.r(18, 24, 14, 24, C.stone)
      p.r(18, 24, 3, 24, C.stone2)
      p.r(16, 20, 18, 4, C.stone)
      for (const x of [16, 20, 24, 28, 32]) p.r(x, 17, 2, 3, C.stone)
      p.r(23, 30, 4, 6, C.ink)
      p.r(23, 38, 4, 6, C.ink)
      p.r(14, 48, 22, 3, C.stone2)
      for (const [x, y] of [[38, 6], [36, 9], [34, 12], [36, 14], [33, 18]]) p.r(x, y, 3, 3, C.paper)
      p.r(16, 16, 3, 3, C.red)
      p.r(30, 17, 3, 3, C.flame)
      p.r(22, 14, 3, 3, C.flame)
      p.disc(10, 56, 2, C.skin)
      p.disc(38, 58, 2, C.skin)
      p.ground(64, C.ink)
    },
  },
  17: {
    bg: C.night,
    draw: (p) => {
      p.stars(3)
      for (let y = -14; y <= 14; y++)
        for (let x = -14; x <= 14; x++) {
          const a = Math.abs(x)
          const b = Math.abs(y)
          const on = a + b <= 4 || (a <= 1 && b <= 13) || (b <= 1 && a <= 13) || (a <= 5 && b <= 5 && a * b <= 4 && a + b <= 9)
          if (on) p.p(24 + x, 28 + y, a + b <= 2 ? C.paper : C.gold)
        }
      p.r(4, 52, LW - 8, 16, C.water)
      for (let x = 6; x < 42; x += 6) p.r(x, 56, 4, 1, C.moon)
      p.person(16, 40, C.skin, true)
    },
  },
  18: {
    bg: C.night,
    draw: (p) => {
      p.stars(7, 18, 30)
      p.disc(24, 20, 10, C.moon)
      p.disc(29, 22, 8, C.night)
      p.r(6, 40, 8, 22, C.stone2)
      p.r(34, 40, 8, 22, C.stone2)
      p.r(6, 38, 8, 2, C.stone)
      p.r(34, 38, 8, 2, C.stone)
      p.r(20, 42, 8, 26, C.violet2)
      p.r(22, 56, 4, 12, C.violet)
      p.p(16, 60, C.paper)
      p.p(33, 60, C.paper)
    },
  },
  19: {
    bg: '#3a5fb0',
    draw: (p) => {
      for (let a = 0; a < 16; a++) {
        const dx = Math.cos((a * Math.PI) / 8)
        const dy = Math.sin((a * Math.PI) / 8)
        p.line(24 + Math.round(dx * 12), 24 + Math.round(dy * 12), 24 + Math.round(dx * 18), 24 + Math.round(dy * 18), a % 2 ? C.gold : C.flame)
      }
      p.disc(24, 24, 10, C.gold)
      p.disc(24, 24, 6, C.line)
      p.ground(54, C.stone2)
      p.person(24, 44, C.paper, true)
      p.r(32, 44, 1, 10, C.wood)
      p.r(33, 44, 4, 3, C.red)
    },
  },
  20: {
    bg: '#3a4d6a',
    draw: (p) => {
      p.tri(12, 14, 12, C.paper)
      p.tri(36, 14, 12, C.paper)
      p.person(24, 8, C.paper)
      p.line(28, 18, 38, 14, C.gold)
      p.disc(39, 14, 3, C.gold)
      p.r(4, 36, LW - 8, 4, C.paper)
      for (const x of [10, 24, 38]) p.person(x, 46, C.stone, true)
    },
  },
  21: {
    bg: C.violet,
    draw: (p) => {
      p.ring(24, 36, 17, C.green, 3)
      p.r(22, 17, 5, 3, C.red)
      p.r(22, 52, 5, 3, C.red)
      p.person(24, 26, C.paper)
      p.line(18, 38, 14, 44, C.gold)
      p.line(30, 38, 34, 44, C.gold)
      for (const [x, y] of [[6, 8], [36, 8], [6, 58], [36, 58]]) p.r(x, y, 5, 5, C.gold)
    },
  },
}

/** Рисует лицевую сторону карты (id 0–21) на canvas размером W×H. */
export function drawCardFace(canvas: HTMLCanvasElement, id: number) {
  canvas.width = W
  canvas.height = H
  const x = canvas.getContext('2d', { willReadFrequently: true })
  const motif = motifs[id]
  if (!x || !motif) return
  x.imageSmoothingEnabled = false
  const { p, raw } = frame(x, motif.bg)
  motif.draw(p)
  const place = placements[id]
  if (place) entities[place[0]](raw, place[1], place[2], id + 1)
  x.restore()
  postprocess(x, motif.bg, { outline: true, shade: true, seed: id + 1 })
  corners(p)
}

/** Рисует рубашку карты. */
export function drawCardBack(canvas: HTMLCanvasElement) {
  canvas.width = W
  canvas.height = H
  const x = canvas.getContext('2d', { willReadFrequently: true })
  if (!x) return
  x.imageSmoothingEnabled = false
  const { p } = frame(x, C.violet)
  for (let y = 6; y < LH - 6; y += 4)
    for (let xx = 6; xx < LW - 6; xx += 4) p.r(xx, y, 2, 2, ((xx + y) / 4) % 2 === 0 ? C.gold : C.violet2)
  p.r(15, 25, 18, 22, C.ink)
  p.r(16, 26, 16, 20, C.paper)
  p.r(22, 31, 4, 4, C.gold)
  p.r(20, 35, 8, 2, C.gold)
  p.r(22, 37, 4, 4, C.gold)
  x.restore()
  postprocess(x, C.violet, { outline: false, shade: false, seed: 99 })
  corners(p)
}
