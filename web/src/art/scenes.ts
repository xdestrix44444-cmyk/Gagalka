import { Art, X0, X1, Y0, Y1, bayer, cloth, cylinder, gradient, hash, hex, mix, ramp, sphere, stone, tone, vgrad, type RGB } from './canvas'

const SKIN = ramp('#e9b48a')
const PALE = ramp('#e8d4d0')

interface FaceOpts {
  skin?: RGB[]
  eyes?: 'open' | 'hollow' | 'closed' | 'red'
  mouth?: 'smile' | 'flat' | 'grin' | 'none'
  look?: number
}

/** Лицо на затенённой сфере: глаза, брови, нос, рот, румянец. */
function head(a: Art, cx: number, cy: number, r: number, o: FaceOpts = {}) {
  const skin = o.skin ?? SKIN
  a.ellipse(cx, cy, r, r + 1, sphere(skin, cx, cy, r, r + 1))
  const ey = cy - 1
  const dx = Math.round(r * 0.45)
  for (const s of [-1, 1]) {
    const ex = cx + s * dx
    if (o.eyes === 'closed') {
      a.line(ex - 2, ey, ex + 2, ey, hex('#2a1a30'))
    } else if (o.eyes === 'hollow' || o.eyes === 'red') {
      a.rect(ex - 2, ey - 1, 4, 3, hex('#0a0614'))
      if (o.eyes === 'red') a.set(ex, ey, hex('#ff3040'))
    } else {
      a.rect(ex - 2, ey - 1, 4, 3, hex('#f4efe6'))
      const px = ex - 1 + Math.sign(o.look ?? 0)
      a.rect(px, ey - 1, 2, 3, hex('#2a1f4a'))
      a.set(px, ey - 1, hex('#ffffff'))
    }
    a.line(ex - 2, ey - 3, ex + 2, ey - 3 + (s > 0 ? 0 : 0), hex('#5a3a2a'))
  }
  a.set(cx, cy + 2, mix(skin[2], hex('#150d2e'), 0.4))
  a.set(cx, cy + 3, mix(skin[2], hex('#150d2e'), 0.4))
  const my = cy + Math.round(r * 0.62)
  if (o.mouth === 'smile') {
    a.line(cx - 2, my, cx + 2, my, hex('#7a2a38'))
    a.set(cx - 3, my - 1, hex('#7a2a38'))
    a.set(cx + 3, my - 1, hex('#7a2a38'))
  } else if (o.mouth === 'grin') {
    a.rect(cx - 4, my - 1, 9, 3, hex('#1a0a14'))
    for (let i = -3; i <= 3; i += 2) a.rect(cx + i, my - 1, 1, 1, hex('#f4efe6'))
  } else if (o.mouth !== 'none') {
    a.line(cx - 2, my, cx + 2, my, hex('#7a2a38'))
  }
  for (const s of [-1, 1]) if (bayer(cx, cy) > 0.3) a.set(cx + s * (dx + 1), cy + 2, mix(skin[3], hex('#ff7a8a'), 0.4))
}

/** Горный хребет колонками: сверху снег, ниже тени. */
function ridge(a: Art, pts: [number, number][], baseY: number, rock: RGB[], snow: RGB[] | null, snowDepth = 6) {
  const h = (x: number) => {
    for (let k = 0; k + 1 < pts.length; k++)
      if (x >= pts[k][0] && x <= pts[k + 1][0]) return pts[k][1] + ((x - pts[k][0]) / (pts[k + 1][0] - pts[k][0])) * (pts[k + 1][1] - pts[k][1])
    return baseY
  }
  for (let x = X0; x < X1; x++) {
    const top = Math.round(h(x))
    const slope = h(x + 1) - h(x - 1)
    for (let y = top; y < baseY; y++) {
      const d = y - top
      if (snow && d < snowDepth - Math.abs(slope) * 0.6 + (hash(x, y) - 0.5) * 3) a.set(x, y, tone(snow, 0.62 - slope * 0.06 - d * 0.03, x, y), false)
      else a.set(x, y, tone(rock, 0.55 - slope * 0.05 - d * 0.004 + (hash(x, y, 2) - 0.5) * 0.12, x, y), false)
    }
  }
}

function sky(a: Art, stops: [number, string][], y0 = Y0, y1 = Y1) {
  a.rect(X0, y0, X1 - X0, y1 - y0, gradient(stops, y0, y1), false)
}

function starfield(a: Art, seed: number, count: number, yMax: number, colors = ['#f4efd0', '#b8a8ff', '#ffffff']) {
  for (let i = 0; i < count; i++) {
    const x = X0 + 3 + Math.floor(hash(i, seed, 1) * (X1 - X0 - 6))
    const y = Y0 + 3 + Math.floor(hash(i, seed, 2) * (yMax - Y0 - 3))
    const c = hex(colors[i % colors.length])
    a.set(x, y, c, false)
    if (i % 5 === 0) {
      a.set(x - 1, y, mix(c, hex('#150d2e'), 0.5), false)
      a.set(x + 1, y, mix(c, hex('#150d2e'), 0.5), false)
      a.set(x, y - 1, mix(c, hex('#150d2e'), 0.5), false)
      a.set(x, y + 1, mix(c, hex('#150d2e'), 0.5), false)
    }
  }
}

/** Пара горящих глаз с угловыми зрачками. */
function glowEyes(a: Art, x: number, y: number, gap: number, col = '#ff3040', size = 1) {
  const c = hex(col)
  a.glow(x + gap / 2, y, gap + 7, c, 0.7, 7)
  for (const dx of [0, gap]) {
    a.rect(x + dx - 1, y - size, 3 + size, 1 + 2 * size, hex('#0a0614'), false)
    a.rect(x + dx, y - size + 1, 2 + size, 2 * size - 1 || 1, c, false)
    a.set(x + dx + 1, y, hex('#fff0f0'), false)
  }
}

function cardZero(a: Art) {
  sky(a, [[0, '#141b58'], [0.45, '#4a5ec0'], [0.78, '#e0905f'], [1, '#f6c785']], Y0, 134)
  a.glow(100, 38, 30, hex('#ffd890'), 1)
  a.ellipse(100, 38, 10, 10, sphere(ramp('#f4c04a'), 98, 35, 10), false)
  for (const [cx, cy, rx] of [[30, 60, 20], [100, 44, 16], [64, 100, 26]]) {
    a.ellipse(cx, cy, rx, 3, (x, y) => tone(ramp('#f0b6a0'), 0.55 + (hash(x, y) - 0.5) * 0.2, x, y), false)
  }
  ridge(a, [[8, 126], [24, 100], [36, 116], [52, 92], [70, 122], [88, 106], [104, 120], [120, 98]], 134, ramp('#5a4a98'), ramp('#e8ecff'), 7)
  // бездна справа
  a.rect(84, 132, X1 - 84, Y1 - 132, gradient([[0, '#8a7ab8'], [0.3, '#2c2268'], [1, '#08051a']], 132, Y1), false)
  glowEyes(a, 99, 162, 10, '#ff3040', 1)
  for (let i = 0; i < 11; i++) a.set(95 + i * 2, 170 + (i % 2), hex('#e8e0d8'), false)
  // утёс
  const cliff = stone(ramp('#6a5a8a'), undefined, 0.5)
  a.poly([[X0, 132], [84, 132], [88, 142], [81, 152], [91, 164], [83, 176], [89, Y1], [X0, Y1]], cliff)
  a.rect(X0, 132, 77, 5, (x, y) => tone(ramp('#3f9a58'), 0.6 + (hash(x, y) - 0.5) * 0.4 - (y - 132) * 0.08, x, y))
  for (let x = 12; x < 80; x += 6) a.line(x, 137, x + (hash(x, 1) > 0.5 ? 1 : -1), 140 + Math.floor(hash(x, 3) * 3), tone(ramp('#3f9a58'), 0.4, x, 138))
  // плащ
  a.poly([[54, 86], [32, 92], [24, 112], [36, 120], [54, 106]], cloth(ramp('#2a8a96'), 24, 54, 3, 0.5))
  // посох и узелок
  a.line(38, 64, 77, 108, hex('#7a5a2a'), 2)
  a.line(38, 64, 77, 108, hex('#a67c3a'), 1)
  a.ellipse(36, 66, 9, 8, sphere(ramp('#c9a266'), 33, 62, 9, 8))
  a.line(30, 60, 40, 72, hex('#7a5a2a'), 1)
  a.ellipse(43, 73, 2, 2, hex('#7a5a2a'))
  // ноги
  const hose = (x: number, y: number) => tone(((y >> 2) & 1 ? ramp('#c63a4a') : ramp('#e8c15a')), 0.62 - ((x - 58) % 8) * 0.03, x, y)
  a.poly([[58, 104], [66, 104], [67, 128], [59, 129]], hose)
  a.poly([[66, 104], [74, 104], [82, 118], [76, 123]], hose)
  const boot = ramp('#6a3a24')
  a.poly([[57, 127], [69, 127], [72, 132], [56, 132]], cylinder(boot, 56, 72))
  a.poly([[75, 120], [86, 118], [88, 123], [76, 127]], cylinder(boot, 75, 88))
  // туника пёстрая
  const red = ramp('#c63a4a')
  const gold = ramp('#e8c15a')
  a.poly([[52, 84], [76, 84], [80, 108], [54, 108]], (x, y) => {
    const k = (Math.floor((x + y) / 6) + Math.floor((x - y) / 6)) & 1
    return tone(k ? red : gold, 0.62 + 0.18 - ((x - 52) / 28) * 0.28 + Math.sin(x * 0.7 + y * 0.12) * 0.1, x, y)
  })
  a.rect(54, 102, 26, 4, cylinder(ramp('#c9962c'), 54, 80))
  a.rect(64, 101, 6, 6, tone(ramp('#e8c872'), 0.9, 0, 0))
  a.rect(66, 103, 2, 2, hex('#2a1a30'))
  // руки
  a.poly([[58, 86], [66, 86], [79, 102], [73, 107]], cloth(red, 58, 79, 1, 1))
  a.ellipse(77, 104, 3, 3, sphere(SKIN, 76, 103, 3))
  a.poly([[72, 86], [79, 84], [89, 72], [84, 68]], cloth(gold, 72, 89, 1, 2))
  a.ellipse(87, 70, 3, 3, sphere(SKIN, 86, 69, 3))
  a.line(88, 68, 90, 56, hex('#2a7a40'), 1)
  a.ellipse(90, 54, 4, 4, sphere(ramp('#f4efe6'), 88, 52, 4))
  a.ellipse(90, 54, 1.5, 1.5, hex('#d03a4a'))
  // шея, голова, шапка
  a.rect(62, 80, 8, 6, cylinder(SKIN, 62, 70))
  head(a, 66, 72, 9, { eyes: 'open', mouth: 'smile', look: 1 })
  a.poly([[56, 66], [66, 53], [77, 66], [66, 62]], cloth(red, 56, 77, 2, 0.4))
  a.rect(56, 64, 21, 3, cylinder(gold, 56, 77))
  a.ellipse(66, 53, 3, 3, sphere(ramp('#f4efe6'), 65, 52, 3))
  a.line(74, 60, 84, 50, hex('#f4efe6'), 2)
  a.line(84, 50, 90, 42, hex('#d03a4a'), 2)
  // собака с красными глазами
  const fur = ramp('#eee8e0')
  a.ellipse(40, 124, 9, 5, sphere(fur, 38, 121, 9, 5))
  a.ellipse(49, 119, 4, 4, sphere(fur, 48, 118, 4))
  a.ellipse(53, 121, 3, 2, sphere(fur, 52, 120, 3, 2))
  a.set(55, 120, hex('#150d2e'))
  a.poly([[45, 113], [49, 115], [46, 119]], hex('#9a90a8'))
  for (const lx of [33, 37, 43, 47]) a.rect(lx, 127, 2, 5, cylinder(fur, lx, lx + 2))
  a.line(31, 121, 28, 115, hex('#eee8e0'), 2)
  a.set(50, 118, hex('#ff3040'), false)
  a.glow(50, 118, 4, hex('#ff3040'), 0.9)
}


function flame(a: Art, x: number, y: number, h: number, w: number, seed = 0) {
  const layers: [string, number][] = [['#c4161c', 1], ['#e8541f', 0.8], ['#f6a22a', 0.58], ['#ffe27a', 0.34], ['#fff6d0', 0.16]]
  for (const [c, k] of layers) {
    const pts: [number, number][] = [[x - (w / 2) * k, y]]
    const n = 5
    for (let i = 0; i <= n; i++) {
      const t = i / n
      const wob = (hash(i, seed, 5) - 0.5) * w * 0.35 * k
      pts.push([x - (w / 2) * k * (1 - t) + wob, y - h * k * (t * 0.9 + (i % 2 ? 0.05 : 0))])
    }
    pts.push([x, y - h * k])
    for (let i = n; i >= 0; i--) {
      const t = i / n
      pts.push([x + (w / 2) * k * (1 - t) + (hash(i, seed, 7) - 0.5) * w * 0.3 * k, y - h * k * (t * 0.9 + (i % 2 ? 0 : 0.06))])
    }
    pts.push([x + (w / 2) * k, y])
    a.poly(pts, hex(c), false)
  }
  a.glow(x, y - h * 0.4, w + 8, hex('#ff8a30'), 0.5, h * 0.7)
}

function drip(a: Art, x: number, y: number, len: number) {
  a.line(x, y, x, y + len, hex('#b01820'), 1, false)
  a.rect(x - 1, y + len, 3, 2, hex('#e0303c'), false)
  a.set(x, y + 1, hex('#ff7a80'), false)
}

function cardOne(a: Art) {
  a.rect(X0, Y0, X1 - X0, Y1 - Y0, gradient([[0, '#12061c'], [0.5, '#34102c'], [1, '#5a1a30']], Y0, Y1), false)
  for (let i = 0; i < 26; i++) {
    const x = X0 + 4 + Math.floor(hash(i, 1, 1) * (X1 - X0 - 8))
    const y = Y0 + 4 + Math.floor(hash(i, 1, 2) * 120)
    a.set(x, y, mix(hex('#ffb060'), hex('#5a1a30'), hash(i, 1, 3) * 0.7), false)
  }
  // тень на стене с улыбкой
  const sh = hex('#0c030c')
  a.ellipse(96, 74, 13, 15, sh, false)
  a.poly([[78, 150], [82, 96], [96, 90], [112, 96], [118, 150]], sh, false)
  a.rect(88, 66, 4, 1, hex('#e8dccc'), false)
  a.rect(100, 66, 4, 1, hex('#e8dccc'), false)
  for (let i = 0; i < 11; i++) a.set(88 + i, 82 + Math.round(Math.sin((i / 10) * Math.PI) * 2), hex('#e8dccc'), false)
  for (let i = 1; i < 10; i += 2) a.set(88 + i, 83 + Math.round(Math.sin((i / 10) * Math.PI) * 2), hex('#e8dccc'), false)
  // лемниската над головой
  const gold = ramp('#f0c040')
  for (let k = 0; k < 160; k++) {
    const t = (k / 160) * Math.PI * 2
    const d = 1 + Math.sin(t) * Math.sin(t)
    a.set(64 + (30 * Math.cos(t)) / d, 34 + (30 * Math.sin(t) * Math.cos(t)) / d, tone(gold, 0.9, k, 0), false)
    a.set(64 + (30 * Math.cos(t)) / d + 1, 34 + (30 * Math.sin(t) * Math.cos(t)) / d, tone(gold, 0.6, k, 1), false)
  }
  a.glow(64, 34, 36, hex('#ffd060'), 0.55, 16)
  // мантия и туника
  const red = ramp('#c42a3a')
  a.poly([[50, 86], [78, 86], [92, 146], [36, 146]], cloth(red, 36, 92, 4, 0.8))
  a.poly([[58, 90], [70, 90], [74, 146], [54, 146]], cloth(ramp('#e8e0f0'), 54, 74, 2, 0.3, 0.7))
  a.rect(54, 112, 20, 3, cylinder(ramp('#c9962c'), 54, 74))
  a.ellipse(64, 113, 3, 2, hex('#e8c872'))
  a.set(64, 113, hex('#2a1a30'))
  // руки
  a.poly([[76, 88], [84, 86], [93, 70], [86, 66]], cloth(red, 76, 93, 1, 1))
  a.ellipse(90, 65, 3, 3, sphere(SKIN, 89, 64, 3))
  a.line(90, 64, 96, 38, hex('#f4efe6'), 2)
  a.rect(94, 36, 4, 4, hex('#c9962c'))
  a.rect(88, 62, 4, 3, hex('#c9962c'))
  a.poly([[52, 88], [46, 90], [40, 112], [46, 115]], cloth(red, 40, 52, 1, 2))
  a.ellipse(43, 117, 3, 3, sphere(SKIN, 42, 116, 3))
  a.line(43, 119, 43, 124, hex('#e9b48a'), 1)
  // голова
  a.rect(60, 80, 8, 7, cylinder(SKIN, 60, 68))
  head(a, 64, 72, 9, { eyes: 'open', mouth: 'smile' })
  a.poly([[54, 70], [56, 60], [64, 56], [73, 60], [75, 70], [71, 63], [64, 61], [58, 63]], cloth(ramp('#5a3a2a'), 54, 75, 2, 0.3))
  a.rect(55, 62, 19, 2, cylinder(ramp('#c9962c'), 55, 74))
  // стол
  const wood = ramp('#7a4a2a')
  a.rect(X0, 142, X1 - X0, 8, (x, y) => tone(wood, 0.78 - (y - 142) * 0.05 + (hash(x, y) - 0.5) * 0.14, x, y))
  a.rect(X0, 150, X1 - X0, 34, cloth(ramp('#8a1e2e'), X0, X1, 7, 0.4))
  a.rect(X0, 178, X1 - X0, 4, cylinder(ramp('#c9962c'), X0, X1))
  for (let x = X0 + 2; x < X1; x += 4) a.rect(x, 182, 1, 2, hex('#c9962c'))
  // предметы стихий
  const g2 = ramp('#e8b840')
  a.poly([[16, 130], [30, 130], [28, 138], [18, 138]], cylinder(g2, 16, 30))
  a.rect(22, 138, 2, 3, g2[3])
  a.rect(19, 141, 8, 1, g2[2])
  a.rect(18, 131, 10, 2, hex('#a82030'))
  a.rect(44, 118, 3, 24, cylinder(ramp('#c9a266'), 44, 47))
  a.rect(44, 118, 3, 3, hex('#e8541f'))
  a.rect(100, 112, 3, 28, cylinder(ramp('#d8dce8'), 100, 103))
  a.rect(96, 138, 11, 2, g2[3])
  a.rect(100, 140, 3, 3, hex('#7a4a2a'))
  a.ellipse(112, 138, 7, 4, sphere(g2, 110, 137, 7, 4))
  a.ellipse(112, 138, 4, 2, hex('#8a6a1c'))
  for (const [x, y] of [[112, 136], [109, 138], [115, 138], [110, 140], [114, 140]]) a.set(x, y, hex('#fff0b0'))
}

function pillar(a: Art, x0: number, x1: number, r: RGB[], letter: string, lc: RGB) {
  a.rect(x0, 22, x1 - x0, 138, cylinder(r, x0, x1))
  a.rect(x0 - 3, 14, x1 - x0 + 6, 8, cylinder(r, x0 - 3, x1 + 3))
  a.rect(x0 - 5, 12, x1 - x0 + 10, 3, cylinder(r, x0 - 5, x1 + 5))
  a.rect(x0 - 3, 160, x1 - x0 + 6, 8, cylinder(r, x0 - 3, x1 + 3))
  a.rect(x0 - 5, 168, x1 - x0 + 10, 4, cylinder(r, x0 - 5, x1 + 5))
  const cx = Math.round((x0 + x1) / 2) - 1
  const glyph = letter === 'B' ? ['111.', '1..1', '111.', '1..1', '111.'] : ['.111', '..1.', '..1.', '1.1.', '.1..']
  glyph.forEach((row, j) => [...row].forEach((c, i) => c === '1' && a.set(cx + i, 96 + j, lc)))
}

function cardTwo(a: Art) {
  sky(a, [[0, '#0a0826'], [1, '#221c58']])
  starfield(a, 4, 30, 90)
  // завеса с гранатами
  a.rect(30, 18, 68, 142, cloth(ramp('#2e4a9a'), 30, 98, 6, 0.2, 0.55))
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      const x = 40 + c * 16 + (r % 2) * 8
      const y = 30 + r * 34
      if (Math.abs(x - 64) < 14 && y > 52 && y < 140) continue
      const eye = (r * 4 + c) % 5 === 2
      a.ellipse(x, y, 4, 4, sphere(ramp('#c42a3a'), x - 1, y - 1, 4))
      a.set(x, y - 5, hex('#2a6a40'))
      if (eye) {
        a.rect(x - 3, y - 1, 7, 3, hex('#f4efe6'))
        a.rect(x, y - 1, 2, 3, hex('#0a0614'))
        a.set(x, y - 1, hex('#ff3040'))
      }
    }
  pillar(a, 12, 30, ramp('#e8e4f0'), 'B', hex('#2a2548'))
  pillar(a, 98, 116, ramp('#2e2850'), 'J', hex('#e8e4f0'))
  // мантия жрицы
  const blue = ramp('#3a5aa8')
  a.poly([[46, 82], [82, 82], [100, 154], [28, 154]], cloth(blue, 28, 100, 6, 0.5, 0.58))
  a.poly([[56, 84], [72, 84], [76, 120], [52, 120]], cloth(ramp('#c8d4f0'), 52, 76, 2, 0.2, 0.7))
  a.rect(61, 94, 7, 2, hex('#e8c872'))
  a.rect(63, 91, 3, 9, hex('#e8c872'))
  // вуаль: два полупрозрачных полотна от головы к плечам
  const veil = (x: number, y: number) => (((x + y) & 1) ? tone(ramp('#b8c8f4'), 0.66, x, y) : tone(ramp('#6a82d0'), 0.5, x, y))
  a.poly([[52, 56], [57, 58], [55, 96], [38, 124]], veil)
  a.poly([[76, 56], [71, 58], [73, 96], [90, 124]], veil)
  a.poly([[54, 80], [74, 80], [78, 88], [50, 88]], cloth(blue, 50, 78, 3, 0.3))
  // свиток на коленях
  a.rect(52, 118, 24, 10, cylinder(ramp('#f0e4c0'), 52, 76))
  a.rect(55, 121, 7, 1, hex('#5a3a2a'))
  a.rect(55, 124, 12, 1, hex('#5a3a2a'))
  a.rect(70, 121, 3, 4, hex('#5a3a2a'))
  a.ellipse(55, 128, 3, 3, sphere(PALE, 54, 127, 3))
  a.ellipse(73, 128, 3, 3, sphere(PALE, 72, 127, 3))
  // голова и корона-луна
  a.rect(61, 74, 6, 6, cylinder(PALE, 61, 67))
  head(a, 64, 66, 9, { skin: PALE, eyes: 'closed', mouth: 'flat' })
  a.ellipse(64, 53, 4, 4, sphere(ramp('#f4efd0'), 63, 52, 4))
  a.ellipse(56, 56, 4, 6, sphere(ramp('#f4efd0'), 54, 55, 4, 6))
  a.ellipse(72, 56, 4, 6, sphere(ramp('#f4efd0'), 70, 55, 4, 6))
  a.ellipse(58, 56, 3, 5, hex('#2a2a6a'))
  a.ellipse(70, 56, 3, 5, hex('#2a2a6a'))
  // пол и полумесяц у ног с красными слезами
  a.rect(X0, 154, X1 - X0, 30, stone(ramp('#4a4a88'), { w: 12, h: 6 }, 0.5))
  const moon = ramp('#f4efd0')
  a.rect(40, 140, 50, 28, (x, y) => (Math.hypot((x - 64) / 22, (y - 154) / 13) <= 1 && Math.hypot((x - 72) / 19, (y - 150) / 12) > 1 ? tone(moon, 0.85 - (x - 42) * 0.01, x, y) : null))
  drip(a, 48, 162, 8)
  drip(a, 54, 166, 4)
  drip(a, 79, 160, 10)
}

function brickTower(a: Art, x0: number, x1: number, y0: number, y1: number, base: RGB[]) {
  const st = stone(base, { w: 8, h: 5 }, 0.55)
  a.rect(x0, y0, x1 - x0, y1 - y0, (x, y) => {
    const t = (x - x0) / (x1 - x0)
    const c = st(x, y)
    return t < 0.3 ? mix(c, hex('#fff1c4'), 0.12) : t > 0.7 ? mix(c, hex('#150d2e'), 0.3) : c
  })
}

function cardSixteen(a: Art) {
  sky(a, [[0, '#04020e'], [0.55, '#1a0e3a'], [1, '#43204e']])
  for (const [cx, cy, rx, ry] of [[40, 24, 30, 9], [92, 18, 28, 8], [66, 40, 34, 8]])
    a.ellipse(cx, cy, rx, ry, (x, y) => tone(ramp('#3a2a70'), 0.35 + (hash(x, y) - 0.5) * 0.3 - (y - cy) * 0.03, x, y), false)
  starfield(a, 8, 10, 30)
  ridge(a, [[8, 150], [28, 138], [48, 156], [78, 148], [100, 136], [120, 152]], 184, ramp('#3a3060'), null)
  brickTower(a, 46, 86, 62, 176, ramp('#8a8aa8'))
  // зазубренный слом
  for (let x = 46; x < 86; x += 5) a.rect(x, 58 + Math.floor(hash(x, 4) * 6), 5, 6, hex('#2a2048'))
  // окна-глаза и рот-трещина
  a.rect(54, 90, 8, 8, hex('#150d2e'))
  a.rect(70, 90, 8, 8, hex('#150d2e'))
  a.rect(55, 91, 6, 6, hex('#f6a22a'), false)
  a.rect(71, 91, 6, 6, hex('#f6a22a'), false)
  a.rect(57, 91, 2, 6, hex('#2a0a0a'), false)
  a.rect(73, 91, 2, 6, hex('#2a0a0a'), false)
  a.glow(58, 94, 12, hex('#ff8a30'), 0.7)
  a.glow(74, 94, 12, hex('#ff8a30'), 0.7)
  for (let i = 0; i < 19; i++) a.set(56 + i, 118 + (i % 3 === 0 ? 3 : i % 3 === 1 ? 0 : 2), hex('#150d2e'), false)
  for (let i = 0; i < 18; i += 2) a.rect(56 + i, 119 + (i % 4 ? 1 : 0), 1, 2, hex('#e8e0d8'), false)
  a.poly([[60, 176], [60, 158], [66, 152], [72, 158], [72, 176]], hex('#0a0614'))
  // сорванная корона
  a.poly([[62, 46], [90, 34], [100, 46], [72, 58]], stone(ramp('#8a8aa8'), { w: 6, h: 4 }, 0.6))
  for (const [x, y] of [[64, 44], [72, 40], [80, 37], [88, 33]]) a.rect(x, y - 3, 4, 3, hex('#8a8aa8'))
  // огонь и молния
  flame(a, 58, 64, 20, 14, 1)
  flame(a, 74, 62, 24, 16, 2)
  flame(a, 84, 70, 14, 10, 3)
  const bolt: [number, number][] = [[82, 8], [76, 20], [82, 24], [72, 40], [78, 42], [66, 62]]
  for (let k = 0; k + 1 < bolt.length; k++) {
    a.line(bolt[k][0], bolt[k][1], bolt[k + 1][0], bolt[k + 1][1], hex('#fff6d0'), 3, false)
    a.line(bolt[k][0], bolt[k][1], bolt[k + 1][0], bolt[k + 1][1], hex('#ffffff'), 1, false)
  }
  a.glow(72, 40, 34, hex('#c8d0ff'), 0.6, 40)
  // падающие фигуры
  const fall = (x: number, y: number, robe: string, flip: number) => {
    a.ellipse(x, y, 4, 4, sphere(SKIN, x - 1, y - 1, 4))
    a.poly([[x - 3, y + 3], [x + 4, y + 4], [x + 2 * flip, y + 14], [x - 4 * flip, y + 13]], cloth(ramp(robe), x - 4, x + 4, 1, 1))
    a.line(x - 3, y + 4, x - 10 * flip, y - 2, hex('#e9b48a'), 2)
    a.line(x + 3, y + 4, x + 9 * flip, y + 10, hex('#e9b48a'), 2)
    a.line(x, y + 13, x - 7 * flip, y + 22, hex('#4a3a6a'), 2)
    a.line(x + 1, y + 13, x + 8 * flip, y + 18, hex('#4a3a6a'), 2)
  }
  fall(26, 96, '#c42a3a', 1)
  fall(104, 124, '#3a5aa8', -1)
  for (let i = 0; i < 30; i++) {
    const x = 36 + Math.floor(hash(i, 2, 1) * 60)
    const y = 44 + Math.floor(hash(i, 2, 2) * 80)
    a.set(x, y, hex(i % 2 ? '#ffe27a' : '#ff7a30'), false)
    if (i % 3 === 0) a.set(x, y + 1, hex('#e8541f'), false)
  }
}

function cardEighteen(a: Art) {
  sky(a, [[0, '#060420'], [0.55, '#1c1a58'], [1, '#383a88']])
  starfield(a, 5, 34, 90)
  a.glow(64, 52, 46, hex('#c8c0ff'), 0.75)
  a.ellipse(64, 52, 25, 25, sphere(ramp('#f4efd0'), 54, 42, 25), false)
  // лицо на луне в профиль
  const shade = hex('#9a90b8')
  a.line(60, 46, 66, 46, shade, 1, false)
  a.line(60, 45, 62, 44, shade, 1, false)
  a.rect(56, 50, 3, 7, shade, false)
  a.rect(58, 57, 3, 1, shade, false)
  a.line(54, 64, 62, 66, shade, 1, false)
  a.line(64, 36, 70, 44, hex('#d8d0f0'), 1, false)
  for (const [x, y] of [[74, 40], [78, 58], [50, 38], [72, 66]]) a.ellipse(x, y, 3, 2, hex('#b8aedc'), false)
  for (let i = 0; i < 12; i++) {
    const x = 36 + Math.floor(hash(i, 3, 1) * 56)
    const y = 82 + Math.floor(hash(i, 3, 2) * 24)
    a.rect(x, y, 1, 3, hex('#fff0a0'), false)
    a.set(x, y - 1, hex('#d8c870'), false)
  }
  ridge(a, [[8, 112], [30, 100], [52, 112], [74, 104], [96, 114], [120, 102]], 130, ramp('#3a2e78'), null)
  // дорога
  a.poly([[58, 112], [70, 112], [82, 138], [72, 150], [100, 176], [34, 176], [58, 150], [50, 138]], (x, y) => tone(ramp('#a8a0d0'), 0.45 + (y - 112) * 0.004 + (hash(x, y) - 0.5) * 0.2, x, y), false)
  a.rect(X0, 130, X1 - X0, 54, (x, y) => {
    return tone(ramp('#2a2a68'), 0.38 + (hash(x, y) - 0.5) * 0.18, x, y)
  }, false)
  a.poly([[58, 112], [70, 112], [82, 138], [72, 150], [100, 176], [34, 176], [58, 150], [50, 138]], (x, y) => tone(ramp('#a8a0d0'), 0.5 + (hash(x, y) - 0.5) * 0.2 - (y - 112) * 0.002, x, y), false)
  // башни
  for (const [x0, x1] of [[12, 38], [90, 116]]) {
    brickTower(a, x0, x1, 86, 150, ramp('#7a74a8'))
    for (let x = x0; x < x1; x += 7) a.rect(x, 80, 4, 6, hex('#6a64a0'))
    a.rect(Math.round((x0 + x1) / 2) - 2, 104, 5, 9, hex('#150d2e'))
  }
  glowEyes(a, 98, 108, 8, '#ffd24a', 0)
  // собака и волк
  const dog = ramp('#9a98b0')
  a.ellipse(26, 158, 9, 4, sphere(dog, 23, 155, 9, 4))
  a.poly([[30, 154], [36, 142], [40, 144], [34, 156]], cylinder(dog, 30, 40))
  a.poly([[34, 144], [42, 140], [42, 144], [36, 146]], cylinder(dog, 34, 42))
  a.poly([[34, 140], [36, 136], [38, 141]], dog[1])
  for (const lx of [20, 24, 29, 33]) a.rect(lx, 160, 2, 7, cylinder(dog, lx, lx + 2))
  a.set(38, 142, hex('#ffd24a'), false)
  const wolf = ramp('#4a4668')
  a.ellipse(106, 160, 9, 4, sphere(wolf, 103, 157, 9, 4))
  a.poly([[100, 156], [94, 144], [90, 146], [96, 158]], cylinder(wolf, 90, 100))
  a.poly([[94, 146], [86, 142], [86, 146], [92, 148]], cylinder(wolf, 86, 94))
  a.poly([[94, 142], [92, 138], [90, 143]], wolf[1])
  for (const lx of [100, 104, 109, 113]) a.rect(lx, 162, 2, 6, cylinder(wolf, lx, lx + 2))
  a.set(90, 144, hex('#ffd24a'), false)
  // тонкая фигура вдали
  a.rect(64, 120, 2, 10, hex('#05030f'), false)
  a.ellipse(65, 119, 2, 2, hex('#d8d0f0'), false)
  // водоём и рак
  a.rect(X0, 170, X1 - X0, 14, gradient([[0, '#4a4a98'], [1, '#14123a']], 170, 184), false)
  for (let x = 40; x < 90; x += 5) a.rect(x, 172 + ((x / 5) % 3), 3 + (x % 3), 1, hex('#d8d0f0'), false)
  const crab = ramp('#c42a3a')
  a.ellipse(64, 176, 8, 5, sphere(crab, 61, 173, 8, 5))
  a.poly([[52, 172], [58, 166], [60, 172]], cylinder(crab, 52, 60))
  a.poly([[76, 172], [70, 166], [68, 172]], cylinder(crab, 68, 76))
  a.line(60, 172, 56, 166, crab[3], 2)
  a.line(68, 172, 72, 166, crab[3], 2)
  a.line(62, 171, 58, 160, hex('#e8a090'), 1)
  a.line(66, 171, 70, 160, hex('#e8a090'), 1)
  a.rect(62, 174, 1, 1, hex('#fff0f0'))
  a.rect(66, 174, 1, 1, hex('#fff0f0'))
}


function bigEye(a: Art, cx: number, cy: number, rx: number, ry: number) {
  a.glow(cx, cy, rx + 12, hex('#ff3040'), 0.55, ry + 10)
  a.ellipse(cx, cy, rx, ry, (x, y) => tone(ramp('#e8dcc0'), 0.78 - Math.abs(y - cy) / ry * 0.45, x, y), false)
  a.ellipse(cx, cy, ry, ry, sphere(ramp('#c42a3a'), cx - 2, cy - 2, ry), false)
  a.rect(cx - 1, cy - ry + 1, 3, ry * 2 - 1, hex('#07020a'), false)
  a.set(cx - 3, cy - 3, hex('#ffe8e8'), false)
  for (let k = 0; k < 7; k++) a.line(cx - rx + 2 + k * 2, cy, cx - rx + 4 + k * 2, cy + (k % 2 ? 3 : -3), hex('#a01824'), 1, false)
}

function cardSixteenCorrupt(a: Art) {
  cardSixteen(a)
  // огромный глаз в грозовых тучах
  bigEye(a, 38, 24, 22, 8)
  // рот на башне: растянутая пасть с зубами
  a.ellipse(65, 122, 17, 9, hex('#07020a'), false)
  for (let i = 0; i < 11; i++) {
    const x = 52 + i * 3
    a.poly([[x, 114], [x + 3, 114], [x + 1.5, 120]], hex('#e8e0d8'), false)
    a.poly([[x, 130], [x + 3, 130], [x + 1.5, 124]], hex('#e8e0d8'), false)
  }
  // окна кровоточат
  for (const x of [57, 73]) {
    a.rect(x - 2, 90, 6, 6, hex('#ff2a3a'), false)
    drip(a, x, 98, 14)
    drip(a, x + 2, 98, 8)
  }
  a.glow(65, 94, 30, hex('#ff2a3a'), 0.5, 40)
  // фигуры падают без лиц
  for (const [x, y] of [[26, 96], [104, 124]]) a.ellipse(x, y, 3, 3, hex('#07020a'))
}

function cardEighteenCorrupt(a: Art) {
  cardEighteen(a)
  // луна смотрит
  bigEye(a, 64, 52, 24, 14)
  // слёзы-кровь
  drip(a, 54, 66, 14)
  drip(a, 74, 66, 20)
  // ряды красных глаз в тени гор
  for (const [x, y] of [[20, 118], [44, 124], [92, 122], [112, 126], [26, 134], [100, 138]]) glowEyes(a, x, y, 4, '#ff3040', 0)
  // тонкая фигура ближе, стоит спиной к дороге и всё равно смотрит
  a.rect(62, 108, 4, 20, hex('#05030f'), false)
  a.ellipse(64, 106, 4, 4, hex('#05030f'), false)
  a.rect(60, 116, 2, 14, hex('#05030f'), false)
  a.rect(66, 116, 2, 14, hex('#05030f'), false)
  glowEyes(a, 64, 106, 3, '#ff3040', 0)
}

export function cardBack(a: Art) {
  const bg = gradient([[0, '#2a1a6a'], [1, '#150d3a']], Y0, Y1)
  a.rect(X0, Y0, X1 - X0, Y1 - Y0, (x, y) => {
    const lat = (x + y) % 14 < 2 || (x - y + 280) % 14 < 2
    const c = bg(x, y)
    return lat ? mix(c, hex('#c9962c'), 0.55) : c
  }, false)
  // орнаментальная рамка внутри
  const gold = ramp('#c9962c')
  a.rect(16, 16, X1 - X0 - 16, 1, gold[3], false)
  a.rect(16, Y1 - 9, X1 - X0 - 16, 1, gold[2], false)
  a.rect(16, 16, 1, Y1 - Y0 - 16, gold[3], false)
  a.rect(X1 - 9, 16, 1, Y1 - Y0 - 16, gold[2], false)
  // нить, обвивающая медальон
  for (let y = Y0 + 4; y < Y1 - 4; y++) {
    const x = 64 + Math.sin(y / 11) * 9
    a.set(x, y, tone(gold, 0.95, y, 0), false)
    a.set(x + 1, y, tone(gold, 0.55, y, 1), false)
  }
  // медальон с глазом
  a.glow(64, 96, 44, hex('#c9962c'), 0.5, 56)
  a.ellipse(64, 96, 27, 38, sphere(ramp('#1a1038'), 56, 80, 27, 38))
  a.ellipse(64, 96, 24, 35, hex('#0d0820'))
  for (let k = 0; k < 16; k++) {
    const t = (k / 16) * Math.PI * 2
    a.line(64 + Math.cos(t) * 12, 96 + Math.sin(t) * 12, 64 + Math.cos(t) * 21, 96 + Math.sin(t) * 29, gold[2], 1, false)
  }
  a.poly([[40, 96], [52, 84], [64, 80], [76, 84], [88, 96], [76, 108], [64, 112], [52, 108]], hex('#f1e6c9'))
  a.ellipse(64, 96, 11, 11, sphere(ramp('#3a8aa0'), 60, 91, 11))
  a.ellipse(64, 96, 4, 8, hex('#0a0614'))
  a.rect(63, 92, 2, 2, hex('#ffffff'))
  a.line(40, 96, 52, 84, gold[3], 1)
  a.line(40, 96, 52, 108, gold[3], 1)
  a.line(88, 96, 76, 84, gold[3], 1)
  a.line(88, 96, 76, 108, gold[3], 1)
  a.rect(60, 54, 8, 1, gold[4], false)
  a.rect(60, 138, 8, 1, gold[2], false)
}

export const SCENES: Record<number, (a: Art) => void> = {
  0: cardZero,
  1: cardOne,
  2: cardTwo,
  16: cardSixteen,
  18: cardEighteen,
}

export const CORRUPT_SCENES: Record<number, (a: Art) => void> = {
  16: cardSixteenCorrupt,
  18: cardEighteenCorrupt,
}

export { sky, starfield, ridge, glowEyes, head, SKIN, PALE, vgrad }
