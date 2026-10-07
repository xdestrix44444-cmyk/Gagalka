import { useEffect, useState } from 'react'
import { clearAllData, loadSettings, saveSettings } from '../settings'
import { SOUND_EVENT, play, setSound, soundEnabled } from '../sound'
import { ScreenHead } from './ScreenHead'

/** Настройки: звук и громкость, мягкий режим, вступление, удаление данных. */
export function SettingsScreen({ onBack, onShowIntro }: { onBack: () => void; onShowIntro: () => void }) {
  const [s, setS] = useState(loadSettings)
  const [sound, setSoundState] = useState(soundEnabled)
  // удаление в два касания: первое спрашивает, второе удаляет
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    const sync = () => setSoundState(soundEnabled())
    window.addEventListener(SOUND_EVENT, sync)
    return () => window.removeEventListener(SOUND_EVENT, sync)
  }, [])

  return (
    <section className="screen">
      <ScreenHead title="Настройки" onBack={onBack} />

      <article className="reading settings-block">
        <h2>&gt; звук</h2>
        <div className="seg-row" role="group" aria-label="Звук">
          <button type="button" aria-pressed={sound} onClick={() => (setSound(true), setTimeout(() => play('boot'), 0))}>
            включён
          </button>
          <button type="button" aria-pressed={!sound} onClick={() => setSound(false)}>
            выключен
          </button>
        </div>
        <label className="range">
          <span>громкость · {Math.round(s.volume * 100)}%</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(s.volume * 100)}
            disabled={!sound}
            onChange={(e) => setS(saveSettings({ volume: Number(e.target.value) / 100 }))}
            onPointerUp={() => play('tap')}
          />
        </label>
      </article>

      <article className="reading settings-block">
        <h2>&gt; мягкий режим</h2>
        <p className="hint-small">Без мерцания экрана, сбоев на картах, глаз на фоне и резких звуков. Карты, толкования и целостность остаются.</p>
        <div className="seg-row" role="group" aria-label="Мягкий режим">
          <button type="button" aria-pressed={!s.soft} onClick={() => setS(saveSettings({ soft: false }))}>
            как задумано
          </button>
          <button type="button" aria-pressed={s.soft} onClick={() => setS(saveSettings({ soft: true }))}>
            мягко
          </button>
        </div>
      </article>

      <article className="reading settings-block">
        <h2>&gt; справка</h2>
        <button type="button" className="btn wide" onClick={onShowIntro}>
          Показать вступление
        </button>
      </article>

      <article className="reading settings-block danger">
        <h2>&gt; данные</h2>
        <p className="hint-small">Дневник, люди, карта дня и настройки хранятся только на этом устройстве.</p>
        {confirm ? (
          <div className="actions">
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                clearAllData()
                window.location.reload()
              }}
            >
              Удалить всё
            </button>
            <button type="button" className="btn" onClick={() => setConfirm(false)}>
              Отмена
            </button>
          </div>
        ) : (
          <button type="button" className="link-danger" onClick={() => setConfirm(true)}>
            удалить все данные
          </button>
        )}
      </article>
    </section>
  )
}
