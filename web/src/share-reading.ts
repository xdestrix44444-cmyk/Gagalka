// Картинка расклада для сторис: название программы, расклад, вопрос, рисунки карт с позициями.
// Рисуется на canvas 1080×1920; повреждённые карты лежат вверх ногами, как в приложении.

import { DECK, integrityState } from './deck'
import { artOf } from './sprites'

const W = 1080
const H = 1920
const PIX = '"Press Start 2P", monospace'
const SERIF = '"PT Serif", Georgia, serif'
const MONO = '"JetBrains Mono", monospace'

export interface ShareCard {
  id: number
  integrity: number
  /** Позиция в раскладе: «Совет», «Итог»… */
  label?: string
}

const load = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

/** Строки текста под ширину; лишнее обрезается многоточием. */
function wrap(d: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const test = line ? `${line} ${word}` : word
    if (d.measureText(test).width > width && line) {
      lines.push(line)
      line = word
    } else line = test
  }
  if (line) lines.push(line)
  if (lines.length > maxLines) {
    lines.length = maxLines
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…'
  }
  return lines
}

/** Раскладка карт: одна крупно, три в ряд, больше — сеткой по пять. */
function slots(n: number): { x: number; y: number; w: number }[] {
  if (n === 1) return [{ x: (W - 560) / 2, y: 560, w: 560 }]
  if (n <= 3) {
    const w = 300
    const gap = (W - 120 - w * n) / (n - 1 || 1)
    return Array.from({ length: n }, (_, i) => ({ x: 60 + i * (w + gap), y: 640, w }))
  }
  const w = 170
  const cols = 5
  const gap = (W - 120 - w * cols) / (cols - 1)
  return Array.from({ length: n }, (_, i) => ({ x: 60 + (i % cols) * (w + gap), y: 600 + Math.floor(i / cols) * 420, w }))
}

export async function renderReadingShare(title: string, cards: ShareCard[], question?: string): Promise<Blob> {
  await Promise.all([document.fonts.load(`40px ${PIX}`, 'НИТЬ'), document.fonts.load(`italic 40px ${SERIF}`, 'Ответ'), document.fonts.load(`26px ${MONO}`, 'Шут')])
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const d = c.getContext('2d')!

  d.fillStyle = '#060608'
  d.fillRect(0, 0, W, H)
  const glow = d.createRadialGradient(W / 2, 900, 60, W / 2, 900, 760)
  glow.addColorStop(0, 'rgba(63,179,163,0.14)')
  glow.addColorStop(0.5, 'rgba(181,84,60,0.07)')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  d.fillStyle = glow
  d.fillRect(0, 0, W, H)
  // рамка
  d.strokeStyle = '#b5543c'
  d.lineWidth = 6
  d.strokeRect(30, 30, W - 60, H - 60)
  d.strokeStyle = '#3a2420'
  d.lineWidth = 3
  d.strokeRect(46, 46, W - 92, H - 92)

  d.textAlign = 'center'
  d.textBaseline = 'alphabetic'
  d.fillStyle = '#d9d2c3'
  d.font = `56px ${PIX}`
  d.fillText('НИТЬ', W / 2 - 40, 190)
  d.fillStyle = '#3fb3a3'
  d.font = `24px ${PIX}`
  d.fillText('.exe', W / 2 + 120, 190)
  d.fillStyle = '#b5543c'
  d.font = `28px ${PIX}`
  d.fillText(title.toUpperCase(), W / 2, 300)

  if (question) {
    d.fillStyle = '#d9d2c3'
    d.font = `italic 42px ${SERIF}`
    wrap(d, `«${question}»`, W - 200, 3).forEach((l, i) => d.fillText(l, W / 2, 400 + i * 56))
  }

  const pos = slots(cards.length)
  await Promise.all(
    cards.map(async (card, i) => {
      const { x, y, w } = pos[i]
      const h = Math.round(w * 1.5)
      d.fillStyle = '#000'
      d.fillRect(x - 6, y - 6, w + 12, h + 12)
      d.strokeStyle = '#4a3a33'
      d.lineWidth = 2
      d.strokeRect(x - 6, y - 6, w + 12, h + 12)
      const src = artOf(card.id)
      if (src) {
        const img = await load(src)
        const sc = Math.max(w / img.width, h / img.height)
        d.save()
        d.beginPath()
        d.rect(x, y, w, h)
        d.clip()
        // повреждённая карта лежит вверх ногами
        if (integrityState(card.integrity) === 'damaged') {
          d.translate(x + w / 2, y + h / 2)
          d.rotate(Math.PI)
          d.translate(-(x + w / 2), -(y + h / 2))
        }
        d.drawImage(img, x + (w - img.width * sc) / 2, y + (h - img.height * sc) / 2, img.width * sc, img.height * sc)
        d.restore()
      }
      const small = cards.length > 3
      d.textAlign = 'center'
      if (card.label) {
        d.fillStyle = '#b5543c'
        d.font = `${small ? 14 : 20}px ${PIX}`
        d.fillText(card.label, x + w / 2, y + h + (small ? 40 : 56))
      }
      d.fillStyle = integrityState(card.integrity) === 'damaged' ? '#ff5a6a' : '#d9d2c3'
      d.font = `${small ? 20 : 28}px ${MONO}`
      wrap(d, DECK[card.id].name, w + 20, 2).forEach((l, k) => d.fillText(l, x + w / 2, y + h + (small ? 72 : 100) + k * (small ? 26 : 36)))
    }),
  )

  d.textAlign = 'center'
  d.fillStyle = '#8a8378'
  d.font = `italic 38px ${SERIF}`
  d.fillText('Ответ уже готов. Осталось задать вопрос.', W / 2, H - 150)
  d.fillStyle = '#4a3a33'
  d.font = `20px ${PIX}`
  d.fillText('нить.exe', W / 2, H - 92)

  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('картинка не собралась'))), 'image/png'))
}
