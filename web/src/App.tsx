import { useMemo, useState } from 'react'
import { DECK } from './deck'
import { THREE_CARD_POSITIONS, dayKey, drawCards } from './draw'
import { PixelCard } from './PixelCard'
import { loadDayCard, loadHistory, saveDayCard, saveHistoryEntry } from './storage'
import { haptic, initTelegram } from './telegram'

type Screen = 'home' | 'spread' | 'diary'

const tg = initTelegram()

export function App() {
  const [screen, setScreen] = useState<Screen>('home')
  return (
    <main className="app">
      <header className="top">
        <button type="button" className="brand" onClick={() => setScreen('home')}>
          НИТЬ
        </button>
        <span className="tagline">нейро-таро</span>
      </header>
      {screen === 'home' && <Home onSpread={() => setScreen('spread')} onDiary={() => setScreen('diary')} />}
      {screen === 'spread' && <Spread onBack={() => setScreen('home')} />}
      {screen === 'diary' && <Diary onBack={() => setScreen('home')} />}
      <p className="disclaimer">
        Толкования носят рефлексивный и развлекательный характер и не заменяют советы врача, юриста или психолога.
      </p>
    </main>
  )
}

function Home({ onSpread, onDiary }: { onSpread: () => void; onDiary: () => void }) {
  const today = useMemo(() => dayKey(), [])
  const [cardId, setCardId] = useState<number | null>(() => loadDayCard(today))

  const reveal = () => {
    if (cardId !== null) return
    haptic()
    const [card] = drawCards(1)
    saveDayCard(today, card.id)
    saveHistoryEntry({ kind: 'day', cards: [card.id] })
    setCardId(card.id)
  }

  const card = cardId === null ? null : DECK[cardId]
  return (
    <section className="screen">
      <h1>{tg.firstName ? `Привет, ${tg.firstName}` : 'Привет'}</h1>
      <p className="lede">Карта дня. Подумайте о том, что сегодня для вас важно, и откройте карту.</p>
      <div className="stage single">
        <PixelCard id={cardId} label={card ? `Карта дня: ${card.name}` : 'Карта дня, рубашка. Нажмите, чтобы открыть'} onClick={card ? undefined : reveal} />
        {card && (
          <div className="reading" aria-live="polite">
            <h2>
              {card.numeral} · {card.name}
            </h2>
            <p>{card.meaning}</p>
          </div>
        )}
        {!card && <p className="hint">Нажмите на карту</p>}
      </div>
      <div className="actions">
        <button type="button" className="btn primary" onClick={onSpread}>
          Расклад на три карты
        </button>
        <button type="button" className="btn" onClick={onDiary}>
          Дневник
        </button>
      </div>
    </section>
  )
}

function Spread({ onBack }: { onBack: () => void }) {
  const [cards, setCards] = useState(() => drawCards(3))
  const [open, setOpen] = useState<boolean[]>([false, false, false])
  const allOpen = open.every(Boolean)

  const flip = (i: number) => {
    if (open[i]) return
    haptic()
    const next = open.map((v, k) => (k === i ? true : v))
    setOpen(next)
    if (next.every(Boolean)) saveHistoryEntry({ kind: 'three', cards: cards.map((c) => c.id) })
  }

  const again = () => {
    setCards(drawCards(3))
    setOpen([false, false, false])
  }

  return (
    <section className="screen">
      <h1>Три карты</h1>
      <p className="lede">Сформулируйте вопрос про себя и открывайте карты по порядку.</p>
      <div className="stage three">
        {cards.map((c, i) => (
          <figure key={`${c.id}-${i}`} className="slot">
            <PixelCard
              id={open[i] ? c.id : null}
              label={open[i] ? `${THREE_CARD_POSITIONS[i]}: ${c.name}` : `${THREE_CARD_POSITIONS[i]}, рубашка. Нажмите, чтобы открыть`}
              onClick={open[i] ? undefined : () => flip(i)}
            />
            <figcaption>
              <span className="pos">{THREE_CARD_POSITIONS[i]}</span>
              {open[i] && <span className="nm">{c.name}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="readings" aria-live="polite">
        {cards.map(
          (c, i) =>
            open[i] && (
              <article key={`${c.id}-${i}`} className="reading">
                <h2>
                  {THREE_CARD_POSITIONS[i]} · {c.name}
                </h2>
                <p>{c.meaning}</p>
              </article>
            ),
        )}
      </div>
      <div className="actions">
        {allOpen && (
          <button type="button" className="btn primary" onClick={again}>
            Новый расклад
          </button>
        )}
        <button type="button" className="btn" onClick={onBack}>
          Назад
        </button>
      </div>
    </section>
  )
}

function Diary({ onBack }: { onBack: () => void }) {
  const history = useMemo(() => loadHistory(), [])
  const fmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
  return (
    <section className="screen">
      <h1>Дневник</h1>
      {history.length === 0 ? (
        <p className="lede">Здесь появятся ваши расклады. Откройте карту дня или сделайте первый расклад.</p>
      ) : (
        <ul className="diary">
          {history.map((h) => (
            <li key={h.id}>
              <span className="when">{fmt.format(h.at)}</span>
              <span className="kind">{h.kind === 'day' ? 'Карта дня' : 'Три карты'}</span>
              <span className="names">{h.cards.map((id) => DECK[id].name).join(', ')}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="actions">
        <button type="button" className="btn" onClick={onBack}>
          Назад
        </button>
      </div>
    </section>
  )
}
