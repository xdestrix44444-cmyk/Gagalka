// Страница для просмотра колоды: npm run dev, затем /deck.html
import { ACTIVE_DECK } from './deck'
import { drawCardBack, drawCardFace } from './sprites'

const grid = document.getElementById('grid')!
const add = (draw: (c: HTMLCanvasElement) => void, caption: string) => {
  const fig = document.createElement('figure')
  const canvas = document.createElement('canvas')
  draw(canvas)
  const cap = document.createElement('figcaption')
  cap.textContent = caption
  fig.append(canvas, cap)
  grid.append(fig)
}
add(drawCardBack, 'Рубашка')
for (const c of ACTIVE_DECK) {
  add((canvas) => drawCardFace(canvas, c.id), `${c.numeral} ${c.name}`)
  if (c.corrupt) add((canvas) => drawCardFace(canvas, c.id, true), `${c.numeral} ${c.name} (повреждённая)`)
}
