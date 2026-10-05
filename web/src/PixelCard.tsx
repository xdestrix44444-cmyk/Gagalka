import { useEffect, useRef, useState } from 'react'
import { drawCardBack, drawCardFace } from './sprites'

/** Длительность переворота, мс; совпадает с .pcard-inner в styles.css. */
export const FLIP_MS = 640

interface Props {
  /** Номер карты 0–77; null показывает рубашку. */
  id: number | null
  label: string
  /** Повреждённая версия карты. */
  corrupt?: boolean
  /** Переворачивать, даже если карта появилась уже открытой (например, сразу после тасования). */
  animate?: boolean
  onClick?: () => void
}

/**
 * Карта с двумя сторонами. Переход рубашка → лицо анимируется переворотом;
 * карта, которая уже была открыта при появлении на экране, показывается сразу.
 */
export function PixelCard({ id, label, corrupt = false, animate = false, onClick }: Props) {
  const backRef = useRef<HTMLCanvasElement>(null)
  const faceRef = useRef<HTMLCanvasElement>(null)
  // открыта ли карта с самого начала: тогда без анимации
  const [instant] = useState(id !== null && !animate)

  useEffect(() => {
    if (backRef.current) drawCardBack(backRef.current)
  }, [])

  useEffect(() => {
    if (faceRef.current && id !== null) drawCardFace(faceRef.current, id, corrupt)
  }, [id, corrupt])

  const cls = ['pcard-flip', id !== null && 'flipped', instant && 'instant', corrupt && 'corrupt'].filter(Boolean).join(' ')
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
