import { useEffect, useMemo, useRef, useState } from 'react'
import { DECK, integrityState } from './deck'
import { PixelCard } from './PixelCard'
import { ReadingText } from './Reading'
import { play } from './sound'
import { SPREADS } from './spreads'
import { OUTCOMES, entryIntegrity, loadHistory, updateHistoryEntry, type HistoryEntry, type Outcome } from './storage'
import { ScreenHead } from './ui/ScreenHead'
import { ShareReading } from './ui/ShareReading'

const fmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
const kindName = (h: HistoryEntry) => (h.kind === 'day' ? 'карта дня' : SPREADS[h.kind].name)
const positionsOf = (h: HistoryEntry) => (h.kind === 'day' ? ['Карта дня'] : SPREADS[h.kind].positions.map((p) => p.name))

/** Дневник: список сеансов; запись открывается целиком — карты, толкование, заметка и итог. */
export function Diary({ onBack }: { onBack: () => void }) {
  const [history, setHistory] = useState(loadHistory)
  const [openId, setOpenId] = useState<string | null>(null)
  const open = history.find((h) => h.id === openId)

  if (open)
    return (
      <DiaryEntry
        entry={open}
        onBack={() => {
          setHistory(loadHistory())
          setOpenId(null)
        }}
      />
    )

  return (
    <section className="screen">
      <ScreenHead title="Дневник" onBack={onBack} />
      {history.length === 0 ? (
        <p className="lede">Здесь появятся ваши сеансы. Откройте карту дня или сделайте первый расклад.</p>
      ) : (
        <ul className="diary">
          {history.map((h) => {
            const outcome = OUTCOMES.find((o) => o.key === h.outcome)
            return (
              <li key={h.id}>
                <button
                  type="button"
                  className="diary-row"
                  onClick={() => {
                    play('tap')
                    setOpenId(h.id)
                  }}
                >
                  <span className="when">
                    [{fmt.format(h.at)}] <span className="kind">{kindName(h)}</span>
                    {outcome && <span className={`mark ${outcome.key}`}> {outcome.mark} {outcome.name}</span>}
                    {h.note && <span className="mark note"> ✎</span>}
                  </span>
                  {h.question && <span className="q">«{h.question}»</span>}
                  <span className="names">
                    {h.cards.map((id, i) => {
                      const v = entryIntegrity(h, i)
                      const state = v === null ? 'whole' : integrityState(v)
                      return (
                        <span key={i} className={state}>
                          {i > 0 && ', '}
                          {DECK[id].name}
                          {v !== null && <span className="pct"> {v}%{state === 'damaged' && ' ↓'}</span>}
                        </span>
                      )
                    })}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function DiaryEntry({ entry, onBack }: { entry: HistoryEntry; onBack: () => void }) {
  const [note, setNote] = useState(entry.note ?? '')
  const [outcome, setOutcome] = useState<Outcome | undefined>(entry.outcome)
  const positions = positionsOf(entry)
  const cards = useMemo(() => entry.cards.map((id, i) => ({ id, integrity: entryIntegrity(entry, i) ?? 95, label: positions[i] })), [entry])

  // заметка сохраняется сама: через полсекунды после правки и при уходе с экрана
  const latest = useRef(note)
  latest.current = note
  const saveNote = () => updateHistoryEntry(entry.id, { note: latest.current.trim() || undefined })
  useEffect(() => {
    if (note === (entry.note ?? '')) return
    const t = setTimeout(saveNote, 500)
    return () => clearTimeout(t)
  }, [note])
  useEffect(() => () => void (latest.current !== (entry.note ?? '') && saveNote()), [])

  const pickOutcome = (o: Outcome) => {
    play('tap')
    const next = outcome === o ? undefined : o
    setOutcome(next)
    updateHistoryEntry(entry.id, { outcome: next })
  }

  return (
    <section className="screen">
      <ScreenHead title={kindName(entry).replace(/^./, (c) => c.toUpperCase())} onBack={onBack} />
      <p className="lede">{fmt.format(entry.at)}</p>
      {entry.question && <p className="asked">«{entry.question}»</p>}
      <div className={`diary-cards n${Math.min(cards.length, 5)}`}>
        {cards.map((c, i) => (
          <figure key={i} className="slot">
            <PixelCard id={c.id} integrity={c.integrity} label={`${c.label}: ${DECK[c.id].name}`} />
            <figcaption>
              <span className="pos">{entry.kind === 'celtic' ? i + 1 : c.label}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <article className="reading summary">
        <h2>&gt; толкование</h2>
        {entry.ai ? (
          <div className="ai-text">
            {entry.ai
              .split(/\n\s*\n/)
              .filter((p) => p.trim())
              .map((p, i) => (
                <p key={i} className="text">
                  {p.trim()}
                </p>
              ))}
          </div>
        ) : (
          cards.map((c, i) => <ReadingText key={i} card={DECK[c.id]} integrity={c.integrity} label={cards.length > 1 ? c.label : undefined} />)
        )}
      </article>
      <article className="reading diary-own">
        <h2>&gt; как отозвалось</h2>
        <div className="seg-row" role="group" aria-label="Как отозвалось">
          {OUTCOMES.map((o) => (
            <button key={o.key} type="button" aria-pressed={outcome === o.key} onClick={() => pickOutcome(o.key)}>
              {o.mark} {o.name}
            </button>
          ))}
        </div>
        <label className="question">
          <span>
            <span className="prompt">&gt;</span> заметка
          </span>
          <textarea value={note} rows={3} maxLength={1000} placeholder="Что происходило, что почувствовали, что решили" onChange={(e) => setNote(e.target.value)} />
        </label>
      </article>
      <div className="actions">
        <ShareReading title={kindName(entry)} cards={cards} question={entry.question} />
      </div>
    </section>
  )
}
