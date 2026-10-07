import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import backImg from '../art/img/back.jpg'
import { moonAge, omensFor, type Omen } from '../creep'
import { ACTIVE_DECK, DECK } from '../deck'
import { SOUND_EVENT, play, resumeSound, setSound, soundEnabled } from '../sound'

const KEY = 'nit.booted'
const LINE_MS = 230
const SYNODIC = 29.530588853

/** Шёпот под глазом: одна фраза на сеанс. */
const WHISPERS = [
  'нить уже натянута',
  'вас здесь ждали',
  'колода помнит ваши руки',
  'не всё, что видно, — правда',
  'кто-то открывал эту дверь до вас',
  'смотрите внимательно. оно смотрит тоже',
  'ответ уже записан. осталось прочесть',
]

const OMEN_SHORT: Record<Omen, string> = {
  night: 'ночь',
  newmoon: 'новолуние',
  fullmoon: 'полнолуние',
  mercury: 'ретроградный Меркурий',
  repeat: 'повтор',
  friday13: 'пятница 13-е',
}

/** Фаза луны словами и освещённость диска. */
function moonLine(date: Date): string {
  const age = moonAge(date)
  const lit = Math.round(((1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2) * 100)
  const phase = age < 1.5 || age > SYNODIC - 1.5 ? 'новолуние' : Math.abs(age - SYNODIC / 2) < 1.5 ? 'полнолуние' : age < SYNODIC / 2 ? 'растущая' : 'убывающая'
  return `${phase} ${lit}%`
}

/** Строки загрузки: колода, небо сегодня, знамения. */
function bootLines(now: Date) {
  const omens = omensFor({ date: now, previousCardId: null, cardId: -1 })
  return [
    { text: 'НИТЬ · терминал нейро-таро v0.13' },
    { text: `загрузка колоды ........ ${DECK.length} карт` },
    { text: `доступно для чтения .... ${ACTIVE_DECK.length}` },
    { text: `луна ................... ${moonLine(now)}` },
    { text: `знамения ............... ${omens.length ? omens.map((o) => OMEN_SHORT[o]).join(', ') : 'тихо'}`, omen: omens.length > 0 },
    { text: 'проверка целостности ... ERR 0x10', err: true },
    { text: 'канал связи ............ открыт' },
  ]
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Показывать заставку раз за сеанс (новая вкладка или новый запуск в Telegram). */
export function shouldBoot(): boolean {
  try {
    return sessionStorage.getItem(KEY) !== '1'
  } catch {
    return true
  }
}

/** Экран входа: загрузочный лог, открывается глаз и следит за вами. Дальше — только по касанию. */
export function Boot({ onDone }: { onDone: () => void }) {
  const lines = useMemo(() => bootLines(new Date()), [])
  const whisper = useMemo(() => WHISPERS[Math.floor(Math.random() * WHISPERS.length)], [])
  const [shown, setShown] = useState(() => (reducedMotion() ? lines.length : 0))
  const [typed, setTyped] = useState(() => (reducedMotion() ? whisper.length : 0))
  const [leaving, setLeaving] = useState(false)
  const [sound, setSoundState] = useState(soundEnabled)
  const eye = useRef<HTMLDivElement>(null)
  const ready = shown >= lines.length

  const finish = () => {
    try {
      sessionStorage.setItem(KEY, '1')
    } catch {
      // без сохранения
    }
    setLeaving(true)
    setTimeout(onDone, reducedMotion() ? 0 : 380)
  }

  useEffect(() => {
    play('boot')
    const sync = () => setSoundState(soundEnabled())
    window.addEventListener(SOUND_EVENT, sync)
    return () => window.removeEventListener(SOUND_EVENT, sync)
  }, [])

  // лог печатается по строке; когда допечатан, открывается глаз (.boot-eye.open) и экран ждёт касания
  useEffect(() => {
    if (ready) return
    const t = setTimeout(() => {
      play('type')
      setShown((n) => n + 1)
    }, LINE_MS)
    return () => clearTimeout(t)
  }, [shown])

  // шёпот допечатывается по букве, когда глаз уже открыт
  useEffect(() => {
    if (!ready || typed >= whisper.length) return
    const t = setTimeout(() => setTyped((n) => n + 1), typed === 0 ? 1300 : 55)
    return () => clearTimeout(t)
  }, [ready, typed])

  // глаз следит за пальцем или курсором: зрачок сдвигается на несколько пикселей
  const look = (e: PointerEvent) => {
    const el = eye.current
    if (!el || reducedMotion()) return
    const r = el.getBoundingClientRect()
    const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)))
    const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)))
    el.style.setProperty('--lx', `${dx * 7}px`)
    el.style.setProperty('--ly', `${dy * 4}px`)
  }

  return (
    <div
      className={leaving ? 'boot leaving' : 'boot'}
      role="presentation"
      onPointerMove={look}
      onPointerDown={look}
      onClick={() => {
        resumeSound()
        finish()
      }}
    >
      <button
        type="button"
        className="boot-sound"
        aria-pressed={sound}
        onClick={(e) => {
          e.stopPropagation()
          setSound(!sound)
          if (!sound) setTimeout(() => play('boot'), 0)
        }}
      >
        ♪ звук: {sound ? 'вкл' : 'выкл'}
      </button>

      <div className="boot-log" aria-hidden="true">
        {lines.slice(0, shown).map((l, i) => (
          <p key={i} className={l.err ? 'err' : l.omen ? 'omen' : undefined}>
            <span className="prompt">&gt;</span> {l.text}
          </p>
        ))}
        {!ready && (
          <p>
            <span className="prompt">&gt;</span> <span className="blink">_</span>
          </p>
        )}
      </div>

      <div ref={eye} className={ready ? 'boot-eye open' : 'boot-eye'} style={{ backgroundImage: `url(${backImg})` }} aria-hidden="true" />
      <p className="boot-whisper" aria-hidden="true">
        {whisper.slice(0, typed)}
        {ready && typed < whisper.length && <span className="blink">_</span>}
      </p>

      <button type="button" className={ready ? 'boot-skip ready' : 'boot-skip'} onClick={(e) => (e.stopPropagation(), resumeSound(), finish())}>
        коснитесь, чтобы войти
      </button>

      <p className="boot-note">
        «Нить» — зеркало для размышлений, а не предсказание. Толкования носят рефлексивный и развлекательный характер и не заменяют советы врача, юриста или психолога. Если вам тяжело, обратитесь к специалисту.
      </p>
    </div>
  )
}
