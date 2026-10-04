// Сцены карт для движка ink.ts. Свет сверху слева, фон почти чёрный.
// Люди только там, где карта названа человеком, и всегда в масках.
// Где в названии нет человека (Луна, Башня, Смерть), фокус на предметах.

import { AX0, AX1, AY0, AY1, Ink, cloth, cyl, drip, eye, grain, hash, maskHead, rain, sphere, vgrad } from './ink'

type Scene = (ink: Ink) => void

function sky(ink: Ink, a: number, b: number, seed: number) {
  ink.rect(AX0, AY0, AX1 - AX0, AY1 - AY0, grain(vgrad(AY0, AY1, a, b), 0.05, seed))
}

/** Кирпичная башня-цилиндр с зубцами. */
function tower(ink: Ink, x0: number, x1: number, y0: number, y1: number, hi = 0.42, teeth = true) {
  const body = cyl(x0, x1, 0.03, hi)
  const brick = (x: number, y: number) => {
    const row = Math.floor((y - y0) / 5)
    const seam = (y - y0) % 5 === 0 || (x - x0 + (row % 2) * 4) % 8 === 0
    return (body(x, y) ?? 0) * (seam ? 0.55 : 1) + (hash(x, y, 9) - 0.5) * 0.05
  }
  ink.rect(x0, y0, x1 - x0, y1 - y0, brick)
  if (teeth) for (let x = x0; x < x1 - 2; x += 6) ink.rect(x, y0 - 5, 4, 5, brick)
}

/** Воющий зверь-силуэт со светящимся глазом. s = 1 смотрит вправо. */
function beast(ink: Ink, x: number, y: number, s: number) {
  const c = 0.025
  ink.ellipse(x, y, 13, 6, c)
  ink.poly([[x + 5 * s, y - 4], [x + 11 * s, y - 18], [x + 16 * s, y - 16], [x + 12 * s, y + 2]], c)
  ink.poly([[x + 11 * s, y - 18], [x + 15 * s, y - 28], [x + 18 * s, y - 17]], c)
  ink.poly([[x + 10 * s, y - 17], [x + 9 * s, y - 24], [x + 13 * s, y - 19]], c)
  for (const lx of [-9, -4, 5, 9]) ink.rect(x + lx * s, y + 3, 2, 10, c)
  ink.poly([[x - 12 * s, y - 2], [x - 21 * s, y - 9], [x - 18 * s, y + 2]], c)
  eye(ink, x + 14 * s, y - 19, 0.8, false)
}

/** Падающая фигура в маске. */
function faller(ink: Ink, x: number, y: number, s: number) {
  ink.line(x - 3, y + 4, x - 11 * s, y - 4, 0.22, 2)
  ink.line(x + 3, y + 4, x + 10 * s, y + 12, 0.22, 2)
  ink.line(x, y + 16, x - 8 * s, y + 27, 0.12, 2)
  ink.line(x + 2, y + 16, x + 9 * s, y + 23, 0.12, 2)
  ink.poly([[x - 4, y + 3], [x + 5, y + 4], [x + 4 * s, y + 18], [x - 5 * s, y + 16]], cloth(x - 5, x + 5, 2, 0.03, 0.4))
  ink.ellipse(x, y, 4, 4.8, sphere(x, y, 4, 4.8, 0.15, 1))
  ink.set(x - 1.5, y - 0.5, 0)
  ink.set(x + 1.5, y - 0.5, 0)
  ink.rect(x - 1, y + 2, 2, 2, 0)
}

function flame(ink: Ink, x: number, y: number, h: number, w: number, seed: number) {
  ink.glow(x, y - h / 2, w * 1.6, 0.35, h)
  for (let k = 0; k < 5; k++) {
    const t = k / 5
    const cx = x + (hash(k, 1, seed) - 0.5) * w * 0.6
    ink.ellipse(cx, y - h * t, w * (1 - t) * 0.6 + 1, h * 0.28, 0.55 + t * 0.4)
  }
  ink.poly([[x - 2, y], [x + (hash(seed, 2) - 0.5) * 4, y - h - 4], [x + 2, y]], 1)
}

// ── XVIII Луна ──
export const moon: Scene = (ink) => {
  sky(ink, 0.02, 0.12, 18)
  rain(ink, 18, 70)
  ink.glow(80, 62, 60, 0.3)
  ink.ellipse(80, 62, 30, 30, grain(sphere(80, 62, 30, 30, 0.03, 1), 0.06, 2))
  for (const [x, y, r] of [[70, 52, 5], [89, 68, 7], [75, 77, 4], [93, 50, 3], [65, 66, 3]]) {
    ink.ellipse(x, y, r, r * 0.85, (px, py) => ink.get(px, py) * 0.55)
    ink.ellipse(x + r * 0.35, y + r * 0.3, r * 0.6, r * 0.45, (px, py) => Math.min(1, ink.get(px, py) * 1.5))
  }
  drip(ink, 73, 92, 12, 0.75)
  drip(ink, 87, 91, 22, 0.6)
  // роса с луны
  for (let k = 0; k < 14; k++) ink.rect(56 + Math.floor(hash(k, 3) * 48), 98 + Math.floor(hash(k, 4) * 18), 1, 2, 0.8)
  // холмы и земля
  ink.poly([[AX0, 128], [30, 118], [56, 126], [80, 120], [104, 126], [130, 116], [AX1, 124], [AX1, 152], [AX0, 152]], grain(vgrad(116, 152, 0.18, 0.06), 0.06, 4))
  ink.rect(AX0, 150, AX1 - AX0, 48, grain(vgrad(150, 198, 0.3, 0.12), 0.1, 5))
  tower(ink, 14, 40, 96, 172)
  tower(ink, 120, 146, 96, 172)
  for (const x of [27, 133]) {
    ink.rect(x - 2, 110, 4, 10, 0.01)
    ink.rect(x - 1, 112, 2, 5, 1)
    ink.glow(x, 114, 9, 0.25)
  }
  // дорога
  ink.poly([[76, 124], [84, 124], [96, 150], [86, 168], [114, 198], [46, 198], [74, 168], [64, 150]], grain(vgrad(124, 198, 0.3, 0.72), 0.08, 6))
  // фигура без лица вдали
  ink.rect(79, 128, 3, 13, 0)
  ink.ellipse(80.5, 126, 2, 2.4, 0)
  beast(ink, 44, 176, 1)
  beast(ink, 116, 176, -1)
  // вода и рак
  ink.rect(AX0, 196, AX1 - AX0, 12, 0.03)
  for (let k = 0; k < 9; k++) ink.line(60 + k * 4 - (k % 3) * 2, 198 + (k % 4) * 2, 64 + k * 4, 198 + (k % 4) * 2, 0.55)
  ink.ellipse(80, 205, 8, 4, 0.02)
  ink.line(72, 204, 66, 198, 0.02, 2)
  ink.line(88, 204, 94, 198, 0.02, 2)
  ink.set(78, 202, 1)
  ink.set(82, 202, 1)
}

export const moonCorrupt: Scene = (ink) => {
  moon(ink)
  // луна становится глазом
  ink.ellipse(80, 62, 28, 14, grain(sphere(80, 58, 28, 14, 0.25, 1), 0.05, 3))
  ink.ellipse(80, 62, 13, 13, grain(sphere(78, 60, 13, 13, 0.05, 0.45), 0.08, 4))
  ink.rect(78, 50, 4, 25, 0)
  ink.set(74, 56, 1)
  ink.set(75, 56, 1)
  for (let k = 0; k < 9; k++) ink.line(53 + k * 6, 48 - (k % 2) * 2, 55 + k * 6, 44 - (k % 3) * 3, 0.9)
  for (const [x, l] of [[64, 30], [72, 46], [90, 38], [97, 22]]) drip(ink, x, 74, l, 0.7)
  // глаза в холмах
  for (const [x, y] of [[22, 136], [46, 140], [104, 134], [126, 142], [60, 132], [140, 138]]) {
    eye(ink, x, y, 0.8, false)
    eye(ink, x + 4, y, 0.8, false)
  }
  // фигура ближе и выше
  ink.rect(76, 120, 9, 40, 0)
  ink.ellipse(80.5, 116, 5, 6, 0)
  ink.line(76, 126, 66, 158, 0, 2)
  ink.line(84, 126, 94, 158, 0, 2)
}

// ── XVI Башня ──
export const towerCard: Scene = (ink) => {
  sky(ink, 0.03, 0.12, 16)
  for (const [cx, cy, rx, ry] of [[40, 34, 36, 12], [114, 30, 38, 11], [78, 50, 42, 10]])
    ink.ellipse(cx, cy, rx, ry, grain(sphere(cx, cy - 4, rx, ry, 0.04, 0.32), 0.08, cx))
  rain(ink, 16, 60)
  ink.poly([[AX0, 182], [40, 172], [70, 178], [100, 170], [130, 178], [AX1, 174], [AX1, AY1], [AX0, AY1]], grain(vgrad(170, 208, 0.26, 0.05), 0.1, 2))
  // башня
  tower(ink, 60, 100, 76, 196, 0.78, false)
  for (let x = 60; x < 100; x += 5) {
    const h = 2 + Math.floor(hash(x, 1, 16) * 10)
    ink.rect(x, 76 - h, 5, h, cyl(60, 100, 0.03, 0.78))
  }
  // слетевшая корона
  ink.poly([[96, 56], [120, 46], [126, 56], [102, 66]], grain(cyl(96, 126, 0.05, 0.7), 0.1, 3))
  for (const [x, y] of [[100, 52], [108, 49], [116, 46]]) ink.rect(x, y - 4, 3, 4, 0.6)
  // огонь
  flame(ink, 66, 74, 18, 10, 1)
  flame(ink, 80, 70, 26, 14, 2)
  flame(ink, 93, 76, 14, 8, 3)
  // молния
  const bolt: [number, number][] = [[112, AY0], [104, 32], [110, 36], [96, 52], [102, 54], [86, 70]]
  for (let k = 0; k + 1 < bolt.length; k++) {
    ink.line(bolt[k][0], bolt[k][1], bolt[k + 1][0], bolt[k + 1][1], 0.85, 3)
    ink.line(bolt[k][0], bolt[k][1], bolt[k + 1][0], bolt[k + 1][1], 1, 1)
  }
  ink.glow(100, 44, 40, 0.35, 34)
  // окна-глаза и трещина-рот
  for (const x of [70, 90]) {
    ink.rect(x - 4, 100, 8, 11, 0.01)
    eye(ink, x, 105, 1.6, false)
    drip(ink, x, 111, 14, 0.85)
  }
  const crack: [number, number][] = [[66, 140], [70, 136], [74, 141], [78, 135], [82, 141], [86, 136], [90, 141], [94, 137]]
  for (let k = 0; k + 1 < crack.length; k++) ink.line(crack[k][0], crack[k][1], crack[k + 1][0], crack[k + 1][1], 0.01, 2)
  // дверь
  ink.poly([[74, 196], [74, 178], [80, 172], [86, 178], [86, 196]], 0.01)
  faller(ink, 32, 96, 1)
  faller(ink, 128, 128, -1)
  for (let k = 0; k < 26; k++) ink.set(40 + Math.floor(hash(k, 2, 1) * 80), 48 + Math.floor(hash(k, 2, 2) * 90), 0.95)
}

export const towerCorrupt: Scene = (ink) => {
  towerCard(ink)
  ink.ellipse(42, 36, 26, 9, grain(sphere(42, 32, 26, 9, 0.2, 0.95), 0.05, 5))
  ink.ellipse(42, 36, 8, 8, sphere(40, 34, 8, 8, 0.05, 0.4))
  ink.rect(41, 28, 3, 16, 0)
  for (const [x, l] of [[30, 20], [38, 34], [52, 26]]) drip(ink, x, 44, l, 0.7)
  // пасть на башне
  ink.ellipse(80, 140, 17, 10, 0)
  for (let i = 0; i < 11; i++) {
    const x = 66 + i * 3
    ink.poly([[x, 131], [x + 3, 131], [x + 1.5, 138]], 0.95)
    ink.poly([[x, 149], [x + 3, 149], [x + 1.5, 142]], 0.95)
  }
  for (const x of [70, 90]) drip(ink, x, 111, 28, 0.95)
}

// ── I Маг ──
export const magician: Scene = (ink) => {
  ink.rect(AX0, AY0, AX1 - AX0, AY1 - AY0, (x, y) => (vgrad(AY0, AY1, 0.1, 0.03)(x, y) ?? 0) * ((y - AY0) % 9 === 0 ? 0.6 : 1) + (hash(x, y, 1) - 0.5) * 0.04)
  rain(ink, 1, 40, 0.1, 0.22)
  // тень на стене с ухмылкой
  ink.poly([[110, 78], [132, 80], [140, 150], [104, 150]], 0)
  ink.ellipse(124, 66, 11, 12, 0)
  for (let i = 0; i < 7; i++) ink.rect(117 + i * 2.2, 71 + (i % 2), 1, 2, 0.95)
  for (const x of [119, 129]) ink.line(x - 2, 61, x + 2, 62, 0.95)
  // знак бесконечности
  for (let k = 0; k < 220; k++) {
    const t = (k / 220) * Math.PI * 2
    const d = 1 + Math.sin(t) ** 2
    ink.set(80 + (20 * Math.cos(t)) / d, 30 + (20 * Math.sin(t) * Math.cos(t)) / d, 1)
  }
  ink.glow(80, 30, 26, 0.18, 10)
  // мантия и туника
  ink.poly([[60, 74], [100, 74], [114, 168], [46, 168]], cloth(46, 114, 3, 0.06, 0.8))
  ink.poly([[74, 76], [86, 76], [90, 166], [70, 166]], cloth(70, 90, 1, 0.35, 0.98, 0.2))
  ink.rect(70, 112, 20, 4, 0.06)
  ink.rect(78, 112, 4, 4, 0.9)
  // поднятая рука с жезлом (слева)
  ink.poly([[60, 78], [68, 76], [52, 42], [45, 45]], cloth(45, 68, 1, 0.12, 0.85))
  ink.ellipse(48, 41, 3.5, 3.5, sphere(48, 41, 3.5, 3.5, 0.25, 1))
  ink.line(48, 42, 38, AY0 + 2, 0.95, 2)
  ink.glow(38, AY0 + 3, 12, 0.5)
  // опущенная рука указывает вниз (справа)
  ink.poly([[93, 78], [100, 76], [110, 126], [103, 128]], cloth(93, 110, 1, 0.08, 0.6))
  ink.ellipse(107, 131, 3, 3.5, sphere(107, 131, 3, 3.5, 0.25, 0.95))
  ink.ellipse(80, 78, 24, 7, cloth(56, 104, 2, 0.06, 0.75))
  maskHead(ink, 80, 54, 13, 'porcelain', 'open')
  // стол
  ink.rect(AX0, 148, AX1 - AX0, 6, grain(vgrad(148, 154, 0.62, 0.35), 0.1, 8))
  ink.rect(AX0, 154, AX1 - AX0, AY1 - 154, cloth(AX0, AX1, 7, 0.03, 0.42))
  // чаша
  ink.ellipse(30, 136, 9, 7, grain(sphere(30, 132, 9, 7, 0.05, 0.95), 0.05, 9))
  ink.rect(28, 141, 4, 6, cyl(28, 32, 0.1, 0.8))
  ink.ellipse(30, 147, 7, 2, sphere(30, 146, 7, 2, 0.1, 0.8))
  ink.ellipse(30, 131, 7, 1.6, 0.04)
  // меч
  ink.line(94, 146, 140, 143, 0.9, 2)
  ink.line(94, 145, 140, 142, 1, 1)
  ink.rect(90, 141, 3, 9, 0.6)
  ink.rect(84, 144, 7, 3, 0.4)
  // монета-пентакль
  ink.ellipse(120, 136, 8, 5, grain(sphere(118, 134, 8, 5, 0.1, 1), 0.06, 10))
  for (let k = 0; k < 5; k++) {
    const a = (k * 4 * Math.PI) / 5 - Math.PI / 2
    const b = ((k + 1) * 4 * Math.PI) / 5 - Math.PI / 2
    ink.line(120 + Math.cos(a) * 5, 136 + Math.sin(a) * 3.2, 120 + Math.cos(b) * 5, 136 + Math.sin(b) * 3.2, 0.1)
  }
  // жезл на столе
  ink.line(46, 146, 70, 144, 0.55, 2)
  drip(ink, 40, 154, 10, 0.5)
  drip(ink, 118, 154, 16, 0.5)
}

// ── XIII Смерть ──
export const death: Scene = (ink) => {
  sky(ink, 0.03, 0.5, 13)
  rain(ink, 13, 40, 0.1, 0.25)
  ink.glow(80, 138, 54, 0.4)
  ink.ellipse(80, 134, 16, 16, grain(sphere(80, 134, 16, 16, 0.55, 1), 0.05, 2))
  tower(ink, 12, 38, 104, 196)
  tower(ink, 122, 148, 104, 196)
  for (const x of [25, 135]) ink.rect(x - 2, 118, 5, 10, 0.01)
  ink.rect(AX0, 150, AX1 - AX0, AY1 - 150, grain(vgrad(150, 208, 0.16, 0.04), 0.1, 3))
  // коса
  ink.line(40, 206, 100, 40, 0.2, 3)
  ink.line(39, 205, 99, 39, 0.5, 1)
  ink.poly([[100, 40], [136, 34], [150, 52], [128, 44], [102, 50]], (x, y) => 0.95 - (y - 34) * 0.03 + (hash(x, y, 4) - 0.5) * 0.06)
  ink.line(102, 50, 128, 44, 1)
  ink.line(128, 44, 150, 52, 1)
  // чёрная роза
  ink.shade(80, 170, 30, 0.6)
  for (const [r, k] of [[18, 0], [14, 1], [10, 2], [6, 3], [3, 4]] as [number, number][])
    ink.ellipse(80 + (k % 2) * 1.5, 170 - k * 1.2, r, r * 0.82, grain(sphere(78, 166 - k, r, r * 0.82, 0.01, k % 2 ? 0.34 : 0.22), 0.04, k))
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2
    ink.line(80 + Math.cos(a) * 9, 170 + Math.sin(a) * 7, 80 + Math.cos(a) * 17, 170 + Math.sin(a) * 14, 0.45)
  }
  ink.line(80, 185, 80, AY1, 0.08, 3)
  ink.poly([[80, 196], [94, 188], [90, 199]], 0.2)
  // песочные часы
  ink.rect(16, 158, 20, 3, 0.85)
  ink.rect(16, 196, 20, 3, 0.85)
  ink.line(17, 160, 17, 196, 0.6)
  ink.line(35, 160, 35, 196, 0.6)
  ink.poly([[19, 161], [33, 161], [27, 178], [25, 178]], 0.22)
  ink.poly([[25, 178], [27, 178], [33, 196], [19, 196]], (_, y) => (y > 186 ? 0.9 : 0.25))
  ink.line(26, 178, 26, 188, 0.9)
  // вороны
  ink.line(98, 166, 146, 164, 0.18, 2)
  for (const x of [104, 118, 134]) {
    ink.ellipse(x, 160, 5, 4, 0.02)
    ink.ellipse(x + 4, 156, 3, 3, 0.02)
    ink.poly([[x + 6, 155], [x + 11, 157], [x + 6, 158]], 0.4)
    eye(ink, x + 5, 155.5, 0.6, false)
  }
}

// ── рубашка ──
export const back: Scene = (ink) => {
  ink.rect(AX0, AY0, AX1 - AX0, AY1 - AY0, grain(() => 0.03, 0.04, 99))
  rain(ink, 99, 90, 0.08, 0.2)
  const cx = 80
  const cy = 114
  for (const r of [60, 50, 42]) for (let k = 0; k < 400; k++) {
    const t = (k / 400) * Math.PI * 2
    if (hash(k, r) > 0.15) ink.set(cx + Math.cos(t) * r * 0.9, cy + Math.sin(t) * r, 0.35)
  }
  // нить сверху и снизу
  for (let y = AY0; y < AY1; y++) {
    if (Math.abs(y - cy) < 26) continue
    ink.set(cx + Math.sin(y * 0.12) * 3, y, 0.7)
  }
  // глаз
  const w = 30
  const h = 15
  const lid = (x: number, y: number) => {
    const t = (x - cx) / w
    const e = h * (1 - t * t)
    return Math.abs(y - cy) <= e
  }
  ink.rect(cx - w, cy - h, 2 * w, 2 * h, (x, y) => (lid(x, y) ? 0.25 + 0.65 * (1 - Math.abs(y - cy) / h) ** 0.6 * (1 - Math.abs(x - cx) / w * 0.4) : null))
  ink.ellipse(cx, cy, 11, 11, grain((x, y) => 0.15 + 0.35 * Math.abs(Math.sin(Math.atan2(y - cy, x - cx) * 9)), 0.1, 4))
  ink.ellipse(cx, cy, 11, 11, (x, y) => (lid(x, y) ? ink.get(x, y) : null))
  ink.rect(cx - 1, cy - 10, 3, 21, (x, y) => (lid(x, y) ? 0 : null))
  ink.ellipse(cx - 4, cy - 4, 1.5, 1.5, 1)
  for (let k = -5; k <= 5; k++) {
    const x = cx + k * 5
    const t = (x - cx) / w
    ink.line(x, cy - h * (1 - t * t), x + k * 0.6, cy - h * (1 - t * t) - 5, 0.75)
  }
  for (const [x, l] of [[cx - 10, 16], [cx + 3, 26], [cx + 14, 12]]) drip(ink, x, cy + h * (1 - ((x - cx) / w) ** 2) + 1, l, 0.7)
}

/** Сцены по номеру аркана. Остальные карты рисуются после утверждения шаблона. */
export const SCENES: Record<number, Scene> = { 1: magician, 13: death, 16: towerCard, 18: moon }
export const CORRUPT_SCENES: Record<number, Scene> = { 16: towerCorrupt, 18: moonCorrupt }
