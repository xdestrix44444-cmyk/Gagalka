import { useEffect, useRef, useState } from 'react'
import { integrityState } from './deck'
import { drawCardBack, drawCardFace } from './sprites'

/** Длительность переворота, мс; совпадает с .pcard-inner в styles.css. */
export const FLIP_MS = 640

interface Props {
  /** Номер карты 0–77; null показывает рубашку. */
  id: number | null
  label: string
  /** Целостность, с которой выпала карта: ломает картинку, а ниже 60% карта ложится вверх ногами. */
  integrity?: number
  /** Переворачивать, даже если карта появилась уже открытой (например, сразу после тасования). */
  animate?: boolean
  onClick?: () => void
}

/**
 * Карта с двумя сторонами. Переход рубашка → лицо анимируется переворотом;
 * карта, которая уже была открыта при появлении на экране, показывается сразу.
 */
export function PixelCard({ id, label, integrity = 100, animate = false, onClick }: Props) {
  const backRef = useRef<HTMLCanvasElement>(null)
  const faceRef = useRef<HTMLCanvasElement>(null)
  // открыта ли карта с самого начала: тогда без анимации
  const [instant] = useState(id !== null && !animate)

  // карта то кнопка, то просто картинка (в раскладе нажать можно только следующую):
  // при смене обёртки холсты создаются заново, и их надо перерисовать
  const clickable = !!onClick

  useEffect(() => {
    if (backRef.current) drawCardBack(backRef.current)
  }, [clickable])

  useEffect(() => {
    if (faceRef.current && id !== null) drawCardFace(faceRef.current, id, integrity)
  }, [id, integrity, clickable])

  const state = integrityState(integrity)
  const cls = ['pcard-flip', id !== null && 'flipped', instant && 'instant', state !== 'whole' && state].filter(Boolean).join(' ')
  const card = (
    <div className={cls}>
      <div className="pcard-inner">
        <canvas ref={backRef} className="pcard side back" aria-hidden="true" />
        <canvas ref={faceRef} className="pcard side face" aria-hidden="true" />
      </div>
    </div>
  )
  if (!onClick) return <div className="pcard-wrap" role="img" aria-label={label}>{card}</div>
  return (
    <button type="button" className="pcard-wrap" onClick={onClick} aria-label={label}>
      {card}
    </button>
  )
}

/** Стопка из трёх рубашек, которая тасуется, пока выбирается карта. */
export function ShuffleDeck() {
  return (
    <div className="shuffle" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`shuffle-card s${i}`}>
          <PixelCard id={null} label="" />
        </div>
      ))}
    </div>
  )
}
