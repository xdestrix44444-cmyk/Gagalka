import { useEffect, useRef } from 'react'
import { drawCardBack, drawCardFace } from './sprites'

interface Props {
  /** Номер аркана 0–21; null показывает рубашку. */
  id: number | null
  label: string
  /** Повреждённая версия карты. */
  corrupt?: boolean
  onClick?: () => void
}

export function PixelCard({ id, label, corrupt = false, onClick }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    if (id === null) drawCardBack(canvas)
    else drawCardFace(canvas, id, corrupt)
  }, [id, corrupt])

  const canvas = <canvas ref={ref} className={id === null ? 'pcard back' : corrupt ? 'pcard face corrupt' : 'pcard face'} aria-hidden="true" />
  if (!onClick) return <div className="pcard-wrap" role="img" aria-label={label}>{canvas}</div>
  return (
    <button type="button" className="pcard-wrap" onClick={onClick} aria-label={label}>
      {canvas}
    </button>
  )
}
