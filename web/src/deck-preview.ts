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
  for (const integrity of [97, 74, 45, 12]) add((canvas) => drawCardFace(canvas, c.id, integrity), `${c.numeral} ${c.name} · ${integrity}%`)
}
