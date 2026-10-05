import { useMemo, useState } from 'react'
import { play, setSound, soundEnabled } from '../sound'

/** Строка статуса сеанса: имя, номер сеанса, «связь» и переключатель звука. */
export function StatusBar({ onHome }: { onHome: () => void }) {
  const session = useMemo(() => `0x${Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0')}`, [])
  const [sound, setSoundState] = useState(soundEnabled)

  return (
    <header className="status">
      <button
        type="button"
        className="brand"
        onClick={() => {
          play('tap')
          onHome()
        }}
      >
        НИТЬ
      </button>
      <span className="status-mid" aria-hidden="true">
        <span className="sep">░</span> сеанс {session} <span className="sep">░</span> связь <span className="signal"><i /><i /><i /><i /></span>
      </span>
      <button
        type="button"
        className="sound"
        aria-pressed={sound}
        aria-label={sound ? 'Выключить звук' : 'Включить звук'}
        onClick={() => {
          setSound(!sound)
          setSoundState(!sound)
          if (!sound) setTimeout(() => play('tap'), 0)
        }}
      >
        ♪
      </button>
    </header>
  )
}
