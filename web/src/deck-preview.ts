// Страница для просмотра колоды: npm run dev, затем /deck.html
import { DECK } from './deck'
import { drawCardBack, drawCardFace, hasArt } from './sprites'

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
for (const c of DECK) if (hasArt(c.id)) add((canvas) => drawCardFace(canvas, c.id), `${c.numeral} ${c.name}`)
