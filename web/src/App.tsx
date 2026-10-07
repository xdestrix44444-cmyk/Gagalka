import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { omensFor, rollIntegrity, type Omen } from './creep'
import { AiText } from './AiText'
import { DECK, integrityState } from './deck'
import { cryptoRng, dayKey, drawCards } from './draw'
import { QUESTION_MAX } from './reading-request'
import { SPREADS, SPREAD_KINDS, type SpreadKind } from './spreads'
import { FLIP_MS, PixelCard, ShuffleDeck } from './PixelCard'
import { MatrixScreen } from './matrix/MatrixScreen'
import { NatalScreen } from './natal/NatalScreen'
import { Reading, ReadingText } from './Reading'
import { Diary } from './Diary'
import { loadDayCard, loadHistory, saveDayCard, saveHistoryEntry, updateHistoryEntry } from './storage'
import { ShareReading } from './ui/ShareReading'
import { play, resumeSound } from './sound'
import { haptic, initTelegram } from './telegram'
import { Boot, shouldBoot } from './ui/Boot'
import { Haunt } from './ui/Haunt'
import { Menu } from './ui/Menu'
import { ScreenHead } from './ui/ScreenHead'
import { Intro, introSeen } from './ui/Intro'
import { SettingsScreen } from './ui/Settings'
import { StatusBar } from './ui/StatusBar'
import { TabBar, type Section } from './ui/TabBar'

type Screen = 'menu' | 'tarot' | 'spread' | 'diary' | 'natal' | 'matrix' | 'settings'

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
  // вступление: при первом входе в меню или по кнопке в настройках
  const [intro, setIntro] = useState(() => !introSeen())
  // куда вернуться из настроек
  const [beforeSettings, setBeforeSettings] = useState<Screen>('menu')
  const section: Section | null = screen === 'tarot' || screen === 'spread' || screen === 'diary' ? 'tarot' : screen === 'natal' ? 'natal' : screen === 'matrix' ? 'matrix' : null
  const withTabs = screen !== 'menu'
  return (
    <>
      <Haunt />
      {/* звук можно запустить только после жеста: первое касание возобновляет гул, если он включён */}
      <main className={`app${leaving ? ' leaving' : ''}${withTabs ? ' with-tabs' : ''}`} onPointerDown={resumeSound}>
        <div key={screen} className="sweep" aria-hidden="true" />
        <StatusBar
          onHome={() => go('menu')}
          onSettings={() => {
            if (screen === 'settings') return
            setBeforeSettings(screen)
            go('settings')
          }}
        />
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
        {screen === 'matrix' && <MatrixScreen onBack={() => go('menu')} />}
        {screen === 'settings' && (
          <SettingsScreen
            onBack={() => go(beforeSettings)}
            onShowIntro={() => {
              show('menu')
              setIntro(true)
            }}
          />
        )}
      </main>
      {withTabs && <TabBar active={section} onGo={(s) => go(s)} />}
      {intro && !booting && screen === 'menu' && <Intro onClose={() => setIntro(false)} />}
      <div className="crt" aria-hidden="true" />
      {booting && <Boot onDone={() => setBooting(false)} />}
    </>
  )
}

/** Заголовок экрана с пиксельными ромбами по краям. */
/** Сколько осталось до новой карты дня (до местной полуночи); в полночь сообщает о новом дне. */
function NextDay({ onNewDay }: { onNewDay: () => void }) {
  const left = () => {
    const now = new Date()
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    return Math.max(0, Math.round((midnight.getTime() - now.getTime()) / 1000))
  }
  const [sec, setSec] = useState(left)
  useEffect(() => {
    const t = setInterval(() => {
      const s = left()
      setSec(s)
      if (s === 0) onNewDay()
    }, 1000)
    return () => clearInterval(t)
  }, [])
  const hh = String(Math.floor(sec / 3600)).padStart(2, '0')
  const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, '0')
  const ss = String(sec % 60).padStart(2, '0')
  return (
    <p className="next-day">
      <span className="prompt">&gt;</span> следующая запись через <b>{hh}:{mm}:{ss}</b>
    </p>
  )
}

/** Раздел таро: карта дня, вход в расклад и дневник. */
function Tarot({ onSpread, onDiary, onMenu }: { onSpread: () => void; onDiary: () => void; onMenu: () => void }) {
  const [today, setToday] = useState(dayKey)
  const [day, setDay] = useState(() => loadDayCard(today))
  // наступила полночь, пока экран открыт: новая карта дня
  const newDay = () => {
    const key = dayKey()
    setToday(key)
    setDay(loadDayCard(key))
    setJustRevealed(false)
  }
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
    const h = saveHistoryEntry({ kind: 'day', cards: [card.id], integrity: [integrity] })
    const entry = { cardId: card.id, integrity, omens, historyId: h.id }
    saveDayCard(today, entry)
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
                  if (day.historyId) updateHistoryEntry(day.historyId, { ai })
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
      {card && day && <NextDay onNewDay={newDay} />}
      <div className="divider" aria-hidden="true" />
      <div className="actions">
        {card && day && <ShareReading title="Карта дня" cards={[{ id: card.id, integrity: day.integrity }]} />}
        <button type="button" className={card ? 'btn primary wide' : 'btn'} onClick={onSpread}>
          {card ? 'Сделать расклад' : 'Расклад'}
        </button>
        <button type="button" className={card ? 'btn wide' : 'btn'} onClick={onDiary}>
          Дневник
        </button>
      </div>
    </section>
  )
}

/** Расклад: сначала выбор вида и вопрос, затем стол с картами. */
function Spread({ onBack }: { onBack: () => void }) {
  const [kind, setKind] = useState<SpreadKind | null>(null)
  const [question, setQuestion] = useState('')
  // номер раздачи: новые карты всегда заново вылетают из колоды
  const [round, setRound] = useState(0)

  if (!kind)
    return (
      <section className="screen">
        <ScreenHead title="Расклад" onBack={onBack} />
        <p className="lede">Задайте вопрос или просто подумайте о нём, затем выберите расклад.</p>
        <label className="question">
          <span><span className="prompt">&gt;</span> вопрос к нити (необязательно)</span>
          <textarea value={question} maxLength={QUESTION_MAX} rows={2} placeholder="Например: что мне важно понять про новую работу?" onChange={(e) => setQuestion(e.target.value)} />
        </label>
        <div className="spread-pick">
          {SPREAD_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              className="spread-option"
              onClick={() => {
                play('shuffle')
                haptic()
                setRound((r) => r + 1)
                setKind(k)
              }}
            >
              <span className={`spread-icon ${k}`} aria-hidden="true">
                {SPREADS[k].positions.map((_, i) => (
                  <i key={i} />
                ))}
              </span>
              <span className="spread-name">{SPREADS[k].name}</span>
              <span className="spread-line">{SPREADS[k].line}</span>
              <span className="spread-count">{SPREADS[k].positions.length}</span>
            </button>
          ))}
        </div>
      </section>
    )

  return (
    <SpreadTable
      key={round}
      kind={kind}
      question={question.trim()}
      onBack={() => setKind(null)}
      onAgain={() => {
        play('tap')
        setQuestion('')
        setKind(null)
      }}
    />
  )
}

/** Стол расклада: карты открываются по порядку позиций, затем общее толкование. */
function SpreadTable({ kind, question, onBack, onAgain }: { kind: SpreadKind; question: string; onBack: () => void; onAgain: () => void }) {
  const spread = SPREADS[kind]
  const positions = spread.positions.map((p) => p.name)
  const [dealt] = useState(() => {
    const drawn = drawCards(positions.length)
    let prev = lastCardId()
    const rolls = drawn.map((c) => {
      const v = rollFor(c.id, prev)
      prev = c.id
      return v
    })
    return { drawn, integrity: rolls.map((r) => r.integrity), omens: rolls.map((r) => r.omens) }
  })
  const { drawn: cards, integrity, omens } = dealt
  const [open, setOpen] = useState<boolean[]>(() => positions.map(() => false))
  const allOpen = open.every(Boolean)
  // карты открываются по порядку позиций
  const next = open.indexOf(false)

  const flip = (i: number) => {
    if (open[i]) return
    haptic()
    revealFx(integrity[i])
    // функциональное обновление: быстрые нажатия подряд не теряют открытые карты
    setOpen((prev) => prev.map((v, k) => (k === i ? true : v)))
  }

  // расклад попадает в дневник, когда открыта последняя карта; толкование дописывается, когда придёт
  const historyId = useRef<string | null>(null)
  const pendingAi = useRef<string | null>(null)
  useEffect(() => {
    if (!allOpen) return
    historyId.current = saveHistoryEntry({ kind, cards: cards.map((c) => c.id), integrity, question: question || undefined, ai: pendingAi.current ?? undefined }).id
  }, [allOpen])
  const saveAi = (ai: string) => {
    if (historyId.current) updateHistoryEntry(historyId.current, { ai })
    else pendingAi.current = ai
  }

  const many = kind === 'celtic'
  return (
    <section className="screen">
      <ScreenHead title={spread.name} onBack={onBack} />
      {question ? <p className="asked">«{question}»</p> : <p className="lede">{kind === 'one' ? 'Откройте карту.' : 'Откройте карты по порядку.'}</p>}
      <div className={`stage spread-${kind}`}>
        {cards.map((c, i) => (
          <figure
            key={i}
            className={`slot deal p${i + 1}${i === next ? ' next' : ''}${!open[i] && i !== next ? ' wait' : ''}`}
            style={{ '--i': i } as CSSProperties}
          >
            <PixelCard
              id={open[i] ? c.id : null}
              integrity={integrity[i]}
              label={open[i] ? `${positions[i]}: ${c.name}, целостность ${integrity[i]}%` : `${positions[i]}, рубашка. Нажмите, чтобы открыть`}
              onClick={i === next ? () => flip(i) : undefined}
            />
            <figcaption>
              <span className="pos">{many ? i + 1 : positions[i]}</span>
              {!many && (open[i] ? <span className="nm">{c.name}</span> : i === next && <span className="tap">▸ коснитесь</span>)}
            </figcaption>
          </figure>
        ))}
      </div>
      {many && next >= 0 && (
        <p className="hint spread-next">
          ▸ {next + 1} · {positions[next]}: {spread.positions[next].hint}
        </p>
      )}
      <div className="readings" aria-live="polite">
        {cards.map(
          (c, i) =>
            open[i] && (
              <Reading
                key={i}
                card={c}
                integrity={integrity[i]}
                omens={omens[i]}
                position={many ? `${i + 1} · ${positions[i]}` : positions[i]}
                delay={FLIP_MS}
                body={
                  kind === 'one' ? (
                    <AiText
                      request={{ kind, cards: [{ id: c.id, integrity: integrity[i], omens: omens[i] }], question: question || undefined }}
                      delay={FLIP_MS + 1400}
                      fallback={<ReadingText card={c} integrity={integrity[i]} />}
                      onDone={saveAi}
                    />
                  ) : null
                }
              />
            ),
        )}
        {allOpen && kind !== 'one' && (
          <article className="reading summary">
            <h2>&gt; толкование расклада</h2>
            <AiText
              request={{ kind, cards: cards.map((c, i) => ({ id: c.id, integrity: integrity[i], omens: omens[i] })), question: question || undefined }}
              delay={FLIP_MS + 1400}
              fallback={cards.map((c, i) => (
                <ReadingText key={i} card={c} integrity={integrity[i]} label={positions[i]} />
              ))}
              onDone={saveAi}
            />
          </article>
        )}
      </div>
      {allOpen && (
        <>
          <div className="divider" aria-hidden="true" />
          <div className="actions">
            <ShareReading title={spread.name} cards={cards.map((c, i) => ({ id: c.id, integrity: integrity[i], label: positions[i] }))} question={question || undefined} />
            <button type="button" className="btn primary wide" onClick={onAgain}>
              Новый расклад
            </button>
          </div>
        </>
      )}
    </section>
  )
}

