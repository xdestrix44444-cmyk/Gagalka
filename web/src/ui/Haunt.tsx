import { useEffect, useRef } from 'react'

/** Логический пиксель фона в CSS-пикселях: фон рисуется крупными пикселями, как карты. */
const PX = 3
const FPS = 12

export interface Eye {
  x: number
  y: number
  /** Масштаб спрайта: 1 или 2 логических пикселя. */
  k: number
  born: number
  life: number
  /** Когда следующий раз моргнуть. */
  blinkAt: number
}

interface Mote {
  x: number
  y: number
  vx: number
  vy: number
  a: number
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)

/** Насколько открыт глаз в момент t: открывается ступенями, иногда моргает, закрывается перед уходом. */
function openness(e: Eye, t: number): number {
  const age = t - e.born
  if (age < 0) return 0
  const left = e.life - age
  if (left <= 0) return 0
  const edge = Math.min(age, left)
  let a = Math.min(1, edge / 900)
  if (t > e.blinkAt && t < e.blinkAt + 220) a = 0.15
  return Math.round(a * 4) / 4
}

export function drawEye(d: CanvasRenderingContext2D, e: Eye, a: number, lookX: number, lookY: number) {
  if (a <= 0) return
  const k = e.k
  const px = (x: number, y: number, c: string) => {
    d.fillStyle = c
    d.fillRect(Math.round(e.x + x * k), Math.round(e.y + y * k), k, k)
  }
  // миндалевидная склера шириной 13; высота зависит от того, насколько открыт глаз
  const lid = (x: number) => Math.round(a * 3 * (1 - (x / 6.6) ** 2))
  for (let x = -6; x <= 6; x++) {
    const h = lid(x)
    if (h <= 0) {
      px(x, 0, '#1a0d0d')
      continue
    }
    px(x, -h - 1, '#1a0d0d')
    px(x, h + 1, '#1a0d0d')
    for (let y = -h; y <= h; y++) px(x, y, Math.abs(x) > 4 || Math.abs(y) === h ? '#2c302e' : '#454c48')
  }
  if (a < 0.5) return
  // радужка и зрачок смотрят туда, где палец или курсор; веки обрезают радужку
  const dx = Math.max(-3, Math.min(3, Math.round((lookX - e.x) / 100)))
  const dy = Math.max(-1, Math.min(1, Math.round((lookY - e.y) / 160)))
  for (let x = -2; x <= 2; x++)
    for (let y = -2; y <= 2; y++) {
      const ix = dx + x
      const iy = dy + y
      if (Math.abs(x) + Math.abs(y) > 3 || Math.abs(iy) > lid(ix)) continue
      px(ix, iy, Math.abs(x) === 2 || Math.abs(y) === 2 ? '#14302c' : '#2f8478')
    }
  px(dx, dy, '#050507')
  if (Math.abs(dy - 1) <= lid(dx - 1)) px(dx - 1, dy - 1, '#9fd8cf')
}

/** Фон «Нити»: тьма, пыль, глаза, которые открываются и следят, редкие помехи. */
export function Haunt() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const d = canvas?.getContext('2d')
    if (!canvas || !d) return
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    let w = 0
    let h = 0
    let eyes: Eye[] = []
    let motes: Mote[] = []
    let look = { x: 0, y: 0 }
    let glitchUntil = 0
    let nextGlitch = performance.now() + rand(6000, 14000)

    const resize = () => {
      w = Math.ceil(window.innerWidth / PX)
      h = Math.ceil(window.innerHeight / PX)
      canvas.width = w
      canvas.height = h
      look = { x: w / 2, y: h / 2 }
      motes = Array.from({ length: Math.round((w * h) / 900) }, () => ({ x: rand(0, w), y: rand(0, h), vx: rand(-0.15, 0.15), vy: rand(-0.25, -0.05), a: rand(0.08, 0.35) }))
    }
    resize()

    const spawn = (t: number) => {
      const k = Math.random() < 0.12 ? 2 : 1
      const life = rand(4000, 9000)
      eyes.push({ x: rand(8, w - 8), y: rand(8, h - 8), k, born: t + rand(0, 1500), life, blinkAt: t + rand(1500, life) })
    }

    const onMove = (e: PointerEvent) => {
      look = { x: e.clientX / PX, y: e.clientY / PX }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', onMove)
    window.addEventListener('resize', resize)

    let raf = 0
    let last = 0
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame)
      if (t - last < 1000 / FPS) return
      last = t
      d.clearRect(0, 0, w, h)
      // пыль
      for (const m of motes) {
        if (!still) {
          m.x = (m.x + m.vx + w) % w
          m.y = (m.y + m.vy + h) % h
        }
        d.fillStyle = `rgba(217, 210, 195, ${m.a})`
        d.fillRect(Math.round(m.x), Math.round(m.y), 1, 1)
      }
      if (still) return
      // глаза
      eyes = eyes.filter((e) => t - e.born < e.life)
      const max = Math.max(2, Math.round((w * h) / 9000))
      if (eyes.length < max && Math.random() < 0.04) spawn(t)
      // глаза едва проступают из темноты
      d.globalAlpha = 0.75
      for (const e of eyes) drawEye(d, e, openness(e, t), look.x, look.y)
      d.globalAlpha = 1
      // помеха: полоса сдвигается и шумит
      if (t > nextGlitch) {
        glitchUntil = t + rand(120, 260)
        nextGlitch = t + rand(7000, 16000)
      }
      if (t < glitchUntil) {
        const y = Math.floor(rand(0, h - 6))
        const bh = Math.floor(rand(2, 6))
        const shift = Math.floor(rand(-6, 6))
        const band = d.getImageData(0, y, w, bh)
        d.putImageData(band, shift, y)
        for (let i = 0; i < w / 3; i++) {
          d.fillStyle = Math.random() < 0.5 ? 'rgba(181,84,60,0.35)' : 'rgba(63,179,163,0.25)'
          d.fillRect(Math.floor(rand(0, w)), y + Math.floor(rand(0, bh)), Math.floor(rand(1, 6)), 1)
        }
      }
    }
    raf = requestAnimationFrame(frame)
    const onVis = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) raf = requestAnimationFrame(frame)
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return <canvas ref={ref} className="haunt" aria-hidden="true" />
}
