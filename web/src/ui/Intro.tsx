import { useState } from 'react'
import { play } from '../sound'

const KEY = 'nit.intro.v1'

/** Показывали ли вступление на этом устройстве. */
export function introSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return true
  }
}

const STEPS: { title: string; lines: string[] }[] = [
  {
    title: 'модуль ТАРО',
    lines: ['Карта дня — одна запись в сутки.', 'Расклад — одна, три или десять карт. Вопрос можно не произносить.', 'Перевёрнутая карта — не ошибка.'],
  },
  {
    title: 'модуль НЕБО',
    lines: ['Натальная карта по дате, времени и месту рождения.', 'Касание планеты или дома показывает связи.', 'Совместимость — для двух людей.'],
  },
  {
    title: 'модуль ЧИСЛА',
    lines: ['Матрица судьбы — нужна только дата.', 'Свою карту можно отправить другу кодом.', 'Все сеансы — в дневнике. Данные хранятся только здесь.'],
  },
]

/** Вступление: три шага по модулям, в голосе программы. */
export function Intro({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const last = step === STEPS.length - 1
  const close = () => {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      // без сохранения: покажется ещё раз
    }
    onClose()
  }
  const s = STEPS[step]
  return (
    <div className="intro" role="dialog" aria-modal="true" aria-label="Справка">
      <article key={step} className="reading intro-card">
        <h2>
          &gt; {s.title}
          <span className="intro-count">
            {step + 1}/{STEPS.length}
          </span>
        </h2>
        <div className="log">
          {s.lines.map((l, i) => (
            <p key={i}>
              <span className="prompt">&gt;</span> {l}
            </p>
          ))}
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={close}>
            Пропустить
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              play('tap')
              if (last) close()
              else setStep(step + 1)
            }}
          >
            {last ? 'Понятно' : 'Далее'}
          </button>
        </div>
      </article>
    </div>
  )
}
