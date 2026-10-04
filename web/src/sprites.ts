// Колода «Нить» в стиле 16-бит: каждая карта рисуется кодом на сетке 128×192
// (затенённые формы, дизеринг, обводка цветом тени). Это живой эскиз дизайна,
// позже арт можно заменить рисунками художника.

import { Art, H, W, cornerOrnaments, frame } from './art/canvas'
import { CORRUPT_SCENES, SCENES, cardBack } from './art/scenes'

export { H, W }

export function hasArt(id: number) {
  return id in SCENES
}

function paint(canvas: HTMLCanvasElement, build: (a: Art) => void, corrupt = false) {
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const a = new Art()
  frame(a)
  build(a)
  a.outline()
  if (corrupt) a.corrupt()
  cornerOrnaments(a)
  ctx.putImageData(new ImageData(a.d, W, H), 0, 0)
}

/** Рисует лицевую сторону карты. Для карт без готового арта рисует рубашку. */
export function drawCardFace(canvas: HTMLCanvasElement, id: number, corrupt = false) {
  const scene = corrupt ? CORRUPT_SCENES[id] : SCENES[id]
  if (!scene) return drawCardBack(canvas)
  paint(canvas, scene, corrupt)
}

export function drawCardBack(canvas: HTMLCanvasElement) {
  paint(canvas, cardBack)
}
