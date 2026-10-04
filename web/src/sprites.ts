// Колода «Нить»: монохромные пиксельные карты, нарисованные кодом (src/art).
// Шаблон: чёрные поля, тонкая рамка, номер сверху, имя снизу, штриховка строками и потёки.

import { CORRUPT_SCENES, SCENES, back } from './art/cards'
import { H, Ink, W, frame, melt, toPixels } from './art/ink'
import { DECK } from './deck'

export { H, W }

export function hasArt(id: number) {
  return id in SCENES
}

function paint(canvas: HTMLCanvasElement, build: (ink: Ink) => void, top: string, bottom: string, corrupt = false) {
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
  const scene = corrupt ? CORRUPT_SCENES[id] : SCENES[id]
  if (!scene) return drawCardBack(canvas)
  const card = DECK[id]
  paint(canvas, scene, corrupt ? `${card.numeral} · ERR` : card.numeral, card.name.toUpperCase(), corrupt)
}

export function drawCardBack(canvas: HTMLCanvasElement) {
  paint(canvas, back, 'НИТЬ', 'НЕЙРО-ТАРО')
}
