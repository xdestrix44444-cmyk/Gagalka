// Колода «Нить»: карты из готовых рисунков (src/art/img через шаблон preset.ts, 320×480).
// У Башни один рисунок на обе версии: повреждённую отличают подпись «ERR» и толкование.
// Шаблон: чёрные поля, тонкая рамка, номер сверху, имя снизу, штриховка строками и потёки.

import { back } from './art/cards'
import { H, Ink, W, frame, melt, toPixels } from './art/ink'
import { presetFromImage } from './art/preset'
import { DECK } from './deck'
import backImg from './art/img/back.jpg'
import foolImg from './art/img/00-fool.jpg'
import hierophantImg from './art/img/05-hierophant.jpg'
import towerImg from './art/img/16-tower.jpg'
import starImg from './art/img/17-star.jpg'
import wands2Img from './art/img/wands-02.jpg'
import cups7Img from './art/img/cups-07.jpg'

export { H, W }

/** Рисунки по id карты (см. deck.ts): 23 — двойка жезлов, 42 — семёрка кубков. */
const ART: Record<number, string> = { 0: foolImg, 5: hierophantImg, 16: towerImg, 17: starImg, 23: wands2Img, 42: cups7Img }

export function hasArt(id: number) {
  return id in ART
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

function paintImage(canvas: HTMLCanvasElement, src: string, top: string, bottom: string, framed = true) {
  const t = ++ticket
  pending.set(canvas, t)
  loadImage(src).then(
    (img) => {
      if (pending.get(canvas) === t) presetFromImage(canvas, img, top, bottom, true, framed)
    },
    () => {},
  )
}

function paint(canvas: HTMLCanvasElement, build: (ink: Ink) => void, top: string, bottom: string, corrupt = false) {
  pending.delete(canvas)
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const ink = new Ink()
  build(ink)
  melt(ink, 7, corrupt ? 80 : 16, corrupt ? 60 : 28)
  const d = toPixels(ink)
  frame(d, top, bottom)
  ctx.putImageData(new ImageData(d, W, H), 0, 0)
}

/** Лицевая сторона карты. Для карт без готового рисунка — рубашка. */
export function drawCardFace(canvas: HTMLCanvasElement, id: number, corrupt = false) {
  const card = DECK[id]
  const top = corrupt ? `${card.numeral} · ERR` : card.numeral
  const bottom = card.name.toUpperCase()
  const src = ART[id]
  // пока грузится рисунок, видна рубашка; карты без рисунка остаются рубашкой
  drawCardBack(canvas)
  if (src) paintImage(canvas, src, top, bottom)
}

export function drawCardBack(canvas: HTMLCanvasElement) {
  paint(canvas, back, 'НИТЬ', 'НЕЙРО-ТАРО')
  // у рисунка рубашки своя рамка, поэтому без шаблонной
  paintImage(canvas, backImg, '', '', false)
}
