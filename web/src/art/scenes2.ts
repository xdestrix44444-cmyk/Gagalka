// Партия 1 старших арканов: Императрица, Император, Смерть, Звезда, Солнце.
import { Art, X0, X1, cloth, cylinder, gradient, hash, hex, ramp, sphere, stone, tone } from './canvas'
import { PALE, SKIN, drip, glowEyes, head, ridge, sky, starfield, vgrad } from './scenes'

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

  head(a, 64, 54, 10, { mouth: 'smile', look: 0 })
  a.poly([[52, 48], [64, 42], [76, 48], [78, 80], [72, 62], [56, 62], [50, 80]], cylinder(ramp('#8a4a22'), 50, 78))
  head(a, 64, 54, 10, { mouth: 'smile', look: 0 })
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
  head(a, 64, 62, 10, { mouth: 'flat' })
  a.poly([[55, 66], [73, 66], [69, 84], [64, 90], [59, 84]], cylinder(ramp('#d8d4d0'), 55, 73))
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
  a.glow(64, 120, 40, hex('#ffe8a0'), 0.8)
  a.ellipse(64, 116, 12, 12, sphere(ramp('#ffe8a0'), 60, 112, 12), false)
  for (const [x0, x1] of [[12, 30], [98, 116]]) {
    a.rect(x0, 100, x1 - x0, 60, stone(ramp('#5a4a68'), { w: 6, h: 4 }, 0.4))
    a.rect(x0 + 5, 112, 7, 12, hex('#150d2e'))
  }
  a.rect(X0, 150, X1 - X0, 34, gradient([[0, '#6a5a88'], [1, '#1a1030']], 150, 184), false)
  // белая лошадь
  const horse = ramp('#e8e4ec')
  a.ellipse(62, 128, 20, 9, sphere(horse, 54, 124, 20, 9))
  a.poly([[78, 124], [86, 104], [94, 108], [86, 128]], cylinder(horse, 78, 94))
  a.poly([[86, 104], [100, 108], [98, 114], [88, 112]], cylinder(horse, 86, 100))
  a.rect(92, 109, 2, 2, hex('#150d2e'))
  for (const lx of [46, 52, 70, 76]) a.rect(lx, 134, 3, 16, cylinder(horse, lx, lx + 3))
  a.poly([[78, 106], [74, 118], [80, 128], [84, 110]], hex('#8a8aa8'))
  // всадник-скелет в чёрных латах
  a.poly([[52, 76], [74, 76], [76, 122], [50, 122]], cloth(ramp('#2a2a3a'), 50, 76, 3, 0))
  for (let y = 82; y < 112; y += 5) a.line(55, y, 71, y, hex('#d8d0c0'), 1)
  a.line(63, 78, 63, 112, hex('#d8d0c0'), 1)
  a.ellipse(63, 66, 8, 9, sphere(ramp('#e8e0d0'), 60, 62, 8, 9))
  a.rect(58, 63, 4, 4, hex('#07020a'))
  a.rect(65, 63, 4, 4, hex('#07020a'))
  a.set(60, 65, hex('#ff3040'))
  a.set(67, 65, hex('#ff3040'))
  a.rect(61, 71, 5, 3, hex('#07020a'))
  for (let x = 61; x < 66; x += 2) a.set(x, 72, hex('#e8e0d0'))
  a.poly([[55, 58], [63, 50], [71, 58]], cylinder(ramp('#2a2a3a'), 55, 71))
  // чёрное знамя с белой розой
  a.line(44, 44, 44, 124, hex('#6a4a2a'), 2)
  a.poly([[44, 48], [26, 52], [28, 82], [44, 78]], hex('#0a0614'))
  a.ellipse(35, 65, 4, 4, hex('#f4efe6'))
  a.ellipse(35, 65, 2, 2, hex('#c8c0b8'))
  // у ног: люди склонились
  a.ellipse(24, 168, 5, 4, hex('#150d2e'))
  a.rect(18, 168, 12, 10, cloth(ramp('#7a2a3a'), 18, 30, 2, 0))
}

export function cardSeventeen(a: Art) {
  sky(a, [[0, '#04062a'], [0.6, '#16206a'], [1, '#3a58b8']])
  starfield(a, 17, 40, 110)
  // большая звезда
  const big = [[64, 18], [68, 30], [80, 26], [74, 36], [86, 42], [72, 44], [74, 56], [64, 48], [54, 56], [56, 44], [42, 42], [54, 36], [48, 26], [60, 30]] as [number, number][]
  a.glow(64, 38, 30, hex('#fff6c0'), 0.8)
  a.poly(big, (x, y) => tone(ramp('#ffe27a'), 0.75 - Math.hypot(x - 64, y - 38) * 0.02, x, y), false)
  for (const [x, y] of [[26, 30], [100, 34], [20, 66], [108, 62], [34, 84], [96, 88]]) {
    a.rect(x - 1, y - 4, 3, 9, hex('#fff6c0'), false)
    a.rect(x - 4, y - 1, 9, 3, hex('#fff6c0'), false)
  }
  ridge(a, [[8, 120], [34, 112], [60, 122], [90, 110], [120, 120]], 140, ramp('#1a2a5a'), null)
  // водоём
  a.rect(X0, 138, X1 - X0, 46, gradient([[0, '#4a68c8'], [1, '#0e1448']], 138, 184), false)
  for (let x = 14; x < 114; x += 6) a.rect(x, 150 + ((x / 6) % 4) * 6, 3 + (x % 3), 1, hex('#a8c0ff'), false)
  // отражение: одна «звезда» в воде смотрит
  a.ellipse(64, 172, 5, 3, hex('#e8dcc0'), false)
  a.rect(63, 170, 2, 5, hex('#07020a'), false)
  // коленопреклонённая фигура
  a.poly([[34, 124], [44, 96], [64, 96], [78, 124]], cloth(ramp('#8aa8e8'), 34, 78, 4, 1))
  a.poly([[46, 78], [62, 78], [66, 100], [44, 100]], cloth(ramp('#c8d8ff'), 44, 66, 3, 0))
  a.rect(51, 74, 6, 6, PALE[3])
  a.poly([[42, 62], [54, 52], [67, 62], [66, 92], [60, 78], [48, 78], [42, 92]], cylinder(ramp('#f0d890'), 42, 67))
  head(a, 54, 66, 8, { skin: PALE, mouth: 'smile', look: 1 })
  a.line(62, 84, 78, 112, PALE[3], 3)
  a.line(48, 86, 38, 114, PALE[3], 3)
  // кувшины и струи
  a.ellipse(82, 118, 6, 7, sphere(ramp('#c8892a'), 80, 115, 6, 7))
  a.line(74, 112, 80, 118, hex('#e8e0d0'), 2)
  a.line(84, 124, 90, 138, hex('#bfd8ff'), 2, false)
  a.line(40, 118, 34, 138, hex('#bfd8ff'), 2, false)
  for (const x of [86, 90, 36]) a.set(x, 136, hex('#ffffff'), false)
}

export function cardNineteen(a: Art) {
  sky(a, [[0, '#2a78d8'], [0.6, '#6ab8f0'], [1, '#f6e4a0']])
  a.glow(64, 40, 50, hex('#fff6c0'), 0.9)
  for (let k = 0; k < 16; k++) {
    const t = (k / 16) * Math.PI * 2
    a.poly([[64 + Math.cos(t - 0.12) * 24, 40 + Math.sin(t - 0.12) * 24], [64 + Math.cos(t) * 40, 40 + Math.sin(t) * 40], [64 + Math.cos(t + 0.12) * 24, 40 + Math.sin(t + 0.12) * 24]], hex(k % 2 ? '#ffd84a' : '#ff9a30'), false)
  }
  head(a, 64, 40, 18, { skin: ramp('#ffc830'), mouth: 'grin', look: 0 })
  // кирпичная стена и подсолнухи
  a.rect(X0, 108, X1 - X0, 24, stone(ramp('#c8683a'), { w: 10, h: 5 }, 0.6))
  for (let x = 16; x < 116; x += 20) {
    a.line(x, 120, x, 112, hex('#2a8a3a'), 2)
    a.ellipse(x, 104, 8, 8, sphere(ramp('#ffc830'), x - 2, 102, 8))
    a.ellipse(x, 104, 4, 4, hex('#5a2a12'))
  }
  a.rect(X0, 132, X1 - X0, 52, (x, y) => tone(ramp('#5aa84a'), 0.5 + (hash(x, y, 4) - 0.5) * 0.3, x, y), false)
  // белая лошадь и ребёнок с красным знаменем
  const horse = ramp('#f4f0f4')
  a.ellipse(64, 150, 20, 9, sphere(horse, 56, 146, 20, 9))
  a.poly([[80, 146], [88, 128], [96, 132], [88, 150]], cylinder(horse, 80, 96))
  a.poly([[88, 128], [100, 132], [98, 138], [90, 136]], cylinder(horse, 88, 100))
  for (const lx of [48, 54, 72, 78]) a.rect(lx, 156, 3, 18, cylinder(horse, lx, lx + 3))
  a.poly([[60, 124], [72, 124], [74, 146], [58, 146]], cloth(ramp('#f4f0f4'), 58, 74, 2, 0))
  head(a, 66, 114, 7, { mouth: 'smile' })
  a.poly([[60, 108], [66, 102], [72, 108]], hex('#e8281e'))
  a.line(78, 140, 98, 100, hex('#6a4a2a'), 2)
  a.poly([[98, 100], [114, 106], [98, 116]], cloth(ramp('#e8281e'), 98, 114, 2, 0))
  // слишком ровная улыбка солнца: тонкая капля
  drip(a, 58, 54, 6)
}

export const SCENES2: Record<number, (a: Art) => void> = {
  3: cardThree,
  4: cardFour,
  13: cardThirteen,
  17: cardSeventeen,
  19: cardNineteen,
}
export { vgrad, SKIN }
