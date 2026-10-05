import { useEffect, useState } from 'react'
import backImg from '../art/img/back.jpg'
import { ACTIVE_DECK, DECK } from '../deck'
import { play, resumeSound } from '../sound'

const KEY = 'nit.booted'
const LINE_MS = 230
const EYE_MS = 1100

const LINES = [
  'НИТЬ · терминал нейро-таро v0.13',
  `загрузка колоды ........ ${DECK.length} карт`,
  `доступно для чтения .... ${ACTIVE_DECK.length}`,
  'проверка целостности ... ERR 0x10',
  'канал связи ............ открыт',
]

/** Показывать заставку раз за сеанс (новая вкладка или новый запуск в Telegram). */
export function shouldBoot(): boolean {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  try {
    return sessionStorage.getItem(KEY) !== '1'
  } catch {
    return true
  }
}

/** Экран входа: загрузочный лог, затем открывается глаз. Касание пропускает. */
export function Boot({ onDone }: { onDone: () => void }) {
  const [shown, setShown] = useState(0)
  const [leaving, setLeaving] = useState(false)

  const finish = () => {
    try {
      sessionStorage.setItem(KEY, '1')
    } catch {
      // без сохранения
    }
    setLeaving(true)
    setTimeout(onDone, 380)
  }

  useEffect(() => {
    play('boot')
  }, [])

  useEffect(() => {
    if (shown < LINES.length) {
      const t = setTimeout(() => {
        play('type')
        setShown((n) => n + 1)
      }, LINE_MS)
      return () => clearTimeout(t)
    }
    // лог допечатан: глаз с рубашки открывается (анимация .boot-eye.open в styles.css)
    const t = setTimeout(finish, EYE_MS + 200)
    return () => clearTimeout(t)
    // finish стабилен по смыслу: вызывается один раз
  }, [shown])

  return (
    <div
      className={leaving ? 'boot leaving' : 'boot'}
      role="presentation"
      onClick={() => {
        resumeSound()
        finish()
      }}
    >
      <div className="boot-log" aria-hidden="true">
        {LINES.slice(0, shown).map((l, i) => (
          <p key={i} className={l.includes('ERR') ? 'err' : undefined}>
            <span className="prompt">&gt;</span> {l}
          </p>
        ))}
        {shown < LINES.length && <p><span className="prompt">&gt;</span> <span className="blink">_</span></p>}
      </div>
      <div className={shown >= LINES.length ? 'boot-eye open' : 'boot-eye'} style={{ backgroundImage: `url(${backImg})` }} aria-hidden="true" />
      <p className="boot-skip">коснитесь, чтобы войти</p>
    </div>
  )
}
