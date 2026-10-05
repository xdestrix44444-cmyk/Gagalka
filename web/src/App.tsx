import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { CREEP_LABEL, CREEP_LEVELS, rollCorrupt, type CreepLevel } from './creep'
import { CORRUPT_TOTAL, DECK } from './deck'
import { THREE_CARD_POSITIONS, cryptoRng, dayKey, drawCards } from './draw'
import { FLIP_MS, PixelCard, ShuffleDeck } from './PixelCard'
import { Reading } from './Reading'
import { foundCorrupt, loadCreepLevel, loadDayCard, loadHistory, saveCreepLevel, saveDayCard, saveHistoryEntry } from './storage'
import { haptic, initTelegram } from './telegram'

type Screen = 'home' | 'spread' | 'diary'

/** Сколько тасуется колода перед картой дня, мс; совпадает с .shuffle в styles.css. */
const SHUFFLE_MS = 1100

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

const tg = initTelegram()

/** Бросает кубик «повреждённости» для карты; предыдущей считается последняя карта дневника. */
function rollFor(cardId: number, previousCardId: number | null): boolean {
  if (!DECK[cardId].corrupt) return false
  return rollCorrupt({ date: new Date(), previousCardId, cardId, level: loadCreepLevel() }, cryptoRng)
}

function lastCardId(): number | null {
  const last = loadHistory()[0]
  return last ? last.cards[last.cards.length - 1] : null
}

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
  const [day, setDay] = useState(() => loadDayCard(today))
  const [level, setLevel] = useState<CreepLevel>(loadCreepLevel)
  const cardId = day ? day.cardId : null
  // тасование перед картой дня; justRevealed — карту открыли сейчас, а не раньше сегодня
  const [shuffling, setShuffling] = useState(false)
  const [justRevealed, setJustRevealed] = useState(false)

  const reveal = () => {
    if (cardId !== null || shuffling) return
    haptic()
    if (prefersReducedMotion()) return pick()
    setShuffling(true)
    const pulses = [SHUFFLE_MS / 3, (SHUFFLE_MS * 2) / 3].map((t) => setTimeout(() => haptic(), t))
    setTimeout(() => {
      pulses.forEach(clearTimeout)
      setShuffling(false)
      pick()
    }, SHUFFLE_MS)
  }

  const pick = () => {
    const [card] = drawCards(1)
    const corrupt = rollFor(card.id, lastCardId())
    if (corrupt) haptic('error')
    const entry = { cardId: card.id, corrupt }
    saveDayCard(today, entry)
    saveHistoryEntry({ kind: 'day', cards: [card.id], corrupt: corrupt ? [card.id] : [] })
    setDay(entry)
    setJustRevealed(true)
  }

  const card = cardId === null ? null : DECK[cardId]
  return (
    <section className="screen">
      <h1>{tg.firstName ? `Привет, ${tg.firstName}` : 'Привет'}</h1>
      <p className="lede">Карта дня. Подумайте о том, что сегодня для вас важно, и откройте карту.</p>
      <div className="stage single">
        {shuffling ? (
          <ShuffleDeck />
        ) : (
          <PixelCard id={cardId} corrupt={day?.corrupt} animate={justRevealed} label={card ? `Карта дня: ${card.name}${day?.corrupt ? ' (повреждённая версия)' : ''}` : 'Карта дня, рубашка. Нажмите, чтобы открыть'} onClick={card ? undefined : reveal} />
        )}
        {card && <Reading card={card} corrupt={day?.corrupt} delay={justRevealed ? FLIP_MS : 0} />}
        {!card && <p className="hint">{shuffling ? 'Тасую колоду…' : 'Нажмите на карту'}</p>}
      </div>
      <div className="creep">
        <span id="creep-label">Жуть</span>
        <div className="seg" role="group" aria-labelledby="creep-label">
          {CREEP_LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={level === l}
              onClick={() => {
                setLevel(l)
                saveCreepLevel(l)
              }}
            >
              {CREEP_LABEL[l]}
            </button>
          ))}
        </div>
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
  const deal = () => {
    const drawn = drawCards(3)
    let prev = lastCardId()
    const flags = drawn.map((c) => {
      const f = rollFor(c.id, prev)
      prev = c.id
      return f
    })
    return { drawn, flags }
  }
  const [dealt, setDealt] = useState(deal)
  // номер раздачи: новые карты всегда заново вылетают из колоды
  const [round, setRound] = useState(0)
  const cards = dealt.drawn
  const flags = dealt.flags
  const [open, setOpen] = useState<boolean[]>([false, false, false])
  const allOpen = open.every(Boolean)

  const flip = (i: number) => {
    if (open[i]) return
    haptic()
    // функциональное обновление: быстрые нажатия подряд не теряют открытые карты
    setOpen((prev) => prev.map((v, k) => (k === i ? true : v)))
    if (flags[i]) haptic('error')
  }

  // расклад попадает в дневник, когда открыта последняя карта
  useEffect(() => {
    if (allOpen)
      saveHistoryEntry({ kind: 'three', cards: cards.map((c) => c.id), corrupt: cards.filter((_, k) => flags[k]).map((c) => c.id) })
  }, [allOpen])

  const again = () => {
    setDealt(deal())
    setRound((r) => r + 1)
    setOpen([false, false, false])
  }

  return (
    <section className="screen">
      <h1>Три карты</h1>
      <p className="lede">Сформулируйте вопрос про себя и открывайте карты по порядку.</p>
      <div className="stage three">
        {cards.map((c, i) => (
          <figure key={`${round}-${i}`} className="slot deal" style={{ '--i': i } as CSSProperties}>
            <PixelCard
              id={open[i] ? c.id : null}
              corrupt={flags[i]}
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
              <Reading key={`${round}-${i}`} card={c} corrupt={flags[i]} position={THREE_CARD_POSITIONS[i]} delay={FLIP_MS} />
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
  const found = useMemo(() => foundCorrupt(history), [history])
  const fmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
  return (
    <section className="screen">
      <h1>Дневник</h1>
      <p className="found">Найдено повреждённых: {found.size} из {CORRUPT_TOTAL}</p>
      {history.length === 0 ? (
        <p className="lede">Здесь появятся ваши расклады. Откройте карту дня или сделайте первый расклад.</p>
      ) : (
        <ul className="diary">
          {history.map((h) => (
            <li key={h.id}>
              <span className="when">{fmt.format(h.at)}</span>
              <span className="kind">{h.kind === 'day' ? 'Карта дня' : 'Три карты'}</span>
              <span className="names">
                {h.cards.map((id, i) => (
                  <span key={i} className={h.corrupt?.includes(id) ? 'bad' : undefined}>
                    {i > 0 && ', '}
                    {DECK[id].name}
                    {h.corrupt?.includes(id) && ' (повреждённая)'}
                  </span>
                ))}
              </span>
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
