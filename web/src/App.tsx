import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { rollCorrupt } from './creep'
import { AiText } from './AiText'
import { CORRUPT_TOTAL, DECK, variantOf } from './deck'
import { THREE_CARD_POSITIONS, cryptoRng, dayKey, drawCards } from './draw'
import { QUESTION_MAX } from './reading-request'
import { FLIP_MS, PixelCard, ShuffleDeck } from './PixelCard'
import { NatalScreen } from './natal/NatalScreen'
import { Reading } from './Reading'
import { foundCorrupt, loadDayCard, loadHistory, saveDayCard, saveHistoryEntry } from './storage'
import { play, resumeSound } from './sound'
import { haptic, initTelegram } from './telegram'
import { Boot, shouldBoot } from './ui/Boot'
import { Haunt } from './ui/Haunt'
import { StatusBar } from './ui/StatusBar'

type Screen = 'home' | 'spread' | 'diary' | 'natal'

/** Сколько тасуется колода перед картой дня, мс; совпадает с .shuffle в styles.css. */
const SHUFFLE_MS = 1100

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

const tg = initTelegram()

/** Бросает кубик «повреждённости» для карты; предыдущей считается последняя карта дневника. */
function rollFor(cardId: number, previousCardId: number | null): boolean {
  if (!DECK[cardId].corrupt) return false
  return rollCorrupt({ date: new Date(), previousCardId, cardId }, cryptoRng)
}

function lastCardId(): number | null {
  const last = loadHistory()[0]
  return last ? last.cards[last.cards.length - 1] : null
}

export function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [booting, setBooting] = useState(shouldBoot)
  const go = (s: Screen) => {
    play('tap')
    setScreen(s)
    window.scrollTo({ top: 0 })
  }
  return (
    <>
      <Haunt />
      {/* звук можно запустить только после жеста: первое касание возобновляет гул, если он включён */}
      <main className="app" onPointerDown={resumeSound}>
        <StatusBar onHome={() => setScreen('home')} />
        {screen === 'home' && <Home onSpread={() => go('spread')} onDiary={() => go('diary')} onNatal={() => go('natal')} />}
        {screen === 'spread' && <Spread onBack={() => go('home')} />}
        {screen === 'diary' && <Diary onBack={() => go('home')} />}
        {screen === 'natal' && <NatalScreen onBack={() => go('home')} />}
        <p className="disclaimer">
          Толкования носят рефлексивный и развлекательный характер и не заменяют советы врача, юриста или психолога.
        </p>
      </main>
      <div className="crt" aria-hidden="true" />
      {booting && <Boot onDone={() => setBooting(false)} />}
    </>
  )
}

/** Заголовок экрана с пиксельными ромбами по краям. */
function Title({ children }: { children: string }) {
  return (
    <h1 className="title">
      <span className="gem" aria-hidden="true" />
      {children}
      <span className="gem" aria-hidden="true" />
    </h1>
  )
}

function Home({ onSpread, onDiary, onNatal }: { onSpread: () => void; onDiary: () => void; onNatal: () => void }) {
  const today = useMemo(() => dayKey(), [])
  const [day, setDay] = useState(() => loadDayCard(today))
  const cardId = day ? day.cardId : null
  // тасование перед картой дня; justRevealed — карту открыли сейчас, а не раньше сегодня
  const [shuffling, setShuffling] = useState(false)
  const [justRevealed, setJustRevealed] = useState(false)

  const reveal = () => {
    if (cardId !== null || shuffling) return
    haptic()
    if (prefersReducedMotion()) return pick()
    play('shuffle')
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
    play('flip')
    if (corrupt) play('corrupt')
    const entry = { cardId: card.id, corrupt }
    saveDayCard(today, entry)
    saveHistoryEntry({ kind: 'day', cards: [card.id], corrupt: corrupt ? [card.id] : [] })
    setDay(entry)
    setJustRevealed(true)
  }

  const card = cardId === null ? null : DECK[cardId]
  return (
    <section className="screen">
      <p className="greet">
        <span className="prompt">&gt;</span> {tg.firstName ? `с возвращением, ${tg.firstName}` : 'пользователь опознан'}
      </p>
      <Title>Карта дня</Title>
      <p className="lede">Подумайте о том, что сегодня для вас важно, и коснитесь карты.</p>
      <div className="stage single altar">
        {shuffling ? (
          <ShuffleDeck />
        ) : (
          <PixelCard id={cardId} corrupt={day?.corrupt} animate={justRevealed} label={card ? `Карта дня: ${card.name}${day?.corrupt ? ' (повреждённая версия)' : ''}` : 'Карта дня, рубашка. Нажмите, чтобы открыть'} onClick={card ? undefined : reveal} />
        )}
        {card && day && (
          <Reading
            card={card}
            corrupt={day.corrupt}
            delay={justRevealed ? FLIP_MS : 0}
            body={
              <AiText
                request={{ kind: 'day', cards: [{ id: card.id, corrupt: day.corrupt }] }}
                saved={day.ai}
                fallback={<p className="text">{variantOf(card, day.corrupt).text}</p>}
                onDone={(ai) => {
                  const next = { ...day, ai }
                  saveDayCard(today, next)
                  setDay(next)
                }}
              />
            }
          />
        )}
        {!card && <p className="hint">{shuffling ? 'тасую колоду…' : 'коснитесь нити'}</p>}
      </div>
      <div className="divider" aria-hidden="true" />
      <div className="actions">
        <button type="button" className="btn primary" onClick={onSpread}>
          Три карты
        </button>
        <button type="button" className="btn" onClick={onDiary}>
          Дневник
        </button>
        <button type="button" className="btn wide" onClick={onNatal}>
          Натальная карта
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
  const started = open.some(Boolean)
  const [question, setQuestion] = useState('')

  const flip = (i: number) => {
    if (open[i]) return
    haptic()
    play('flip')
    // функциональное обновление: быстрые нажатия подряд не теряют открытые карты
    setOpen((prev) => prev.map((v, k) => (k === i ? true : v)))
    if (flags[i]) {
      haptic('error')
      play('corrupt')
    }
  }

  // расклад попадает в дневник, когда открыта последняя карта
  useEffect(() => {
    if (allOpen)
      saveHistoryEntry({ kind: 'three', cards: cards.map((c) => c.id), corrupt: cards.filter((_, k) => flags[k]).map((c) => c.id) })
  }, [allOpen])

  const again = () => {
    play('tap')
    setDealt(deal())
    setRound((r) => r + 1)
    setOpen([false, false, false])
    setQuestion('')
  }

  return (
    <section className="screen">
      <Title>Три карты</Title>
      <p className="lede">Задайте вопрос или просто подумайте о нём, затем открывайте карты по порядку.</p>
      {started ? (
        question.trim() && <p className="asked">«{question.trim()}»</p>
      ) : (
        <label className="question">
          <span><span className="prompt">&gt;</span> вопрос к нити (необязательно)</span>
          <textarea value={question} maxLength={QUESTION_MAX} rows={2} placeholder="Например: что мне важно понять про новую работу?" onChange={(e) => setQuestion(e.target.value)} />
        </label>
      )}
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
              <Reading key={`${round}-${i}`} card={c} corrupt={flags[i]} position={THREE_CARD_POSITIONS[i]} delay={FLIP_MS} body={null} />
            ),
        )}
        {allOpen && (
          <article key={round} className="reading summary">
            <h2>&gt; толкование расклада</h2>
            <AiText
              request={{ kind: 'three', cards: cards.map((c, i) => ({ id: c.id, corrupt: flags[i] })), question: question.trim() || undefined }}
              delay={FLIP_MS + 1400}
              fallback={cards.map((c, i) => (
                <p key={i} className="text">
                  <b>{THREE_CARD_POSITIONS[i]}.</b> {variantOf(c, flags[i]).text}
                </p>
              ))}
            />
          </article>
        )}
      </div>
      <div className="divider" aria-hidden="true" />
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
      <Title>Дневник</Title>
      <p className="found">
        <span className="prompt">&gt;</span> найдено повреждённых файлов: {found.size} из {CORRUPT_TOTAL}
      </p>
      {history.length === 0 ? (
        <p className="lede">Здесь появятся ваши расклады. Откройте карту дня или сделайте первый расклад.</p>
      ) : (
        <ul className="diary">
          {history.map((h) => (
            <li key={h.id}>
              <span className="when">
                [{fmt.format(h.at)}] <span className="kind">{h.kind === 'day' ? 'карта дня' : 'три карты'}</span>
              </span>
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
      <div className="divider" aria-hidden="true" />
      <div className="actions">
        <button type="button" className="btn" onClick={onBack}>
          Назад
        </button>
      </div>
    </section>
  )
}
