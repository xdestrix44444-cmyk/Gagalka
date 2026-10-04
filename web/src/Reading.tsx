import { useEffect, useState } from 'react'
import { INTEGRITY_LABEL, integrityState, variantOf, type Arcana } from './deck'

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Толкование в виде терминального лога: строки появляются по одной. */
export function Reading({ card: base, position, corrupt = false }: { card: Arcana; position?: string; corrupt?: boolean }) {
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
    const t = setTimeout(() => setShown((n) => n + 1), 220)
    return () => clearTimeout(t)
  }, [shown, total])

  return (
    <article className={corrupt ? 'reading corrupt' : 'reading'} aria-label={`${position ? position + ': ' : ''}${card.name}`}>
      <div className="log" aria-hidden="true">
        {lines.slice(0, shown).map((line, i) => (
          <p key={i} className={i === 1 ? `state ${state}` : undefined}>
            <span className="prompt">&gt;</span> {line}
            {i === 1 && <b> [{INTEGRITY_LABEL[state]}]</b>}
          </p>
        ))}
      </div>
      {shown >= total && (
        <>
          <h2>
            {card.numeral} · {card.name}
          </h2>
          <p className="text">{card.text}</p>
        </>
      )}
    </article>
  )
}
