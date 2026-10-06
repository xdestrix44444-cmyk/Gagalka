// Колода «Нить»: карты из готовых рисунков (src/art/img через шаблон preset.ts, 320×480).
// Целостность ломает картинку кодом (damage): сдвиги строк, расслоение цвета, выпавшие блоки.
// Шаблон: чёрные поля, тонкая рамка, номер сверху, имя снизу, штриховка строками и потёки.

import { back } from './art/cards'
import { AY1, H, Ink, W, frame, melt, toPixels } from './art/ink'
import { K, presetFromImage } from './art/preset'
import { DECK } from './deck'
import backImg from './art/img/back.jpg'
import wands2Img from './art/img/wands-02.jpg'
import cups7Img from './art/img/cups-07.jpg'

export { H, W }

/** Старшие арканы: файл «NN-имя.jpg», где NN — id карты. */
const MAJOR_ART = import.meta.glob<string>('./art/img/[0-9][0-9]-*.jpg', { eager: true, import: 'default' })

/** Рисунки по id карты (см. deck.ts): старшие по номеру файла, 23 — двойка жезлов, 42 — семёрка кубков. */
const ART: Record<number, string> = { 23: wands2Img, 42: cups7Img }
for (const [path, src] of Object.entries(MAJOR_ART)) ART[Number(path.match(/(\d\d)-[^/]*$/)![1])] = src

export function hasArt(id: number) {
  return id in ART
}

/** Исходный рисунок карты для миниатюр (без рамки и обработки), если он есть. */
export function artOf(id: number): string | undefined {
  return ART[id]
}

const images = new Map<string, Promise<HTMLImageElement>>()

function loadImage(src: string) {
  let p = images.get(src)
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
    images.set(src, p)
  }
  return p
}

/** Последний заказанный рисунок для каждого холста: старая загрузка не перерисует новую карту. */
const pending = new WeakMap<HTMLCanvasElement, number>()
let ticket = 0

function paintImage(canvas: HTMLCanvasElement, src: string, top: string, bottom: string, framed = true, integrity = 100, seed = 0) {
  const t = ++ticket
  pending.set(canvas, t)
  loadImage(src).then(
    (img) => {
      if (pending.get(canvas) !== t) return
      presetFromImage(canvas, img, top, bottom, true, framed)
      damage(canvas, integrity, seed)
    },
    () => {},
  )
}

function paint(canvas: HTMLCanvasElement, build: (ink: Ink) => void, top: string, bottom: string) {
  pending.delete(canvas)
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const ink = new Ink()
  build(ink)
  melt(ink, 7, 16, 28)
  const d = toPixels(ink)
  frame(d, top, bottom)
  ctx.putImageData(new ImageData(d, W, H), 0, 0)
}

/** Лицевая сторона карты с данной целостностью. Для карт без готового рисунка — рубашка. */
export function drawCardFace(canvas: HTMLCanvasElement, id: number, integrity = 100) {
  const card = DECK[id]
  const top = integrity >= 90 ? card.numeral : `${card.numeral} · ${integrity < 60 ? 'ERR' : `${integrity}%`}`
  const bottom = card.name.toUpperCase()
  const src = ART[id]
  // пока грузится рисунок, видна рубашка; карты без рисунка остаются рубашкой
  drawCardBack(canvas)
  if (src) paintImage(canvas, src, top, bottom, true, integrity, id * 101 + integrity)
}

/** Детерминированный генератор: одна и та же карта с той же целостностью ломается одинаково. */
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Повреждение картинки по целостности: чем ниже процент, тем больше сдвинутых полос,
 * сильнее расслоение каналов и больше выпавших блоков. Целая карта (90+) почти не тронута.
 */
export function damage(canvas: HTMLCanvasElement, integrity: number, seed: number) {
  const s = Math.max(0, Math.min(1, (100 - integrity) / 100))
  if (s < 0.02) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  // полоса с именем карты внизу не ломается: имя должно читаться даже у самой битой карты
  const h = Math.min(canvas.height, (AY1 + 1) * K)
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  const src = new Uint8ClampedArray(d)
  const rnd = seeded(seed)
  // размеры сдвигов и блоков заданы для карты шириной 320
  const u = w / 320
  const at = (x: number, y: number) => (y * w + ((x % w) + w) % w) * 4

  // сдвинутые полосы: сдвиг строк по горизонтали
  const slices = Math.round(s * s * 14 + s * 3)
  for (let k = 0; k < slices; k++) {
    const y0 = Math.floor(rnd() * h)
    const sh = Math.round((2 + Math.floor(rnd() * (3 + s * 10))) * u)
    const off = Math.round((rnd() - 0.5) * 2 * (4 + s * 30) * u)
    for (let y = y0; y < Math.min(h, y0 + sh); y++)
      for (let x = 0; x < w; x++) {
        const t = at(x, y)
        const f = at(x - off, y)
        d[t] = src[f]
        d[t + 1] = src[f + 1]
        d[t + 2] = src[f + 2]
      }
  }

  // расслоение каналов: красный уезжает вправо, синий влево
  const split = Math.round(s * 4 * u)
  if (split > 0) {
    const cur = new Uint8ClampedArray(d)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const t = at(x, y)
        d[t] = cur[at(x - split, y)]
        d[t + 2] = cur[at(x + split, y) + 2]
      }
  }

  // выпавшие блоки: только у сильно повреждённых карт, и немного — рисунок должен узнаваться
  const blocks = s > 0.6 ? Math.round((s - 0.6) * 25) : 0
  for (let k = 0; k < blocks; k++) {
    const bw = Math.round((8 + Math.floor(rnd() * 40)) * u)
    const bh = Math.round((4 + Math.floor(rnd() * 16)) * u)
    const x0 = Math.floor(rnd() * (w - bw))
    const y0 = Math.floor(rnd() * (h - bh))
    const mode = rnd()
    for (let y = y0; y < y0 + bh; y++)
      for (let x = x0; x < x0 + bw; x++) {
        const t = at(x, y)
        if (mode < 0.4) d[t] = d[t + 1] = d[t + 2] = 4
        else if (mode < 0.7) {
          const g = rnd() < 0.5 ? 20 : 200
          d[t] = g
          d[t + 1] = g * 0.35
          d[t + 2] = g * 0.45
        } else {
          d[t] = 255 - d[t]
          d[t + 1] = 255 - d[t + 1]
          d[t + 2] = 255 - d[t + 2]
        }
      }
  }
  ctx.putImageData(img, 0, 0)
}

export function drawCardBack(canvas: HTMLCanvasElement) {
  paint(canvas, back, 'НИТЬ', 'НЕЙРО-ТАРО')
  // у рисунка рубашки своя рамка, поэтому без шаблонной
  paintImage(canvas, backImg, '', '', false)
}
