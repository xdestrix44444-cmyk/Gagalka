import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { omensFor, rollIntegrity, type Omen } from './creep'
import { AiText } from './AiText'
import { DECK, integrityState } from './deck'
import { THREE_CARD_POSITIONS, cryptoRng, dayKey, drawCards } from './draw'
import { QUESTION_MAX } from './reading-request'
import { FLIP_MS, PixelCard, ShuffleDeck } from './PixelCard'
import { NatalScreen } from './natal/NatalScreen'
import { Reading, ReadingText } from './Reading'
import { entryIntegrity, loadDayCard, loadHistory, saveDayCard, saveHistoryEntry } from './storage'
import { play, resumeSound } from './sound'
import { haptic, initTelegram } from './telegram'
import { Boot, shouldBoot } from './ui/Boot'
import { Haunt } from './ui/Haunt'
import { Menu } from './ui/Menu'
import { ScreenHead } from './ui/ScreenHead'
import { StatusBar } from './ui/StatusBar'

type Screen = 'menu' | 'tarot' | 'spread' | 'diary' | 'natal'

/** Сколько тасуется колода перед картой дня, мс; совпадает с .shuffle в styles.css. */
const SHUFFLE_MS = 1100

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

const tg = initTelegram()

/** Целостность карты в этот раз и знамения, которые на неё влияли; предыдущей считается последняя карта дневника. */
function rollFor(cardId: number, previousCardId: number | null): { integrity: number; omens: Omen[] } {
  const ctx = { date: new Date(), previousCardId, cardId }
  return { integrity: rollIntegrity(ctx, cryptoRng), omens: omensFor(ctx) }
}

/** Звук и вибрация в момент, когда открылась карта: повреждённая сбоит, с помехой шипит. */
function revealFx(integrity: number) {
  play('flip')
  const state = integrityState(integrity)
  if (state === 'damaged') {
    haptic('error')
    play('corrupt')
  } else if (state === 'partial') play('static')
}

function lastCardId(): number | null {
  const last = loadHistory()[0]
  return last ? last.cards[last.cards.length - 1] : null
}

export function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [booting, setBooting] = useState(shouldBoot)
  // смена раздела: старый экран гаснет, новый проявляется (screen-out / screen-in в styles.css)
  const [leaving, setLeaving] = useState(false)
  const go = (s: Screen) => {
    play('tap')
    if (prefersReducedMotion()) return show(s)
    setLeaving(true)
    setTimeout(() => {
      setLeaving(false)
      show(s)
    }, 180)
  }
  const show = (s: Screen) => {
    setScreen(s)
    window.scrollTo({ top: 0 })
  }
  return (
    <>
      <Haunt />
      {/* звук можно запустить только после жеста: первое касание возобновляет гул, если он включён */}
      <main className={leaving ? 'app leaving' : 'app'} onPointerDown={resumeSound}>
        <div key={screen} className="sweep" aria-hidden="true" />
        <StatusBar onHome={() => go('menu')} />
        {screen === 'menu' && (
          <Menu
            greeting={tg.firstName ? `с возвращением, ${tg.firstName}` : 'пользователь опознан'}
            onEnter={show}
          />
        )}
        {screen === 'tarot' && <Tarot onSpread={() => go('spread')} onDiary={() => go('diary')} onMenu={() => go('menu')} />}
        {screen === 'spread' && <Spread onBack={() => go('tarot')} />}
        {screen === 'diary' && <Diary onBack={() => go('tarot')} />}
        {screen === 'natal' && <NatalScreen onBack={() => go('menu')} />}
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
/** Раздел таро: карта дня, вход в расклад и дневник. */
function Tarot({ onSpread, onDiary, onMenu }: { onSpread: () => void; onDiary: () => void; onMenu: () => void }) {
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
    const { integrity, omens } = rollFor(card.id, lastCardId())
    revealFx(integrity)
    const entry = { cardId: card.id, integrity, omens }
    saveDayCard(today, entry)
    saveHistoryEntry({ kind: 'day', cards: [card.id], integrity: [integrity] })
    setDay(entry)
    setJustRevealed(true)
  }

  const card = cardId === null ? null : DECK[cardId]
  return (
    <section className="screen">
      <ScreenHead title="Карта дня" onBack={onMenu} />
      {!card && <p className="lede">Подумайте о том, что сегодня для вас важно, и откройте карту.</p>}
      <div className="stage single altar">
        {shuffling ? (
          <ShuffleDeck />
        ) : (
          <PixelCard id={cardId} integrity={day?.integrity} animate={justRevealed} label={card && day ? `Карта дня: ${card.name}, целостность ${day.integrity}%` : 'Карта дня, рубашка. Нажмите, чтобы открыть'} onClick={card ? undefined : reveal} />
        )}
        {card && day && (
          <Reading
            card={card}
            integrity={day.integrity}
            omens={day.omens}
            delay={justRevealed ? FLIP_MS : 0}
            body={
              <AiText
                request={{ kind: 'day', cards: [{ id: card.id, integrity: day.integrity, omens: day.omens }] }}
                saved={day.ai}
                fallback={<ReadingText card={card} integrity={day.integrity} />}
                onDone={(ai) => {
                  const next = { ...day, ai }
                  saveDayCard(today, next)
                  setDay(next)
                }}
              />
            }
          />
        )}
        {!card &&
          (shuffling ? (
            <p className="hint">тасую колоду…</p>
          ) : (
            <button type="button" className="btn primary cta" onClick={reveal}>
              Открыть карту дня
            </button>
          ))}
      </div>
      <div className="divider" aria-hidden="true" />
      <div className="actions">
        <button type="button" className={card ? 'btn primary wide' : 'btn'} onClick={onSpread}>
          {card ? 'Расклад на три карты' : 'Три карты'}
        </button>
        <button type="button" className={card ? 'btn wide' : 'btn'} onClick={onDiary}>
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
    const rolls = drawn.map((c) => {
      const v = rollFor(c.id, prev)
      prev = c.id
      return v
    })
    return { drawn, integrity: rolls.map((r) => r.integrity), omens: rolls.map((r) => r.omens) }
  }
  const [dealt, setDealt] = useState(deal)
  // номер раздачи: новые карты всегда заново вылетают из колоды
  const [round, setRound] = useState(0)
  const cards = dealt.drawn
  const integrity = dealt.integrity
  const omens = dealt.omens
  const [open, setOpen] = useState<boolean[]>([false, false, false])
  const allOpen = open.every(Boolean)
  // карты открываются по порядку: ситуация, препятствие, совет
  const next = open.indexOf(false)
  const started = open.some(Boolean)
  const [question, setQuestion] = useState('')

  const flip = (i: number) => {
    if (open[i]) return
    haptic()
    revealFx(integrity[i])
    // функциональное обновление: быстрые нажатия подряд не теряют открытые карты
    setOpen((prev) => prev.map((v, k) => (k === i ? true : v)))
  }

  // расклад попадает в дневник, когда открыта последняя карта
  useEffect(() => {
    if (allOpen)
      saveHistoryEntry({ kind: 'three', cards: cards.map((c) => c.id), integrity })
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
      <ScreenHead title="Три карты" onBack={onBack} />
      {!started && <p className="lede">Задайте вопрос или просто подумайте о нём, затем откройте карты по порядку.</p>}
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
          <figure key={`${round}-${i}`} className={`slot deal${i === next ? ' next' : ''}${!open[i] && i !== next ? ' wait' : ''}`} style={{ '--i': i } as CSSProperties}>
            <PixelCard
              id={open[i] ? c.id : null}
              integrity={integrity[i]}
              label={open[i] ? `${THREE_CARD_POSITIONS[i]}: ${c.name}, целостность ${integrity[i]}%` : `${THREE_CARD_POSITIONS[i]}, рубашка. Нажмите, чтобы открыть`}
              onClick={i === next ? () => flip(i) : undefined}
            />
            <figcaption>
              <span className="pos">{THREE_CARD_POSITIONS[i]}</span>
              {open[i] ? <span className="nm">{c.name}</span> : i === next && <span className="tap">▸ коснитесь</span>}
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="readings" aria-live="polite">
        {cards.map(
          (c, i) =>
            open[i] && (
              <Reading key={`${round}-${i}`} card={c} integrity={integrity[i]} omens={omens[i]} position={THREE_CARD_POSITIONS[i]} delay={FLIP_MS} body={null} />
            ),
        )}
        {allOpen && (
          <article key={round} className="reading summary">
            <h2>&gt; толкование расклада</h2>
            <AiText
              request={{ kind: 'three', cards: cards.map((c, i) => ({ id: c.id, integrity: integrity[i], omens: omens[i] })), question: question.trim() || undefined }}
              delay={FLIP_MS + 1400}
              fallback={cards.map((c, i) => (
                <ReadingText key={i} card={c} integrity={integrity[i]} label={THREE_CARD_POSITIONS[i]} />
              ))}
            />
          </article>
        )}
      </div>
      {allOpen && (
        <>
          <div className="divider" aria-hidden="true" />
          <div className="actions">
            <button type="button" className="btn primary wide" onClick={again}>
              Новый расклад
            </button>
          </div>
        </>
      )}
    </section>
  )
}

function Diary({ onBack }: { onBack: () => void }) {
  const history = useMemo(() => loadHistory(), [])
  const fmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
  return (
    <section className="screen">
      <ScreenHead title="Дневник" onBack={onBack} />
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
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
