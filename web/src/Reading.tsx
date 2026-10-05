import { useEffect, useState, type ReactNode } from 'react'
import { INTEGRITY_LABEL, integrityState, variantOf, type Arcana } from './deck'

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

interface Props {
  card: Arcana
  position?: string
  corrupt?: boolean
  /** Пауза до первой строки лога, мс (пока карта переворачивается). */
  delay?: number
  /** Тело толкования после лога. По умолчанию временный текст колоды; null — только лог и имя. */
  body?: ReactNode
}

/** Толкование в виде терминального лога: строки появляются по одной, затем имя карты и текст. */
export function Reading({ card: base, position, corrupt = false, delay = 0, body }: Props) {
  const card = variantOf(base, corrupt)
  const state = integrityState(card.integrity)
  const lines = [
    `загрузка ${card.file}${position ? ` · ${position.toLowerCase()}` : ''}`,
    `целостность ${card.integrity}%`,
    card.log[0],
    card.log[1],
  ]
  const total = lines.length + 1
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? total : 0))

  useEffect(() => {
    if (shown >= total) return
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? Math.max(delay, 220) : 220)
    return () => clearTimeout(t)
  }, [shown, total, delay])

  return (
    <article className={corrupt ? 'reading corrupt' : 'reading'} aria-label={`${position ? position + ': ' : ''}${card.name}`}>
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
          </h2>
          {body === undefined ? <p className="text">{card.text}</p> : body}
        </div>
      )}
    </article>
  )
}
