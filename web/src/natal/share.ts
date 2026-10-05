// Картинка для сторис: три главных знака эмблемами, баланс стихий и главная связь. Рисуется на canvas 1080×1920.

import { SIGNS, type Chart, type Element } from './chart'
import { signEmblem } from './emblems'
import { elementBalance } from './portrait'

const W = 1080
const H = 1920
const COLORS: Record<Element, string> = { fire: '#e07a4f', earth: '#b9a77a', air: '#9fb8c9', water: '#3fb3a3' }
const NAMES: Record<Element, string> = { fire: 'огонь', earth: 'земля', air: 'воздух', water: 'вода' }

const load = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

/** Рисует карточку и отдаёт PNG. Имя — подпись карты, без даты и места рождения. */
export async function renderShare(chart: Chart, name: string, mainLink: string): Promise<Blob> {
  await document.fonts.load('40px "Press Start 2P"', 'НИТЬ')
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const d = c.getContext('2d')!
  d.imageSmoothingEnabled = false

  d.fillStyle = '#060608'
  d.fillRect(0, 0, W, H)
  // свечение и строчная развёртка, как на экране приложения
  const glow = d.createRadialGradient(W / 2, 760, 50, W / 2, 760, 700)
  glow.addColorStop(0, 'rgba(63,179,163,0.16)')
  glow.addColorStop(0.5, 'rgba(181,84,60,0.07)')
  glow.addColorStop(1, 'rgba(0,0,0,0)')
  d.fillStyle = glow
  d.fillRect(0, 0, W, H)

  // пиксельная рамка
  d.fillStyle = '#b5543c'
  for (const [x, y, w, h] of [[48, 48, W - 96, 6], [48, H - 54, W - 96, 6], [48, 48, 6, H - 96], [W - 54, 48, 6, H - 96]]) d.fillRect(x, y, w, h)
  d.fillStyle = '#4a3a33'
  for (const [x, y, w, h] of [[66, 66, W - 132, 3], [66, H - 69, W - 132, 3], [66, 66, 3, H - 132], [W - 69, 66, 3, H - 132]]) d.fillRect(x, y, w, h)

  d.textAlign = 'center'
  d.textBaseline = 'middle'
  d.fillStyle = '#d9d2c3'
  d.font = '88px "Press Start 2P"'
  d.fillText('НИТЬ', W / 2, 210)
  d.fillStyle = '#3fb3a3'
  d.font = '26px "Press Start 2P"'
  d.fillText('натальная карта', W / 2, 300)
  d.fillStyle = '#d9d2c3'
  d.font = '40px "Press Start 2P"'
  d.fillText(name.slice(0, 18), W / 2, 420)

  const trio: [string, number][] = [
    ['Солнце', chart.planets[0].sign],
    ['Луна', chart.planets[1].sign],
  ]
  if (chart.angles) trio.push(['Асцендент', Math.floor(chart.angles.asc / 30)])
  const images = await Promise.all(trio.map(([, s]) => load(signEmblem(s))))
  const size = 256
  const gap = (W - 160 - size * trio.length) / Math.max(1, trio.length - 1)
  trio.forEach(([label, sign], i) => {
    const x = trio.length === 1 ? (W - size) / 2 : 80 + i * (size + gap)
    d.drawImage(images[i], x, 560, size, size)
    d.fillStyle = '#8a8378'
    d.font = '26px "Press Start 2P"'
    d.fillText(label, x + size / 2, 870)
    d.fillStyle = '#d9d2c3'
    d.font = '30px "Press Start 2P"'
    d.fillText(SIGNS[sign], x + size / 2, 925)
  })

  // баланс стихий полосками по 20 клеток
  const balance = elementBalance(chart)
  const total = Object.values(balance).reduce((a, b) => a + b, 0)
  ;(['fire', 'earth', 'air', 'water'] as Element[]).forEach((e, row) => {
    const y = 1060 + row * 90
    d.textAlign = 'left'
    d.fillStyle = '#8a8378'
    d.font = '24px "Press Start 2P"'
    d.fillText(NAMES[e], 120, y)
    const filled = Math.round((balance[e] / total) * 20)
    for (let i = 0; i < 20; i++) {
      d.fillStyle = i < filled ? COLORS[e] : '#16161b'
      d.fillRect(370 + i * 30, y - 16, 24, 32)
    }
  })

  d.textAlign = 'center'
  d.fillStyle = '#b5543c'
  d.font = '24px "Press Start 2P"'
  d.fillText('главная связь', W / 2, 1480)
  d.fillStyle = '#d9d2c3'
  d.font = '28px "Press Start 2P"'
  wrap(d, mainLink, W / 2, 1550, W - 220, 48)

  d.fillStyle = '#4a3a33'
  d.font = '22px "Press Start 2P"'
  d.fillText('нить · нейро-таро', W / 2, H - 140)

  return new Promise((resolve) => c.toBlob((b) => resolve(b!), 'image/png'))
}

function wrap(d: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  const words = text.split(' ')
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (d.measureText(test).width > max && line) {
      d.fillText(line, x, y)
      line = w
      y += lh
    } else line = test
  }
  if (line) d.fillText(line, x, y)
}

/** Отдать картинку: системное «Поделиться» на телефоне, иначе скачать файл. */
export async function shareImage(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] })
      return
    } catch {
      // человек закрыл окно «Поделиться» — тогда просто скачиваем
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
