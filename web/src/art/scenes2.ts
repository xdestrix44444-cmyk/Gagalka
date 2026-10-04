// Партия 1 старших арканов: Императрица, Император, Смерть, Звезда, Солнце.
import { Art, X0, X1, cloth, cylinder, gradient, hash, hex, ramp, sphere, stone, tone } from './canvas'
import { SKIN, drip, glowEyes, head, ridge, sky, starfield, vgrad } from './scenes'

function crown(a: Art, cx: number, y: number, n: number, gap: number, col: string) {
  for (let i = 0; i < n; i++) {
    const x = cx + (i - (n - 1) / 2) * gap
    a.rect(x - 1, y - 1, 3, 3, hex(col), false)
    a.set(x, y - 2, hex('#fffbe0'), false)
  }
}

export function cardThree(a: Art) {
  sky(a, [[0, '#2a5a48'], [0.5, '#7ab07a'], [1, '#e8d890']])
  ridge(a, [[8, 96], [30, 84], [56, 98], [84, 80], [108, 94], [120, 86]], 140, ramp('#1e4a30'), null)
  glowEyes(a, 30, 100, 6, '#ffe27a', 0)
  // пшеничное поле
  a.rect(X0, 138, X1 - X0, 46, (x, y) => tone(ramp('#d8a82a'), 0.42 + (hash(x, y, 3) - 0.5) * 0.5 + (y - 138) * 0.004, x, y), false)
  for (let x = X0 + 2; x < X1; x += 5) a.rect(x, 128 + Math.floor(hash(x, 9) * 6), 1, 14, hex('#f0cc4a'), false)
  // подушки и трон
  a.rect(34, 120, 60, 22, (x, y) => tone(ramp('#b83a58'), 0.45 + (y - 120) * 0.02 + (hash(x, y) - 0.5) * 0.15, x, y))
  a.rect(30, 66, 68, 56, cloth(ramp('#3a7a52'), 30, 98, 6, 1), false)
  a.poly([[54, 62], [74, 62], [80, 76], [86, 124], [42, 124], [48, 76]], cloth(ramp('#f0a8c0'), 42, 86, 4, 0))
  a.rect(58, 62, 12, 4, SKIN[3])
  // гранатовый узор
  for (let y = 88; y < 122; y += 6) for (let x = 48 + ((y / 6) % 2) * 4; x < 82; x += 8) a.ellipse(x, y, 2, 2, hex('#a01828'))

  head(a, 64, 54, 10, { mouth: 'smile', look: 0, mask: 'porcelain', maskTone: '#f0d8d8' })
  a.poly([[52, 48], [64, 42], [76, 48], [78, 80], [72, 62], [56, 62], [50, 80]], cylinder(ramp('#8a4a22'), 50, 78))
  head(a, 64, 54, 10, { mouth: 'smile', look: 0, mask: 'porcelain', maskTone: '#f0d8d8' })
  crown(a, 64, 42, 7, 4, '#ffd84a')
  // скипетр с шаром
  a.line(92, 62, 92, 126, hex('#c8962a'), 2)
  a.ellipse(92, 58, 5, 5, sphere(ramp('#ffd84a'), 90, 56, 5))
  // сердце-щит
  a.poly([[96, 130], [108, 130], [108, 138], [102, 146], [96, 138]], stone(ramp('#e8b8c8')), true)
}

export function cardFour(a: Art) {
  sky(a, [[0, '#5a1a18'], [0.55, '#d85a2a'], [1, '#f6b84a']])
  ridge(a, [[8, 100], [26, 70], [44, 96], [70, 64], [96, 98], [120, 76]], 150, ramp('#8a2e22'), null)
  a.rect(X0, 148, X1 - X0, 36, (x, y) => tone(ramp('#6a2a22'), 0.4 + (hash(x, y, 2) - 0.5) * 0.3, x, y), false)
  // каменный трон с бараньими головами
  a.rect(30, 52, 68, 110, stone(ramp('#9a7a6a'), { w: 8, h: 5 }))
  for (const x of [26, 98]) {
    a.ellipse(x + 4, 62, 7, 6, sphere(ramp('#c8b8a0'), x + 2, 60, 7, 6))
    a.line(x - 2, 58, x - 4, 70, hex('#e8dcc0'), 2)
    a.set(x + 3, 62, hex('#ff3040'))
  }
  // император
  a.poly([[40, 78], [88, 78], [94, 150], [34, 150]], cloth(ramp('#c4282e'), 34, 94, 5, 2))
  a.rect(48, 86, 32, 8, hex('#c8962a'))
  head(a, 64, 62, 10, { mouth: 'flat', mask: 'porcelain', maskTone: '#6a6a7a' })
  crown(a, 64, 48, 5, 4, '#ffd84a')
  a.line(98, 70, 98, 130, hex('#e8b84a'), 2)
  a.rect(94, 64, 8, 8, hex('#e8b84a'))
  a.ellipse(30, 130, 5, 5, sphere(ramp('#e8b84a'), 28, 128, 5))
  // тень за спиной шевелится
  a.rect(22, 90, 6, 40, hex('#0c0306'), false)
  glowEyes(a, 20, 96, 4, '#ff3040', 0)
}

export function cardThirteen(a: Art) {
  sky(a, [[0, '#2a1a3a'], [0.5, '#a85a4a'], [1, '#f6c27a']])
  a.glow(64, 112, 44, hex('#ffe8a0'), 0.85)
  a.ellipse(64, 108, 13, 13, sphere(ramp('#ffe8a0'), 60, 104, 13), false)
  for (const [x0, x1] of [[10, 30], [98, 118]]) {
    a.rect(x0, 92, x1 - x0, 70, stone(ramp('#5a4a68'), { w: 6, h: 4 }, 0.4))
    a.rect(x0 + 6, 104, 7, 12, hex('#150d2e'))
  }
  a.rect(X0, 140, X1 - X0, 44, (x, y) => tone(ramp('#3a2a40'), 0.35 + (hash(x, y, 5) - 0.5) * 0.3, x, y), false)
  // коса: длинное древко и лезвие
  a.line(40, 176, 78, 40, hex('#4a3a2a'), 3)
  a.poly([[78, 40], [100, 38], [112, 52], [96, 48], [80, 50]], cylinder(ramp('#c8ccd8'), 78, 112))
  a.line(80, 50, 110, 51, hex('#fffbe8'), 1, false)
  // чёрная роза крупным планом
  a.glow(64, 134, 20, hex('#150d2e'), 0.5)
  for (const [rx, k] of [[17, 0], [13, 1], [9, 2], [5, 3]] as [number, number][])
    a.ellipse(64, 134 - k, rx, rx - 2, (x, y) => tone(ramp(k % 2 ? '#2a1a3a' : '#150d22'), 0.4 + Math.sin((x - 64) * 0.5 + k) * 0.18 - (y - 134) * 0.01, x, y))
  a.line(64, 148, 64, 176, hex('#1a3a22'), 3)
  a.poly([[64, 160], [78, 154], [74, 164]], hex('#244a2c'))
  a.set(60, 130, hex('#c8c0d0'))
  // песочные часы
  a.rect(18, 138, 16, 2, hex('#c8962a'))
  a.rect(18, 172, 16, 2, hex('#c8962a'))
  a.poly([[19, 140], [33, 140], [27, 155], [25, 155]], hex('#bfd8ff'))
  a.poly([[25, 155], [27, 155], [33, 172], [19, 172]], hex('#e8c878'))
  a.line(26, 155, 26, 164, hex('#e8c878'), 1, false)
  // вороны на жерди
  a.line(84, 152, 116, 152, hex('#4a3a2a'), 2)
  for (const x of [88, 100, 110]) {
    a.ellipse(x, 148, 4, 3, hex('#0a0614'))
    a.poly([[x + 3, 147], [x + 7, 148], [x + 3, 149]], hex('#c8962a'))
    a.set(x + 1, 147, hex('#fff6e0'))
  }
  // красные глаза в траве
  glowEyes(a, 46, 166, 5, '#ff3040', 0)
}

export function cardSeventeen(a: Art) {
  sky(a, [[0, '#04062a'], [0.6, '#16206a'], [1, '#3a58b8']])
  starfield(a, 17, 50, 110)
  const big = [[64, 12], [69, 28], [84, 22], [76, 36], [92, 42], [74, 46], [78, 62], [64, 52], [50, 62], [54, 46], [36, 42], [52, 36], [44, 22], [59, 28]] as [number, number][]
  a.glow(64, 38, 40, hex('#fff6c0'), 0.8)
  a.poly(big, (x, y) => tone(ramp('#ffe27a'), 0.8 - Math.hypot(x - 64, y - 38) * 0.018, x, y), false)
  a.line(64, 22, 61, 50, hex('#3a2a10'), 1, false) // трещина
  a.line(61, 50, 66, 58, hex('#3a2a10'), 1, false)
  for (const [x, y] of [[22, 30], [106, 34], [18, 70], [112, 66], [30, 90], [100, 92]]) {
    a.rect(x - 1, y - 4, 3, 9, hex('#fff6c0'), false)
    a.rect(x - 4, y - 1, 9, 3, hex('#fff6c0'), false)
  }
  ridge(a, [[8, 118], [34, 110], [60, 122], [90, 108], [120, 118]], 140, ramp('#1a2a5a'), null)
  glowEyes(a, 96, 124, 5, '#ffe27a', 0)
  // водоём с отражением-глазом
  a.rect(X0, 138, X1 - X0, 46, gradient([[0, '#4a68c8'], [1, '#0e1448']], 138, 184), false)
  for (let x = 14; x < 114; x += 6) a.rect(x, 150 + ((x / 6) % 4) * 6, 3 + (x % 3), 1, hex('#a8c0ff'), false)
  bigEyeLike(a, 64, 164, 14, 6)
  // два кувшина на камнях, из них льётся вода
  for (const [x, flip] of [[34, 1], [94, -1]] as [number, number][]) {
    a.poly([[x - 12, 140], [x + 12, 140], [x + 8, 152], [x - 8, 152]], stone(ramp('#5a608a'), { w: 6, h: 4 }, 0.4))
    a.ellipse(x, 126, 8, 11, sphere(ramp('#c8892a'), x - 3, 120, 8, 11))
    a.rect(x - 3, 113, 7, 4, ramp('#c8892a')[2])
    a.poly([[x + 6 * flip, 126], [x + 14 * flip, 124], [x + 12 * flip, 130]], ramp('#c8892a')[3])
    a.line(x + 13 * flip, 128, x + 13 * flip + 2 * flip, 150, hex('#bfd8ff'), 2, false)
    a.line(x + 13 * flip, 128, x + 13 * flip + 2 * flip, 150, hex('#ffffff'), 1, false)
  }
}

function bigEyeLike(a: Art, cx: number, cy: number, rx: number, ry: number) {
  a.ellipse(cx, cy, rx, ry, hex('#e8dcc0'), false)
  a.ellipse(cx, cy, ry, ry, hex('#3a58b8'), false)
  a.rect(cx - 1, cy - ry + 1, 3, ry * 2 - 1, hex('#07020a'), false)
}

export function cardNineteen(a: Art) {
  sky(a, [[0, '#2a78d8'], [0.6, '#6ab8f0'], [1, '#f6e4a0']])
  a.glow(64, 42, 52, hex('#fff6c0'), 0.9)
  for (let k = 0; k < 20; k++) {
    const t = (k / 20) * Math.PI * 2
    const len = k % 2 ? 36 : 46
    a.poly([[64 + Math.cos(t - 0.1) * 24, 42 + Math.sin(t - 0.1) * 24], [64 + Math.cos(t) * len, 42 + Math.sin(t) * len], [64 + Math.cos(t + 0.1) * 24, 42 + Math.sin(t + 0.1) * 24]], hex(k % 2 ? '#ffd84a' : '#ff9a30'), false)
  }
  a.ellipse(64, 42, 21, 21, sphere(ramp('#ffc830'), 56, 34, 21), false)
  a.ellipse(64, 42, 14, 14, (x, y) => tone(ramp('#ff9a30'), 0.45 + Math.sin(Math.hypot(x - 64, y - 42) * 1.3) * 0.25, x, y), false)
  a.ellipse(64, 42, 5, 5, hex('#2a1008'), false)
  // кирпичная стена и подсолнухи
  a.rect(X0, 112, X1 - X0, 26, stone(ramp('#c8683a'), { w: 10, h: 5 }, 0.6))
  for (let x = 20; x < 116; x += 24) {
    a.line(x, 150, x, 112, hex('#2a8a3a'), 3)
    a.poly([[x, 130], [x + 10, 124], [x + 8, 134]], hex('#3aa84a'))
    for (let k = 0; k < 14; k++) {
      const t = (k / 14) * Math.PI * 2
      a.poly([[x + Math.cos(t - 0.2) * 7, 104 + Math.sin(t - 0.2) * 7], [x + Math.cos(t) * 14, 104 + Math.sin(t) * 14], [x + Math.cos(t + 0.2) * 7, 104 + Math.sin(t + 0.2) * 7]], hex(k % 2 ? '#ffc830' : '#ffa81e'))
    }
    a.ellipse(x, 104, 7, 7, (xx, yy) => tone(ramp('#5a2a12'), 0.4 + hash(xx, yy, 6) * 0.5, xx, yy))
  }
  // центр одного подсолнуха — глаз
  a.ellipse(68, 104, 3, 3, hex('#f4efe6'))
  a.rect(67, 102, 2, 5, hex('#07020a'))
  a.rect(X0, 138, X1 - X0, 46, (x, y) => tone(ramp('#5aa84a'), 0.5 + (hash(x, y, 4) - 0.5) * 0.3, x, y), false)
  // знамя
  a.line(100, 176, 100, 134, hex('#6a4a2a'), 2)
  a.poly([[100, 136], [118, 142], [100, 152]], cloth(ramp('#e8281e'), 100, 118, 2, 0))
  drip(a, 64, 62, 8)
}

export const SCENES2: Record<number, (a: Art) => void> = {
  3: cardThree,
  4: cardFour,
  13: cardThirteen,
  17: cardSeventeen,
  19: cardNineteen,
}
export { vgrad, SKIN }
