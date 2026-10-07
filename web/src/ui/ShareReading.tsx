import { useState } from 'react'
import { shareImage } from '../natal/share'
import { renderReadingShare, type ShareCard } from '../share-reading'
import { play } from '../sound'

/** Кнопка «Картинка для сторис»: рисует расклад и отдаёт его системному «Поделиться» или файлом. */
export function ShareReading({ title, cards, question }: { title: string; cards: ShareCard[]; question?: string }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  return (
    <>
      <button
        type="button"
        className="btn wide"
        disabled={busy}
        onClick={async () => {
          play('tap')
          setBusy(true)
          setFailed(false)
          try {
            await shareImage(await renderReadingShare(title, cards, question), 'nit-rasklad.png')
          } catch {
            setFailed(true)
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy ? 'Рисую…' : 'Картинка для сторис'}
      </button>
      {failed && <p className="form-error">&gt; Не получилось сохранить картинку. Попробуйте ещё раз.</p>}
    </>
  )
}
