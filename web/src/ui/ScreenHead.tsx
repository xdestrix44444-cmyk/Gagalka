import { useEffect, useRef } from 'react'
import { play } from '../sound'
import { telegramBackButton as tgBack } from '../telegram'

// Внутри Telegram «назад» — системная кнопка в шапке Telegram, своя тогда не рисуется.

/** Шапка экрана: «назад» сверху слева и заголовок. Возврат всегда в одном месте, а не в конце длинной страницы. */
export function ScreenHead({ title, onBack }: { title: string; onBack?: () => void }) {
  // последний onBack в ref: обработчик Telegram не переподписывается на каждый рендер
  const back = useRef(onBack)
  back.current = onBack
  const hasBack = !!onBack

  useEffect(() => {
    const b = tgBack()
    if (!b || !hasBack) return
    const h = () => {
      play('back')
      back.current?.()
    }
    b.onClick(h)
    b.show()
    return () => {
      b.offClick(h)
      b.hide()
    }
  }, [hasBack])

  return (
    <header className="screen-head">
      {onBack && !tgBack() && (
        <button
          type="button"
          className="nav-back"
          onClick={() => {
            play('back')
            onBack()
          }}
        >
          <span aria-hidden="true">‹</span> назад
        </button>
      )}
      <h1 className="title">
        <span className="gem" aria-hidden="true" />
        {title}
        <span className="gem" aria-hidden="true" />
      </h1>
    </header>
  )
}
