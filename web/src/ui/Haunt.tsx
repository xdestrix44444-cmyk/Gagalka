import { useEffect, useRef } from 'react'
import { SETTINGS_EVENT, loadSettings } from '../settings'
import { play } from '../sound'

/** Логический пиксель фона в CSS-пикселях: фон рисуется крупными пикселями, как карты. */
const PX = 3
const FPS = 12

interface Mote {
  x: number
  y: number
  vx: number
  vy: number
  a: number
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)

/** Виды сбоя экрана: полоса фона рвётся, весь экран дёргается с расслоением цвета, по экрану проходят полосы помех. */
type Glitch = 'tear' | 'split' | 'bars'
const GLITCHES: Glitch[] = ['tear', 'split', 'bars']

/** Фон «Нити»: тьма, пыль и сбои экрана с тихой помехой в звуке. */
export function Haunt() {
  const ref = useRef<HTMLCanvasElement>(null)
  const barsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const d = canvas?.getContext('2d')
    if (!canvas || !d) return
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    let w = 0
    let h = 0
    let motes: Mote[] = []
    // мягкий режим: только пыль, без сбоев
    let soft = loadSettings().soft
    const onSettings = () => {
      soft = loadSettings().soft
    }
    window.addEventListener(SETTINGS_EVENT, onSettings)
    // сбой раз в несколько секунд — примерно так же часто, как раньше открывались глаза
    let glitch: Glitch = 'tear'
    let glitchUntil = 0
    let nextGlitch = performance.now() + rand(3000, 6000)
    const root = document.documentElement
    const bars = barsRef.current

    const resize = () => {
      w = Math.ceil(window.innerWidth / PX)
      h = Math.ceil(window.innerHeight / PX)
      canvas.width = w
      canvas.height = h
      motes = Array.from({ length: Math.round((w * h) / 900) }, () => ({ x: rand(0, w), y: rand(0, h), vx: rand(-0.15, 0.15), vy: rand(-0.25, -0.05), a: rand(0.08, 0.35) }))
    }
    resize()

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
      if (still || soft) return
      if (t > nextGlitch) {
        glitch = GLITCHES[Math.floor(Math.random() * GLITCHES.length)]
        glitchUntil = t + rand(120, 320)
        nextGlitch = t + rand(3500, 8000)
        play('interference')
        if (glitch === 'split') root.classList.add('glitch-split')
        if (glitch === 'bars' && bars) {
          // две-четыре полосы помех в случайных местах экрана
          bars.innerHTML = Array.from({ length: 2 + Math.floor(Math.random() * 3) }, () => `<i style="top:${rand(5, 92).toFixed(1)}%;height:${Math.round(rand(2, 14))}px;--dx:${Math.round(rand(-14, 14))}px"></i>`).join('')
          bars.hidden = false
        }
      }
      if (t >= glitchUntil) {
        root.classList.remove('glitch-split')
        if (bars && !bars.hidden) bars.hidden = true
        return
      }
      if (glitch === 'tear') {
        // полоса фона сдвигается и шумит
        const y = Math.floor(rand(0, h - 6))
        const bh = Math.floor(rand(2, 8))
        const shift = Math.floor(rand(-8, 8))
        const band = d.getImageData(0, y, w, bh)
        d.putImageData(band, shift, y)
        for (let i = 0; i < w / 2; i++) {
          d.fillStyle = Math.random() < 0.5 ? 'rgba(181,84,60,0.45)' : 'rgba(63,179,163,0.35)'
          d.fillRect(Math.floor(rand(0, w)), y + Math.floor(rand(0, bh)), Math.floor(rand(1, 8)), 1)
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
      window.removeEventListener('resize', resize)
      window.removeEventListener(SETTINGS_EVENT, onSettings)
      document.removeEventListener('visibilitychange', onVis)
      root.classList.remove('glitch-split')
    }
  }, [])

  return (
    <>
      <canvas ref={ref} className="haunt" aria-hidden="true" />
      <div ref={barsRef} className="glitch-bars" aria-hidden="true" hidden />
    </>
  )
}
