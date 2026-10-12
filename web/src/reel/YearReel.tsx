// Ролик «что ждёт знак до конца 2026»: кадр целиком вычисляется из времени t (мс),
// поэтому запись идёт кадр за кадром без рывков и всегда получается одинаковой.
import { useEffect, useRef, type CSSProperties } from 'react'
import { drawCardBack, drawCardFace } from '../sprites'
import { POSITIONS, type ReelPlan } from './plan'
import type { Timeline } from './timeline'

export interface ReelTexts {
  terminal: Record<string, string>
  cards: { screen: string; voice: string }[]
}

export interface ReelData {
  plan: ReelPlan
  texts: ReelTexts
  timeline: Timeline
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
/** Доля пройденного отрезка [a, b]. */
const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
const easeOut = (p: number) => 1 - (1 - p) ** 3
const easeInOut = (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2)
const lerp = (a: number, b: number, p: number) => a + (b - a) * p
/** Строка, которая печатается с момента t0 со скоростью cps символов в секунду. */
const typed = (s: string, t: number, t0: number, cps = 60) => (t < t0 ? '' : s.slice(0, Math.floor(((t - t0) / 1000) * cps)))

/** Детерминированный шум по номеру кадра: помехи одинаковы при каждой записи. */
function rnd(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let x = a
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

const STATE_LABEL = { whole: 'ЦЕЛ', partial: 'ЧАСТИЧНО', damaged: 'ПОВРЕЖДЁН' } as const
const STATE_COLOR = { whole: '#3fb3a3', partial: '#e3b25a', damaged: '#ff5a6a' } as const
const MONTH_SHORT = ['ОКТ', 'НОЯ', 'ДЕК']
const BOOT_LINES = [
  'НИТЬ.EXE · сборка ████02',
  '> проверка памяти ......... ОК',
  '> загрузка колоды ........ 78/78',
  '> калибровка сигнала ▓▓▓▓▓▓▓▓ 100%',
  '> поиск соединения ...',
]

/** Холст рубашки или лица карты; рисуется один раз, дальше только двигается. */
function CardSide({ id, integrity, face, style }: { id: number; integrity: number; face: boolean; style?: CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!ref.current) return
    if (face) drawCardFace(ref.current, id, integrity)
    else drawCardBack(ref.current)
  }, [id, integrity, face])
  return <canvas ref={ref} className="card-side" style={style} />
}

interface Rect {
  x: number
  y: number
  w: number
}

const SLOT_W = 84
const slotRect = (i: number): Rect => ({ x: 40 + i * (SLOT_W + 14), y: 250, w: SLOT_W })
const CENTER: Rect = { x: 110, y: 160, w: 140 }

/** Карта с переворотом: угол 0 — рубашка, 180 — лицо. Повреждённая лежит вверх ногами. */
function FlipCard({ id, integrity, reversed, rect, angle, opacity = 1, style }: {
  id: number
  integrity: number
  reversed: boolean
  rect: Rect
  angle: number
  opacity?: number
  style?: CSSProperties
}) {
  return (
    <div className="flip" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.w * 1.5, opacity, ...style }}>
      <div className="flip-inner" style={{ transform: `rotateY(${angle}deg)` }}>
        <CardSide id={id} integrity={integrity} face={false} />
        <CardSide id={id} integrity={integrity} face style={{ transform: `rotateY(180deg)${reversed ? ' rotateZ(180deg)' : ''}` }} />
      </div>
    </div>
  )
}

/** Полосы помех. */
function Bars({ seed, count, tall = 10 }: { seed: number; count: number; tall?: number }) {
  const r = rnd(seed)
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <i
          key={i}
          className="bar"
          style={{ top: Math.floor(r() * 560) + 40, height: 3 + Math.floor(r() * tall), transform: `translateX(${Math.round((r() - 0.5) * 24)}px)` }}
        />
      ))}
    </>
  )
}

/** Пыль и зерно эфира: перерисовываются каждые два кадра. */
function Dust({ frame }: { frame: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const step = Math.floor(frame / 2)
  useEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const r = rnd(step * 7919 + 13)
    const img = ctx.createImageData(c.width, c.height)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = r() < 0.012 ? 120 + r() * 90 : 0
      img.data[i] = v
      img.data[i + 1] = v * 0.95
      img.data[i + 2] = v * 0.85
      img.data[i + 3] = v ? 38 : 0
    }
    ctx.putImageData(img, 0, 0)
  }, [step])
  return <canvas ref={ref} className="dust" width={120} height={214} />
}

/** Сколько символов субтитров напечатано к моменту t: линейно между опорными точками, на паузах стоит. */
function typedAt(subs: [number, number][], t: number): number {
  if (!subs.length || t < subs[0][1]) return 0
  for (let i = 1; i < subs.length; i++) {
    const [c0, t0] = subs[i - 1]
    const [c1, t1] = subs[i]
    if (t < t1) return Math.floor(c0 + (c1 - c0) * (t1 > t0 ? (t - t0) / (t1 - t0) : 1))
  }
  return subs[subs.length - 1][0]
}

/** Субтитры как вывод терминала: текущее предложение печатается в такт голосу, на паузах мигает курсор. */
function Subtitles({ text, subs, t }: { text: string; subs: [number, number][]; t: number }) {
  const n = typedAt(subs, t)
  if (n <= 0) return null
  const starts = [0]
  for (const m of text.matchAll(/[.!?]\s+/g)) starts.push(m.index! + m[0].length)
  const from = starts.filter((s) => s <= n - 1).pop() ?? 0
  const next = starts.find((s) => s > from) ?? text.length
  const shown = text.slice(from, Math.min(n, next)).trim()
  const typing = subs.some(([c, at], i) => i > 0 && t < at && t >= subs[i - 1][1] && subs[i - 1][0] !== c)
  return (
    <div className="subs">
      <span className="prompt">&gt; </span>
      {shown}
      <Cursor t={t} on={typing} />
    </div>
  )
}

function Cursor({ t, on = false }: { t: number; on?: boolean }) {
  return <span className="cursor" style={{ opacity: on || Math.floor(t / 450) % 2 === 0 ? 1 : 0 }}>▌</span>
}

/** Полоса чтения файла под картой; у повреждённой застревает и сменяется ошибкой и повтором. */
function LoadLine({ c, month, integrity, last, t }: { c: Timeline['cards'][number]; month: string; integrity: number; last: boolean; t: number }) {
  if (t < c.load.from || t >= c.flipEnd) return null
  const cells = 10
  const bar = (p: number) => '▓'.repeat(Math.round(p * cells)) + '░'.repeat(cells - Math.round(p * cells))
  if (c.error && t >= c.error.at) {
    const retry = span(t, c.error.failEnd + 30, c.error.failEnd + 430)
    return (
      <div className="load">
        <div className="err">&gt; ОШИБКА ЧТЕНИЯ · {integrity}%</div>
        {t >= c.error.failEnd + 30 && <div>&gt; ПОВТОР {bar(easeOut(retry))} {Math.round(retry * 100)}%</div>}
      </div>
    )
  }
  const target = c.error ? integrity / 100 : 1
  const p = easeOut(span(t, c.load.from, c.load.to)) * target
  return (
    <div className="load">
      {last && <div>&gt; ПОСЛЕДНИЙ ФАЙЛ</div>}
      <div>&gt; ЧТЕНИЕ: {month} {bar(p)} {Math.round(p * 100)}%</div>
    </div>
  )
}

export function YearReel({ data, t }: { data: ReelData; t: number }) {
  const { plan, texts, timeline: tl } = data
  const frame = Math.floor(t / (1000 / 30))
  const sign = plan.sign.name.toUpperCase()
  const b = tl.boot

  // кинескоп: включение в начале и выключение в конце
  const on = span(t, 120, b.on)
  let scaleY = t < 120 ? 0.004 : lerp(0.02, 1, easeOut(on))
  let scaleX = 1
  let bright = t < b.on ? 2.2 : lerp(1.7, 1, span(t, b.on, b.on + 200))
  if (t >= tl.off.start) {
    const p = span(t, tl.off.start, tl.off.end)
    scaleY = lerp(1, 0.006, easeInOut(span(p, 0, 0.55)))
    scaleX = lerp(1, 0.01, easeInOut(span(p, 0.55, 0.9)))
    bright = lerp(1, 3, p)
  }
  const dark = t >= tl.off.end - 40

  const cardIdx = tl.cards.findIndex((c) => t >= c.start && t < c.end)
  const inBoot = t < b.end
  const inHook = !inBoot && t < tl.hook.end
  const inFinal = t >= tl.final.start
  const header = inBoot ? 'ЗАГРУЗКА' : inFinal ? 'ЧТЕНИЕ ЗАВЕРШЕНО' : cardIdx >= 0 ? `${sign} · ${cardIdx + 1} / 3` : 'СЕАНС ДО 31.12.2026'

  // помехи и тряска
  let bars: { seed: number; count: number; tall?: number } | null = null
  let split = 0
  if (t >= 280 && t < b.on + 120) bars = { seed: frame, count: 4, tall: 14 }
  if (t >= b.connected && t < b.connected + 220) {
    bars = { seed: frame * 7 + 3, count: 5, tall: 12 }
    split = 3
  }
  if (cardIdx >= 0) {
    const c = tl.cards[cardIdx]
    const state = plan.cards[cardIdx].state
    const since = t - c.flipEnd
    if (c.error && t >= c.error.fail && t < c.error.failEnd + 120) {
      bars = { seed: frame * 5 + 11, count: 4, tall: 12 }
      split = 2
    }
    if (state === 'damaged' && since >= 0) {
      if (since < 360) {
        bars = { seed: frame * 3 + 1, count: 7, tall: 18 }
        split = 4
      } else if (since % 1700 < 170) bars = { seed: Math.floor(frame / 2) * 5 + 2, count: 3, tall: 10 }
    }
    if (state === 'partial' && since >= 0 && (since < 200 || since % 2600 < 120)) bars = { seed: Math.floor(frame / 2) * 9 + 4, count: 2, tall: 8 }
  }
  const flashing = tl.flash && t >= tl.flash.at && t < tl.flash.at + 67
  if (flashing) bars = { seed: frame * 13, count: 5, tall: 14 }
  const hookGlitch = tl.hook.glitch !== null && t >= tl.hook.glitch && t < tl.hook.glitch + 320
  const glow = 0.82 + 0.18 * Math.sin(t / 290) * Math.sin(t / 530)

  return (
    <div className="reel">
      <div
        className="screen"
        style={{
          transform: `scale(${scaleX}, ${scaleY})`,
          filter: `brightness(${bright})`,
          opacity: dark ? 0 : 1,
          textShadow: split ? `${split}px 0 rgba(181,84,60,.8), -${split}px 0 rgba(63,179,163,.8)` : undefined,
          translate: split ? `${(frame % 2 ? 1 : -1) * split}px 0` : undefined,
        }}
      >
        <Dust frame={frame} />
        <div className="hdr">
          <b>НИТЬ.EXE</b>
          <span>{header}</span>
        </div>

        {/* загрузка: запрос со знаком сразу, под ним сыплется лог */}
        {inBoot && (
          <>
            <div className="query">&gt; ЗАПРОС</div>
            <div className="px gl sign">{sign}</div>
            {t < b.connected && (
              <div className="bootlog">
                {BOOT_LINES.map((line, i) => (t >= b.lines[i] ? <div key={i}>{typed(line, t, b.lines[i], 260)}</div> : null))}
                {t >= b.lines[b.lines.length - 1] && <Cursor t={t} />}
              </div>
            )}
            {t >= b.connected && (
              <div className="px gl connected" style={{ opacity: 1 - span(t, b.end - 120, b.end) }}>
                СОЕДИНЕНИЕ
                <br />
                УСТАНОВЛЕНО
              </div>
            )}
          </>
        )}

        {inHook && (
          <>
            <div className="px gl sign">{sign}</div>
            <div className="found">{typed('> НИТЬ НАЙДЕНА', t, b.end, 40)}</div>
            <div className="px sub" style={{ opacity: span(t, b.end + 400, b.end + 650) }}>НА ОСТАТОК 2026</div>
            {tl.hook.glitch !== null && t >= tl.hook.glitch && (
              <div className="alert">{typed(`> ЦЕЛОСТНОСТЬ НАРУШЕНА: ${MONTH_SHORT[plan.cards.findIndex((c) => c.state === 'damaged')]}`, t, tl.hook.glitch, 45)}</div>
            )}
            {plan.cards.map((c, i) => {
              const appear = span(t, b.end + 100 + i * 140, b.end + 400 + i * 140)
              const r = slotRect(i)
              const broken = plan.cards[i].state === 'damaged' && tl.hook.glitch !== null && t >= tl.hook.glitch
              // вспышка на словах «Целостность нарушена», потом рубашка тлеет красным и изредка дёргается
              const twitch = broken && (t - tl.hook.glitch!) % 700 < 80
              const hit = (hookGlitch || twitch) && broken
              const jitter = hit ? (rnd(frame * 31 + i)() - 0.5) * (hookGlitch ? 10 : 5) : 0
              return (
                <div key={c.id}>
                  <FlipCard
                    id={c.id}
                    integrity={c.integrity}
                    reversed={false}
                    rect={{ x: r.x + jitter, y: r.y + (1 - easeOut(appear)) * 16, w: r.w }}
                    angle={0}
                    opacity={appear}
                    style={
                      hit
                        ? { filter: 'drop-shadow(0 0 10px rgba(255,90,106,.7)) hue-rotate(-30deg) saturate(2)' }
                        : broken
                          ? { filter: 'drop-shadow(0 0 6px rgba(255,90,106,.45)) saturate(1.3)' }
                          : undefined
                    }
                  />
                  <span className="px slot-label" style={{ left: r.x, width: r.w, opacity: appear, color: broken ? '#ff5a6a' : undefined }}>
                    {MONTH_SHORT[i]}
                  </span>
                </div>
              )
            })}
          </>
        )}

        {cardIdx >= 0 && (() => {
          const c = tl.cards[cardIdx]
          const card = plan.cards[cardIdx]
          const pos = POSITIONS[cardIdx]
          const move = easeInOut(span(t, c.start, c.start + 500))
          const from = slotRect(cardIdx)
          const rect = { x: lerp(from.x, CENTER.x, move), y: lerp(from.y, CENTER.y, move), w: lerp(from.w, CENTER.w, move) }
          // сорвавшийся переворот: карта приподнимается на 75° и падает обратно
          let angle = 180 * easeInOut(span(t, c.flip, c.flipEnd))
          let shake = 0
          if (c.error && t >= c.error.fail && t < c.error.failEnd) {
            const p = span(t, c.error.fail, c.error.failEnd)
            angle = 75 * Math.sin(Math.PI * p)
            shake = (rnd(frame * 17)() - 0.5) * 8
          }
          const shown = span(t, c.flipEnd, c.flipEnd + 350)
          const count = Math.round(card.integrity * easeOut(span(t, c.flipEnd, c.flipEnd + 600)))
          const out = 1 - span(t, c.end - 250, c.end)
          const glowColor = card.state === 'damaged' ? '255,90,106' : card.state === 'partial' ? '227,178,90' : '63,179,163'
          return (
            <div style={{ opacity: out }}>
              <div className="glow" style={{ opacity: glow * span(t, c.flipEnd - 200, c.flipEnd + 300), background: `radial-gradient(circle, rgba(${glowColor},.22), rgba(181,84,60,.08) 45%, transparent 70%)` }} />
              <div className="px month" style={{ opacity: span(t, c.start, c.start + 300) }}>{pos.month.toUpperCase()}</div>
              <div className="meaning" style={{ opacity: span(t, c.start + 100, c.start + 400) }}>{pos.meaning}</div>
              <FlipCard id={card.id} integrity={card.integrity} reversed={card.state === 'damaged'} rect={{ ...rect, x: rect.x + shake }} angle={angle} />
              <div className={`px name${card.state === 'damaged' ? ' gl' : ''}`} style={{ opacity: shown }}>
                {card.numeral} · {card.name.toUpperCase()}
              </div>
              <div className="state" style={{ opacity: shown, color: STATE_COLOR[card.state] }}>
                ЦЕЛОСТНОСТЬ {count}% · {STATE_LABEL[card.state]}
              </div>
              <LoadLine c={c} month={pos.month.toUpperCase()} integrity={card.integrity} last={cardIdx === 2} t={t} />
              <Subtitles text={texts.cards[cardIdx].voice} subs={c.subs} t={t} />
            </div>
          )
        })()}

        {/* два кадра: повреждённая карта из будущего месяца */}
        {flashing && tl.flash && (() => {
          const card = plan.cards[tl.flash.card]
          return <FlipCard id={card.id} integrity={card.integrity} reversed rect={CENTER} angle={180} />
        })()}

        {inFinal && (() => {
          const f = tl.final.start
          const L = tl.final.lines
          const rows = [
            `> ${sign}: 3/3 ФАЙЛА ПРОЧИТАНО`,
            '> СОХРАНИТЬ ДО 31.12? [Д/Н]',
            '> АРХИВ ЗНАКОВ: 1/12',
            '> СЛЕДУЮЩИЙ ЗНАК: ',
          ]
          return (
            <>
              <div className="thumbs">
                {plan.cards.map((c, i) => {
                  const a = easeOut(span(t, f + i * 120, f + 350 + i * 120))
                  return (
                    <div key={c.id} className="thumb" style={{ opacity: a, transform: `translateY(${(1 - a) * 12}px)` }}>
                      <div className="thumb-card">
                        <CardSide id={c.id} integrity={c.integrity} face style={c.state === 'damaged' ? { transform: 'rotate(180deg)' } : undefined} />
                      </div>
                      <span className="px">{MONTH_SHORT[i]}</span>
                    </div>
                  )
                })}
              </div>
              <div className="final-log">
                {rows.map((row, i) =>
                  t >= L[i] ? (
                    <div key={i} className={i === 3 ? 'next' : undefined}>
                      {typed(row, t, L[i], 70)}
                      {i === 3 && t >= L[i] + (row.length / 70) * 1000 && <Cursor t={t} />}
                    </div>
                  ) : null,
                )}
              </div>
            </>
          )
        })()}

        {bars && (
          <div className="bars">
            <Bars {...bars} />
          </div>
        )}
      </div>

      {/* включение: тонкая линия кинескопа поверх чёрного */}
      {t < 150 && t >= 40 && <div className="scanline" style={{ width: `${span(t, 40, 120) * 70}%` }} />}
      {/* выключение: остаётся светящаяся точка */}
      {t >= tl.off.start + 0.9 * (tl.off.end - tl.off.start) && t < tl.off.end && <div className="dot" />}
      <div className="crt" />
    </div>
  )
}
