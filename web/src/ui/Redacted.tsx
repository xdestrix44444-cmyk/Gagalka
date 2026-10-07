import { useEffect, useMemo, useState } from 'react'
import { loadSettings } from '../settings'
import { play } from '../sound'

// Вымаранный текст: под блоками ████ лежат настоящие буквы. Изредка одна-две из них
// просвечивают на мгновение; часть может быть открыта насовсем (opened — сколько букв).

/** Порядок, в котором открываются буквы: перемешан, но одинаков при каждом запуске. */
function revealOrder(n: number, seed: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i)
  let s = seed
  for (let i = n - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0
    const j = s % (i + 1)
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

export function Redacted({ text, opened = 0, seed = 7 }: { text: string; opened?: number; seed?: number }) {
  const open = useMemo(() => new Set(revealOrder(text.length, seed).slice(0, opened)), [text, opened, seed])
  const [flash, setFlash] = useState<number[]>([])

  useEffect(() => {
    // в мягком режиме буквы не просвечивают
    if (reducedMotion() || loadSettings().soft) return
    let t: ReturnType<typeof setTimeout>
    const tick = () => {
      // раз в 4–12 секунд просвечивают одна-две случайные буквы: глитч, потом подвисание
      t = setTimeout(() => {
        const k = 1 + Math.floor(Math.random() * 2)
        setFlash(Array.from({ length: k }, () => Math.floor(Math.random() * text.length)))
        play('glitch')
        t = setTimeout(() => {
          setFlash([])
          play('lag')
          tick()
        }, 160)
      }, 4000 + Math.random() * 8000)
    }
    tick()
    return () => clearTimeout(t)
  }, [text])

  return (
    <span className="rd" aria-label="данные скрыты">
      {[...text].map((ch, i) =>
        open.has(i) ? (
          <span key={i} className="rd-open">
            {ch}
          </span>
        ) : flash.includes(i) ? (
          <span key={i} className="rd-flash">
            {ch === ' ' ? '_' : ch}
          </span>
        ) : (
          <span key={i} aria-hidden="true">
            █
          </span>
        ),
      )}
    </span>
  )
}
