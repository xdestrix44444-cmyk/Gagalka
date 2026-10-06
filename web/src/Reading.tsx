import { useEffect, useState, type ReactNode } from 'react'
import { INTEGRITY_LABEL, readingOf, type Arcana } from './deck'

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

interface Props {
  card: Arcana
  position?: string
  /** Целостность, с которой выпала карта. */
  integrity: number
  /** Пауза до первой строки лога, мс (пока карта переворачивается). */
  delay?: number
  /** Тело толкования после лога. По умолчанию временный текст колоды; null — только лог и имя. */
  body?: ReactNode
}

/** Толкование в виде терминального лога: строки появляются по одной, затем имя карты и текст. */
export function Reading({ card, position, integrity, delay = 0, body }: Props) {
  const r = readingOf(card, integrity)
  const state = r.state
  const lines = [
    `загрузка ${card.file}${position ? ` · ${position.toLowerCase()}` : ''}`,
    `целостность ${integrity}%`,
    ...(r.reversed ? ['карта легла перевёрнутой: читаю тень'] : []),
    r.log[0],
    r.log[1],
  ]
  const total = lines.length + 1
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? total : 0))

  useEffect(() => {
    if (shown >= total) return
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? Math.max(delay, 220) : 220)
    return () => clearTimeout(t)
  }, [shown, total, delay])

  return (
    <article className={`reading ${state}`} aria-label={`${position ? position + ': ' : ''}${card.name}${r.reversed ? ', перевёрнута' : ''}`}>
      <div className="log" aria-hidden="true">
        {lines.slice(0, shown).map((line, i) => (
          <p key={i} className={i === 1 ? `state ${state}` : undefined}>
            <span className="prompt">&gt;</span> {line}
            {i === 1 && <b> [{INTEGRITY_LABEL[state]}]</b>}
          </p>
        ))}
        {shown < total && <p className="caret"><span className="prompt">&gt;</span> <span className="blink">_</span></p>}
      </div>
      {shown >= total && (
        <div className="reveal">
          <h2>
            {card.numeral} · {card.name}
            {r.reversed && <span className="rev"> · перевёрнута</span>}
          </h2>
          {body === undefined ? <ReadingText card={card} integrity={integrity} /> : body}
        </div>
      )}
    </article>
  )
}

/** Временный текст колоды по целостности: прямое значение, помеха или тень. */
export function ReadingText({ card, integrity, label }: { card: Arcana; integrity: number; label?: string }) {
  const r = readingOf(card, integrity)
  return (
    <>
      <p className="text">
        {label && <b>{label}. </b>}
        {r.text}
      </p>
      {r.noise && <p className="text noise">{r.noise}</p>}
    </>
  )
}
