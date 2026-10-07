import { useEffect, useRef, useState } from 'react'
import backImg from '../art/img/back.jpg'
import { ACTIVE_IDS } from '../deck'
import { PLANETS, SIGN_GLYPHS, computeChart } from '../natal/chart'
import { play, soundEnabled, startModem, stopModem } from '../sound'
import { preloadCards } from '../sprites'

export type Door = 'tarot' | 'natal' | 'matrix'

/** Сколько длится «провал» в выбранную дверь, мс; совпадает с .door.dive в styles.css. */
const DIVE_MS = 650
const MODEM_KEY = 'nit.modem'
/** Если запись модема не зазвучала за это время (медленная сеть), двери открываются без неё, мс. */
const MODEM_WAIT_MS = 3000
/** «Связь установлена» висит на экране перед тем, как двери загорятся, мс. */
const ONLINE_MS = 900

/** Первый вход в меню за сеанс: тогда звучит дозвон. Только чтение — запись в эффекте. */
function firstVisit(): boolean {
  try {
    return !sessionStorage.getItem(MODEM_KEY)
  } catch {
    return false
  }
}

type Link = 'dial' | 'online' | 'ready'

/** Меню входа: три двери строками — таро, натальная карта и матрица судьбы. Выбранная дверь затягивает экран внутрь. */
export function Menu({ greeting, onEnter }: { greeting: string; onEnter: (d: Door) => void }) {
  const [diving, setDiving] = useState<Door | null>(null)
  // при первом входе за сеанс программа «выходит на связь»: пока звучит дозвон, двери заперты,
  // а приложение тем временем подгружает рисунки карт и прогревает расчёт неба
  const [link, setLink] = useState<Link>(() => (firstVisit() ? 'dial' : 'ready'))
  const [progress, setProgress] = useState(0)
  // дозвон решается один раз при открытии меню: смена dial → online → ready его не перезапускает
  const dialing = useRef(link === 'dial')

  useEffect(() => {
    if (!dialing.current) return
    try {
      sessionStorage.setItem(MODEM_KEY, '1')
    } catch {
      // без сохранения: дозвон прозвучит и в следующий раз
    }
    void preloadCards(ACTIVE_IDS, 15000)
    const warm = setTimeout(() => computeChart(new Date()), 50)
    if (!soundEnabled()) {
      setLink('ready')
      return () => clearTimeout(warm)
    }
    let alive = true
    let started = false
    const timers: ReturnType<typeof setTimeout>[] = [warm]
    let tick: ReturnType<typeof setInterval> | undefined
    timers.push(
      setTimeout(() => {
        if (started || !alive) return
        stopModem()
        setLink('ready')
      }, MODEM_WAIT_MS),
    )
    void startModem().then((sec) => {
      if (!alive) return
      started = true
      if (sec === null) return setLink('ready')
      const t0 = performance.now()
      const dial = Math.max(0.1, sec * 1000 - ONLINE_MS)
      tick = setInterval(() => setProgress(Math.min(1, (performance.now() - t0) / dial)), 120)
      timers.push(setTimeout(() => setLink('online'), dial))
      timers.push(setTimeout(() => setLink('ready'), sec * 1000))
    })
    return () => {
      alive = false
      timers.forEach(clearTimeout)
      clearInterval(tick)
      // ушли из меню, не дождавшись связи, — дозвон обрывается
      stopModem()
    }
  }, [])

  const locked = link !== 'ready'
  const enter = (d: Door) => {
    if (diving || locked) return
    play('flip')
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return onEnter(d)
    setDiving(d)
    setTimeout(() => onEnter(d), DIVE_MS)
  }

  return (
    <section className={diving ? 'screen menu diving' : 'screen menu'}>
      <p className="greet">
        <span className="prompt">&gt;</span> {greeting}
      </p>
      <div className="logo" aria-label="нить.exe">
        <span className="logo-row" aria-hidden="true">
          <span className="logo-word" data-text="НИТЬ">
            НИТЬ
          </span>
          <span className="logo-ext">.exe</span>
        </span>
      </div>
      <p className="lede tagline">Ответ уже готов. Осталось задать вопрос.</p>
      {link !== 'ready' && (
        <p className={`dial ${link}`} aria-live="polite">
          <span className="prompt">&gt;</span>{' '}
          {link === 'dial' ? (
            <>
              дозвон… <span className="dial-bar">{'▓'.repeat(Math.round(progress * 12))}{'░'.repeat(12 - Math.round(progress * 12))}</span>
            </>
          ) : (
            'связь установлена'
          )}
        </p>
      )}

      {/* нить: спускается от названия к дверям */}
      <svg className="thread" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
        <path d="M100 0 V40" />
      </svg>

      <div className={locked ? 'doors locked' : 'doors'}>
        <button type="button" className={`door tarot${diving === 'tarot' ? ' dive' : ''}`} aria-disabled={locked} onClick={() => enter('tarot')} onPointerEnter={() => play('type')}>
          <span className="door-art fan" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`fan-card f${i}`} style={{ backgroundImage: `url(${backImg})` }} />
            ))}
          </span>
          <span className="door-name">Таро</span>
          <span className="door-sub">колода помнит</span>
        </button>

        <button type="button" className={`door natal${diving === 'natal' ? ' dive' : ''}`} aria-disabled={locked} onClick={() => enter('natal')} onPointerEnter={() => play('type')}>
          <span className="door-art" aria-hidden="true">
            <svg className="mini-wheel" viewBox="0 0 120 120">
              <g className="mw-ring">
                <circle cx="60" cy="60" r="56" />
                <circle cx="60" cy="60" r="44" />
                {SIGN_GLYPHS.map((g, i) => {
                  const t = ((i * 30 + 15) * Math.PI) / 180
                  return (
                    <g key={i}>
                      <line x1={60 + 44 * Math.cos((i * 30 * Math.PI) / 180)} y1={60 - 44 * Math.sin((i * 30 * Math.PI) / 180)} x2={60 + 56 * Math.cos((i * 30 * Math.PI) / 180)} y2={60 - 56 * Math.sin((i * 30 * Math.PI) / 180)} />
                      <text x={60 + 50 * Math.cos(t)} y={60 - 50 * Math.sin(t)}>
                        {g}
                      </text>
                    </g>
                  )
                })}
              </g>
              <g className="mw-planets">
                {PLANETS.slice(0, 7).map((p, i) => {
                  const t = ((i * 97 + 20) * Math.PI) / 180
                  return (
                    <text key={p.key} x={60 + 32 * Math.cos(t)} y={60 - 32 * Math.sin(t)} style={{ animationDelay: `${i * 0.4}s` }}>
                      {p.glyph + '︎'}
                    </text>
                  )
                })}
              </g>
              <path className="mw-aspect" d="M30 52 L86 40 L70 88 Z" />
              <circle className="mw-core" cx="60" cy="60" r="2.5" />
            </svg>
          </span>
          <span className="door-name">Натальная карта</span>
          <span className="door-sub">небо вашего часа</span>
        </button>

        <button type="button" className={`door matrix${diving === 'matrix' ? ' dive' : ''}`} aria-disabled={locked} onClick={() => enter('matrix')} onPointerEnter={() => play('type')}>
          <span className="door-art" aria-hidden="true">
            {/* восьмиугольник матрицы: два квадрата медленно вращаются навстречу друг другу */}
            <svg className="mini-matrix" viewBox="0 0 120 120">
              <circle className="mm-ring" cx="60" cy="60" r="54" />
              <g className="mm-sq a">
                <rect x="22" y="22" width="76" height="76" />
              </g>
              <g className="mm-sq b">
                <rect x="22" y="22" width="76" height="76" transform="rotate(45 60 60)" />
              </g>
              {[[6, 60], [60, 6], [114, 60], [60, 114]].map(([x, y], i) => (
                <circle key={i} className="mm-dot" cx={x} cy={y} r="5" style={{ animationDelay: `${i * 0.5}s` }} />
              ))}
              <circle className="mm-core" cx="60" cy="60" r="7" />
            </svg>
          </span>
          <span className="door-name">Матрица судьбы</span>
          <span className="door-sub">числа, что вас ждали</span>
        </button>
      </div>
    </section>
  )
}
