import { useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { DECK } from '../deck'
import { fmtDate } from '../natal/NatalScreen'
import { loadPeople, savePerson, type Person } from '../natal/people'
import { PixelCard } from '../PixelCard'
import { artOf } from '../sprites'
import { play } from '../sound'
import { DateField } from '../ui/DateField'
import { ScreenHead } from '../ui/ScreenHead'
import { baseOf, coupleMatrix, deckId, matrixOf, reduce, type Matrix } from './calc'
import { ARCANA, POINTS, textFor, type PointKey } from './meanings'

type View = { kind: 'list' } | { kind: 'form' } | { kind: 'person'; person: Person } | { kind: 'couple' }

/** Раздел «Матрица судьбы»: люди общие с натальной картой, для матрицы нужна только дата. */
export function MatrixScreen({ onBack }: { onBack: () => void }) {
  const [people, setPeople] = useState(loadPeople)
  const [view, setView] = useState<View>(() => (people.length ? { kind: 'list' } : { kind: 'form' }))

  if (view.kind === 'form')
    return (
      <MatrixForm
        firstSelf={!people.some((p) => p.self)}
        onSave={(p) => {
          setPeople(loadPeople())
          setView({ kind: 'person', person: p })
        }}
        onCancel={() => (people.length ? setView({ kind: 'list' }) : onBack())}
      />
    )
  if (view.kind === 'person') return <PersonMatrix person={view.person} onBack={() => setView({ kind: 'list' })} />
  if (view.kind === 'couple') return <CoupleMatrix people={people} onBack={() => setView({ kind: 'list' })} />

  return (
    <section className="screen">
      <ScreenHead title="Матрица судьбы" onBack={onBack} />
      <p className="lede">22 аркана из даты рождения: характер, таланты, деньги, отношения и то, что тянется из прошлого.</p>
      <ul className="people">
        {people.map((p) => {
          const e = matrixOf(p.date).e
          return (
            <li key={p.id}>
              <button
                type="button"
                className="person"
                onClick={() => {
                  play('tap')
                  setView({ kind: 'person', person: p })
                }}
              >
                <Thumb a={e} />
                <span className="person-name">
                  {p.name}
                  {p.self && <span className="self"> · это вы</span>}
                </span>
                <span className="person-meta">
                  {fmtDate(p.date)} · центр {e} · {ARCANA[e].name}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="divider" aria-hidden="true" />
      <div className="actions">
        <button type="button" className="btn primary wide" onClick={() => setView({ kind: 'form' })}>
          Новый человек
        </button>
        {people.length >= 2 && (
          <button
            type="button"
            className="btn wide"
            onClick={() => {
              play('tap')
              setView({ kind: 'couple' })
            }}
          >
            Матрица пары
          </button>
        )}
      </div>
    </section>
  )
}

/** Форма матрицы: только имя и дата. Место и время рождения допишут, если захотят натальную карту. */
function MatrixForm({ firstSelf, onSave, onCancel }: { firstSelf: boolean; onSave: (p: Person) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [self, setSelf] = useState(firstSelf)
  const [error, setError] = useState('')
  const today = new Date().toISOString().slice(0, 10)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Как зовут человека?')
    if (!date) return setError('Укажите дату рождения цифрами: ДД.ММ.ГГГГ')
    if (date < '1900-01-01' || date > today) return setError('Проверьте год рождения')
    play('tap')
    onSave(savePerson({ name: name.trim(), date, time: null, city: '', region: '', self }))
  }

  return (
    <section className="screen">
      <ScreenHead title="Новая матрица" onBack={onCancel} />
      <p className="lede">Для матрицы судьбы нужна только дата рождения.</p>
      <form className="natal-form" onSubmit={submit} noValidate>
        <label>
          <span><span className="prompt">&gt;</span> имя</span>
          <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Как подписать матрицу" />
        </label>
        <label>
          <span><span className="prompt">&gt;</span> дата рождения</span>
          <DateField value={date} onChange={setDate} />
        </label>
        <label className="check">
          <input type="checkbox" checked={self} onChange={(e) => setSelf(e.target.checked)} />
          <span>это моя матрица</span>
        </label>
        {error && <p className="form-error">&gt; {error}</p>}
        <div className="actions">
          <button type="submit" className="btn primary wide">
            Рассчитать матрицу
          </button>
        </div>
      </form>
    </section>
  )
}

/** Миниатюра аркана: исходный рисунок колоды и номер аркана матрицы в углу. */
function Thumb({ a, on }: { a: number; on?: boolean }) {
  const src = artOf(deckId(a))
  return (
    <span className={on ? 'm-thumb on' : 'm-thumb'} aria-hidden="true">
      {src && <img src={src} alt="" />}
      <b>{a}</b>
    </span>
  )
}

/* ---------- схема ---------- */

const C = 180
/** Координаты точек на схеме 360×360: прямой квадрат ромбом, диагональный — квадратом, лучи к центру. */
const POS: Partial<Record<PointKey, [number, number]>> = {
  e: [C, C],
  a: [30, C], b: [C, 30], c: [330, C], d: [C, 330],
  f: [74, 74], g: [286, 74], h: [286, 286], i: [74, 286],
  a2: [72, C], a1: [112, C], b2: [C, 72], b1: [C, 112], c2: [288, C], c1: [248, C], d2: [C, 288], d1: [C, 248],
  x: [214, 214], money: [233, 195], love: [195, 233],
}

/** Порядок появления точек при построении. */
const ORDER: PointKey[] = ['a', 'b', 'c', 'd', 'f', 'g', 'h', 'i', 'a2', 'b2', 'c2', 'd2', 'a1', 'b1', 'c1', 'd1', 'e', 'x', 'money', 'love']

const KIND: Partial<Record<PointKey, string>> = {
  e: 'center', a: 'base', b: 'base', c: 'base', d: 'tail', d1: 'tail', d2: 'tail',
  f: 'kin', g: 'kin', h: 'kin', i: 'kin', x: 'flow', money: 'flow', love: 'flow',
}

function Scheme({ m, sel, onSel }: { m: Matrix; sel: PointKey; onSel: (k: PointKey) => void }) {
  const line = (p: PointKey, q: PointKey, cls: string, i: number) => {
    const [x1, y1] = POS[p]!
    const [x2, y2] = POS[q]!
    return <line key={`${p}-${q}`} className={`m-line ${cls}`} x1={x1} y1={y1} x2={x2} y2={y2} pathLength={1} style={{ animationDelay: `${i * 60}ms` }} />
  }
  return (
    <svg className="m-scheme" viewBox="0 0 360 360" role="group" aria-label="Схема матрицы">
      <circle className="m-ring" cx={C} cy={C} r={150} />
      {[
        line('a', 'b', 'sq', 0), line('b', 'c', 'sq', 1), line('c', 'd', 'sq', 2), line('d', 'a', 'sq', 3),
        line('f', 'g', 'dg', 4), line('g', 'h', 'dg', 5), line('h', 'i', 'dg', 6), line('i', 'f', 'dg', 7),
        line('f', 'h', 'kin', 8), line('g', 'i', 'kin', 9),
        line('a', 'e', 'ray', 10), line('b', 'e', 'ray', 10), line('c', 'e', 'ray', 10), line('d', 'e', 'ray', 10),
        line('c1', 'd1', 'flow', 12),
      ]}
      {ORDER.map((k, i) => {
        const [x, y] = POS[k]!
        const r = k === 'e' ? 22 : KIND[k] === 'base' || k === 'd' ? 17 : KIND[k] === 'kin' ? 15 : 11
        const info = POINTS[k]
        return (
          <g
            key={k}
            className={`m-node ${KIND[k] ?? 'ray'}${sel === k ? ' on' : ''}`}
            style={{ animationDelay: `${700 + i * 55}ms` } as CSSProperties}
            role="button"
            tabIndex={0}
            aria-label={`${info?.title ?? k}: ${m[k]}, ${ARCANA[m[k]].name}`}
            onClick={() => onSel(k)}
            onKeyDown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && (ev.preventDefault(), onSel(k))}
          >
            <circle className="m-hit" cx={x} cy={y} r={Math.max(r, 16)} />
            <circle className="m-dot" cx={x} cy={y} r={r} />
            <text x={x} y={y + 1} className={r < 14 ? 'small' : undefined}>
              {m[k]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ---------- подпись к выбранной точке ---------- */

function Caption({ m, k, couple }: { m: Matrix; k: PointKey; couple?: boolean }) {
  const a = m[k]
  const info = POINTS[k]!
  const t = ARCANA[a]
  const title = couple ? (COUPLE_TITLE[k] ?? info.title) : info.title
  return (
    <article className="reading m-caption" aria-live="polite">
      <div className="m-cap-row">
        <div className="m-cap-card">
          <PixelCard id={deckId(a)} label={`${DECK[deckId(a)].name}`} />
        </div>
        <div className="m-cap-head">
          <h2>{title}</h2>
          <p className="m-cap-name">
            {a} · {t.name}
          </p>
          <p className="m-cap-key">{t.key}</p>
        </div>
      </div>
      <p className="hint-small">{couple ? (COUPLE_ABOUT[k] ?? info.about) : info.about}</p>
      <p className="text">{textFor(a, info.read)}</p>
      {info.read === 'plus' && <p className="text m-minus">В минусе: {t.minus.charAt(0).toLowerCase() + t.minus.slice(1)}</p>}
    </article>
  )
}

/* ---------- разделы под схемой ---------- */

interface Section {
  title: string
  points: PointKey[]
}

const SECTIONS: Section[] = [
  { title: 'ядро', points: ['e', 'a', 'b'] },
  { title: 'деньги', points: ['c', 'money', 'c2'] },
  { title: 'отношения', points: ['love', 'x'] },
  { title: 'кармический хвост', points: ['d', 'd2', 'd1'] },
  { title: 'предназначения', points: ['personal', 'social', 'spiritual'] },
  { title: 'род', points: ['f', 'g', 'h', 'i'] },
]

const COUPLE_SECTIONS: Section[] = [
  { title: 'зачем вы вместе', points: ['e', 'a', 'b'] },
  { title: 'деньги пары', points: ['c', 'money'] },
  { title: 'что испытывает пару', points: ['d', 'd1'] },
  { title: 'предназначение пары', points: ['personal', 'social'] },
]

const COUPLE_TITLE: Partial<Record<PointKey, string>> = {
  e: 'Центр пары · зачем вы вместе',
  a: 'Какими вас видят как пару',
  b: 'Ресурс пары',
  c: 'Материальная задача пары',
  money: 'Деньги пары',
  d: 'Испытание пары',
  d1: 'Как испытание проявляется',
  personal: 'Предназначение пары',
  social: 'Пара среди людей',
}

const COUPLE_ABOUT: Partial<Record<PointKey, string>> = {
  e: 'Ради чего вы встретились: энергия, на которой держится союз.',
  a: 'Как вас воспринимают окружающие, когда вы вместе.',
  b: 'Что у вас вдвоём получается лучше, чем по отдельности.',
  c: 'Чему пару учат общий быт и деньги.',
  money: 'Через что деньги легче приходят в пару.',
  d: 'Что повторяется в отношениях и чему они учат обоих.',
  d1: 'Через какие ситуации испытание пары проявляется.',
  personal: 'Общая задача, ради которой стоит быть вместе.',
  social: 'Что пара даёт другим людям и своим семьям.',
}

function Sections({ m, sections, sel, onSel, couple }: { m: Matrix; sections: Section[]; sel: PointKey; onSel: (k: PointKey) => void; couple?: boolean }) {
  return (
    <>
      {sections.map((s) => (
        <article key={s.title} className="reading portrait-part m-section">
          <h2>&gt; {s.title}</h2>
          {s.points.map((k) => {
            const a = m[k]
            const info = POINTS[k]!
            return (
              <button key={k} type="button" className={sel === k ? 'm-row on' : 'm-row'} onClick={() => onSel(k)}>
                <Thumb a={a} on={sel === k} />
                <span className="m-row-body">
                  <span className="m-row-title">
                    {couple ? (COUPLE_TITLE[k] ?? info.title) : info.title} · <b>{ARCANA[a].name}</b>
                  </span>
                  <span className="m-row-text">{textFor(a, info.read)}</span>
                </span>
              </button>
            )
          })}
        </article>
      ))}
    </>
  )
}

/* ---------- экраны ---------- */

/** Из раздела — к схеме: точка подсвечивается, подпись видна сразу. */
function useShowPoint(pick: (k: PointKey) => void) {
  return (k: PointKey) => {
    pick(k)
    document.querySelector('.m-scheme')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

/** Строки расчёта для лога: как из даты получились опорные точки. */
function calcLog(date: string): string[] {
  const [y, mo, d] = date.split('-')
  const b = baseOf(date)
  const ys = y.split('').reduce((s, x) => s + Number(x), 0)
  return [
    `день ${d} → ${b.a} · портрет`,
    `месяц ${mo} → ${b.b} · таланты`,
    `год ${y} → ${y.split('').join('+')} = ${ys}${ys > 22 ? ` → ${b.c}` : ''} · деньги`,
    `${b.a}+${b.b}+${b.c} = ${b.a + b.b + b.c}${b.a + b.b + b.c > 22 ? ` → ${b.d}` : ''} · кармический хвост`,
    `центр ${b.a}+${b.b}+${b.c}+${b.d} → ${reduce(b.a + b.b + b.c + b.d)}`,
  ]
}

function PersonMatrix({ person, onBack }: { person: Person; onBack: () => void }) {
  const m = useMemo(() => matrixOf(person.date), [person.date])
  const [sel, setSel] = useState<PointKey>('e')
  const pick = (k: PointKey) => {
    play('tap')
    setSel(k)
  }
  const showPoint = useShowPoint(pick)
  return (
    <section className="screen">
      <ScreenHead title={person.name} onBack={onBack} />
      <p className="lede">{fmtDate(person.date)}</p>
      <div className="reading natal-log">
        <div className="log">
          {calcLog(person.date).map((l, i) => (
            <p key={i}>
              <span className="prompt">&gt;</span> {l}
            </p>
          ))}
        </div>
      </div>
      <Scheme m={m} sel={sel} onSel={pick} />
      <p className="hint-small m-hint">коснитесь точки, чтобы узнать её смысл</p>
      <Caption m={m} k={sel} />
      <Sections m={m} sections={SECTIONS} sel={sel} onSel={showPoint} />
      <p className="hint-small">Матрица судьбы — нумерологическая система, а не наука. Читайте её как повод подумать о себе.</p>
    </section>
  )
}

function CoupleMatrix({ people, onBack }: { people: Person[]; onBack: () => void }) {
  const [aId, setAId] = useState(() => (people.find((p) => p.self) ?? people[0]).id)
  const [bId, setBId] = useState(() => people.find((p) => p.id !== aId)!.id)
  const A = people.find((p) => p.id === aId)!
  const B = people.find((p) => p.id === bId)!
  const m = useMemo(() => coupleMatrix(A.date, B.date), [A.date, B.date])
  const [sel, setSel] = useState<PointKey>('e')
  const pick = (k: PointKey) => {
    play('tap')
    setSel(k)
  }
  const showPoint = useShowPoint(pick)
  const select = (value: string, other: string, set: (id: string) => void) => (
    <select value={value} onChange={(e) => (set(e.target.value), setSel('e'))}>
      {people
        .filter((x) => x.id !== other)
        .map((x) => (
          <option key={x.id} value={x.id}>
            {x.name}
          </option>
        ))}
    </select>
  )
  return (
    <section className="screen">
      <ScreenHead title="Матрица пары" onBack={onBack} />
      <div className="m-pair">
        <label className="person-pick">
          <span className="hint-small">первый</span>
          {select(aId, bId, setAId)}
        </label>
        <span className="m-plus" aria-hidden="true">+</span>
        <label className="person-pick">
          <span className="hint-small">второй</span>
          {select(bId, aId, setBId)}
        </label>
      </div>
      <p className="lede">Опорные точки двух матриц складываются: получается третья — матрица ваших отношений.</p>
      <Scheme m={m} sel={sel} onSel={pick} />
      <p className="hint-small m-hint">коснитесь точки, чтобы узнать её смысл</p>
      <Caption m={m} k={sel} couple />
      <Sections m={m} sections={COUPLE_SECTIONS} sel={sel} onSel={showPoint} couple />
      <p className="hint-small">Матрица пары показывает темы отношений, а не приговор. Решают всё равно двое.</p>
    </section>
  )
}
