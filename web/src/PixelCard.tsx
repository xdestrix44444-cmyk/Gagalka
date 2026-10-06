import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { integrityState } from './deck'
import { play } from './sound'
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

  // открытую карту можно рассмотреть крупно
  const [zoom, setZoom] = useState(false)
  const zoomable = !onClick && id !== null
  // карта то кнопка, то просто картинка (в раскладе нажать можно только следующую):
  // при смене обёртки холсты создаются заново, и их надо перерисовать
  const clickable = !!onClick || zoomable

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
  if (!clickable) return <div className="pcard-wrap" role="img" aria-label={label}>{card}</div>
  return (
    <>
      <button
        type="button"
        className={zoomable ? 'pcard-wrap zoomable' : 'pcard-wrap'}
        onClick={
          onClick ??
          (() => {
            play('tap')
            setZoom(true)
          })
        }
        aria-label={zoomable ? `${label}. Рассмотреть крупно` : label}
      >
        {card}
      </button>
      {zoom && id !== null && <CardZoom id={id} integrity={integrity} label={label} onClose={() => setZoom(false)} />}
    </>
  )
}

/** Карта на весь экран: рисунок в полном разрешении, с теми же повреждениями и переворотом. */
function CardZoom({ id, integrity, label, onClose }: { id: number; integrity: number; label: string; onClose: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (ref.current) drawCardFace(ref.current, id, integrity)
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [id, integrity])

  const reversed = integrityState(integrity) === 'damaged'
  return createPortal(
    <div className="zoom" role="dialog" aria-modal="true" aria-label={label}>
      <button ref={closeRef} type="button" className="zoom-close" onClick={onClose} aria-label="Закрыть">
        <canvas ref={ref} className={reversed ? 'zoom-card rev' : 'zoom-card'} aria-hidden="true" />
        <span className="zoom-hint">коснитесь, чтобы закрыть</span>
      </button>
    </div>,
    document.body,
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
