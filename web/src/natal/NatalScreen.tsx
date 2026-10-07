import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { DECK } from '../deck'
import { deckId, matrixOf } from '../matrix/calc'
import { ARCANA } from '../matrix/meanings'
import { PixelCard } from '../PixelCard'
import { hasArt } from '../sprites'
import { ScreenHead } from '../ui/ScreenHead'
import { play } from '../sound'
import { ASPECTS, PERIODS, PLANETS, POINTS, SIGNS, SIGNS_GEN, possibleAscendants, type Chart, type DayPeriod, type Element, type PlanetKey, type PointKey } from './chart'
import { findCities, type City } from './cities'
import { planetEmblem, signEmblem } from './emblems'
import { chartOf, cityOf, deletePerson, hasBirthplace, loadPeople, savePerson, type Person } from './people'
import { skyToday } from './relations'
import { renderShare, shareImage } from './share'
import { SynastryView } from './Synastry'
import { tourSteps } from './tour'
import { houseMeaning, lilithMeaning, nodeMeaning, planetMeaning } from './meanings'
import { elementBalance, mainAspect, portrait } from './portrait'
import { STAGE, Wheel, buildMs, planetsDone, type Overlay, type Selection } from './Wheel'

const HOUSE_SHORT = ['личность', 'ресурсы', 'общение', 'дом и корни', 'творчество и любовь', 'работа и здоровье', 'партнёрство', 'глубина и кризисы', 'смысл и дорога', 'призвание', 'друзья и будущее', 'уединение']

const fmtDeg = (deg: number) => `${Math.floor(deg)}°${String(Math.floor((deg % 1) * 60)).padStart(2, '0')}′`
const planetName = (k: PlanetKey) => PLANETS.find((p) => p.key === k)!.name
/** Творительный падеж для подписи связей: «трин с Юпитером». */
const PLANET_WITH: Record<PlanetKey, string> = { sun: 'Солнцем', moon: 'Луной', mercury: 'Меркурием', venus: 'Венерой', mars: 'Марсом', jupiter: 'Юпитером', saturn: 'Сатурном', uranus: 'Ураном', neptune: 'Нептуном', pluto: 'Плутоном' }
export const fmtDate = (d: string) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${d}T12:00:00`))

type View = { kind: 'list' } | { kind: 'form'; person?: Person } | { kind: 'chart'; person: Person } | { kind: 'synastry' }

/** Раздел натальных карт: список людей → форма → анимированная карта с портретом. */
export function NatalScreen({ onBack }: { onBack: () => void }) {
  const [people, setPeople] = useState(loadPeople)
  const [view, setView] = useState<View>(() => (loadPeople().length ? { kind: 'list' } : { kind: 'form' }))
  const refresh = () => setPeople(loadPeople())

  if (view.kind === 'form')
    return (
      <PersonForm
        person={view.person}
        firstSelf={!people.some((p) => p.self)}
        onSave={(p) => {
          refresh()
          setView({ kind: 'chart', person: p })
        }}
        onCancel={() => (people.length ? setView({ kind: 'list' }) : onBack())}
      />
    )
  // совместимость и натальный круг — только для людей с местом рождения
  const complete = people.filter(hasBirthplace)
  if (view.kind === 'synastry') return <SynastryView people={complete} onBack={() => setView({ kind: 'list' })} />
  if (view.kind === 'chart')
    return (
      <NatalChart
        person={view.person}
        onBack={() => setView({ kind: 'list' })}
        onEdit={() => setView({ kind: 'form', person: view.person })}
        onDelete={() => {
          deletePerson(view.person.id)
          refresh()
          setView(loadPeople().length ? { kind: 'list' } : { kind: 'form' })
        }}
      />
    )

  return (
    <section className="screen">
      <ScreenHead title="Натальные карты" onBack={onBack} />
      <p className="lede">Карта неба в момент рождения. Своя и тех, кто рядом.</p>
      <ul className="people">
        {people.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="person"
              onClick={() => {
                play('tap')
                setView(hasBirthplace(p) ? { kind: 'chart', person: p } : { kind: 'form', person: p })
              }}
            >
              <img className="person-sign" src={signEmblem(sunSign(p))} alt="" />
              <span className="person-name">
                {p.name}
                {p.self && <span className="self"> · это вы</span>}
              </span>
              <span className="person-meta">
                {fmtDate(p.date)}
                {hasBirthplace(p) ? (
                  <>
                    {p.time ? `, ${p.time}` : p.period ? `, ${PERIODS.find((x) => x.key === p.period)!.name.split(' ')[0]}` : ''} · {p.city}
                  </>
                ) : (
                  <span className="need"> · нужно место рождения</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="divider" aria-hidden="true" />
      <div className="actions">
        <button type="button" className="btn primary wide" onClick={() => setView({ kind: 'form' })}>
          Новая карта
        </button>
        {complete.length >= 2 && (
          <button
            type="button"
            className="btn wide"
            onClick={() => {
              play('tap')
              setView({ kind: 'synastry' })
            }}
          >
            Совместимость
          </button>
        )}
      </div>
    </section>
  )
}

export function PersonForm({ person, firstSelf, onSave, onCancel }: { person?: Person; firstSelf: boolean; onSave: (p: Person) => void; onCancel: () => void }) {
  const [name, setName] = useState(person?.name ?? '')
  const [date, setDate] = useState(person?.date ?? '')
  const [time, setTime] = useState(person?.time ?? '')
  // человек из матрицы судьбы: есть только имя и дата, время ещё не спрашивали
  const incomplete = !!person && !cityOf(person)
  const [noTime, setNoTime] = useState(person && !incomplete ? person.time === null : false)
  const [period, setPeriod] = useState<DayPeriod | undefined>(person?.period)
  const [query, setQuery] = useState(person?.city ?? '')
  const [city, setCity] = useState<City | undefined>(person ? cityOf(person) : undefined)
  const [self, setSelf] = useState(person?.self ?? firstSelf)
  const [error, setError] = useState('')
  const suggestions = useMemo(() => (city && city.name === query ? [] : findCities(query)), [query, city])
  const today = new Date().toISOString().slice(0, 10)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Как зовут человека?')
    if (!date || date < '1900-01-01' || date > today) return setError('Укажите дату рождения')
    if (!noTime && !time) return setError('Укажите время или отметьте «не знаю время»')
    if (!city) return setError('Выберите город из списка')
    play('tap')
    onSave(savePerson({ id: person?.id, name: name.trim(), date, time: noTime ? null : time, period: noTime ? period : undefined, city: city.name, region: city.region, self }))
  }

  return (
    <section className="screen">
      <ScreenHead title={incomplete ? 'Дополнить данные' : person ? 'Изменить данные' : 'Новая карта'} onBack={onCancel} />
      <p className="lede">{incomplete ? 'Для натальной карты нужно место рождения и, если знаете, время. Имя и дата уже есть.' : 'Чем точнее время рождения, тем точнее Асцендент и дома.'}</p>
      <form className="natal-form" onSubmit={submit} noValidate>
        <label>
          <span><span className="prompt">&gt;</span> имя</span>
          <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Как подписать карту" />
        </label>
        <label>
          <span><span className="prompt">&gt;</span> дата рождения</span>
          <input type="date" value={date} min="1900-01-01" max={today} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          <span><span className="prompt">&gt;</span> время рождения</span>
          <input type="time" value={time} disabled={noTime} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={noTime} onChange={(e) => setNoTime(e.target.checked)} />
          <span>не знаю точное время</span>
        </label>
        {noTime && (
          <div className="period">
            <span><span className="prompt">&gt;</span> примерно, если помните:</span>
            <div className="seg-row" role="group">
              <button type="button" aria-pressed={!period} onClick={() => setPeriod(undefined)}>
                не знаю
              </button>
              {PERIODS.map((p) => (
                <button key={p.key} type="button" aria-pressed={period === p.key} onClick={() => setPeriod(p.key)}>
                  {p.name.split(' ')[0]}
                </button>
              ))}
            </div>
            <span className="hint-small">Без точного времени не будет домов, но по части суток можно сузить Асцендент до нескольких знаков.</span>
          </div>
        )}
        <label className="city">
          <span><span className="prompt">&gt;</span> город рождения</span>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setCity(undefined)
            }}
            placeholder="Начните вводить: Казань"
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <ul className="suggest" role="listbox">
              {suggestions.map((c) => (
                <li key={`${c.name}-${c.region}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setCity(c)
                      setQuery(c.name)
                    }}
                  >
                    {c.name} <span>{c.region}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query && !city && suggestions.length === 0 && <span className="hint-small">Такого города нет в списке — выберите ближайший крупный.</span>}
        </label>
        <label className="check">
          <input type="checkbox" checked={self} onChange={(e) => setSelf(e.target.checked)} />
          <span>это моя карта</span>
        </label>
        {error && <p className="form-error">&gt; {error}</p>}
        <div className="actions">
          <button type="submit" className="btn primary wide">
            Построить карту
          </button>
        </div>
      </form>
    </section>
  )
}

function NatalChart({ person, onBack, onEdit, onDelete }: { person: Person; onBack: () => void; onEdit: () => void; onDelete: () => void }) {
  const city = cityOf(person)
  const chart = useMemo(() => chartOf(person), [person])
  const sections = useMemo(() => portrait(chart), [chart])
  const ascOptions = useMemo(() => (!person.time && person.period && city ? possibleAscendants(person.date, person.period, city.tz, city) : null), [person, city])
  // аркан судьбы — центр матрицы: та же карта, что в разделе «Матрица судьбы»
  const destiny = matrixOf(person.date).e
  const arcana = deckId(destiny)
  const [mode, setMode] = useState<'natal' | 'sky'>('natal')
  const sky = useMemo(() => (mode === 'sky' ? skyToday(chart) : null), [mode, chart])
  const overlay: Overlay | undefined = sky ? { kind: 'sky', planets: sky.chart.planets, aspects: sky.transits } : undefined
  const steps = useMemo(() => tourSteps(chart), [chart])
  const [step, setStep] = useState<number | null>(null)
  const [sharing, setSharing] = useState(false)
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const total = buildMs(chart.aspects.length)
  const [built, setBuilt] = useState(still)
  const [log, setLog] = useState<string[]>([])
  const [sel, setSel] = useState<Selection & { from?: 'planet' | 'house' | 'section' | 'point' | 'overlay'; section?: number }>({})

  // лог построения идёт в такт анимации круга
  useEffect(() => {
    const lines: [number, string][] = [[STAGE.signs, 'разметка зодиака: 12 знаков']]
    if (chart.angles) {
      lines.push([STAGE.axes, `горизонт: ASC ${fmtDeg(chart.angles.asc % 30)} ${SIGNS_GEN[Math.floor(chart.angles.asc / 30)]}`])
      lines.push([STAGE.houses, `дома: ${chart.angles.system === 'placidus' ? 'Плацидус' : 'Порфирий (полярные широты)'}`])
    } else lines.push([STAGE.axes, 'время неизвестно: без домов и Асцендента'])
    PLANETS.forEach((pl, i) => {
      const p = chart.planets.find((x) => x.key === pl.key)!
      lines.push([STAGE.planets + i * STAGE.planetStep, `${pl.name} · ${fmtDeg(p.deg)} ${SIGNS_GEN[p.sign]}${p.house ? ` · ${p.house} дом` : ''}${p.retro ? ' · R' : ''}`])
    })
    lines.push([planetsDone(), `связей найдено: ${chart.aspects.length}`])
    lines.push([total, 'карта собрана'])
    if (still) {
      setLog(lines.map((l) => l[1]))
      return
    }
    setLog([])
    const timers = lines.map(([at, text], i) =>
      setTimeout(() => {
        setLog((prev) => [...prev, text])
        if (i > 1 && i < PLANETS.length + 3) play('type')
      }, at),
    )
    timers.push(setTimeout(() => setBuilt(true), total))
    return () => timers.forEach(clearTimeout)
  }, [chart, total, still])

  const pickPlanet = (k: PlanetKey) => {
    play('tap')
    setSel((s) => (s.from === 'planet' && s.planets?.[0] === k ? {} : { planets: [k], from: 'planet' }))
  }
  const pickHouse = (n: number) => {
    play('tap')
    setSel((s) => (s.from === 'house' && s.houses?.[0] === n ? {} : { houses: [n], planets: chart.planets.filter((p) => p.house === n).map((p) => p.key), from: 'house' }))
  }

  const pickPoint = (k: PointKey) => {
    play('tap')
    setSel((s) => (s.from === 'point' && s.point === k ? {} : { point: k, from: 'point' }))
  }
  const pickOverlay = (k: PlanetKey) => {
    play('tap')
    setSel((s) => (s.from === 'overlay' && s.overlay === k ? {} : { overlay: k, from: 'overlay' }))
  }

  const share = async () => {
    if (sharing) return
    setSharing(true)
    play('tap')
    try {
      const main = mainAspect(chart)
      const link = main ? `${ASPECTS.find((a) => a.type === main.type)!.name}: ${planetName(main.a)} и ${planetName(main.b)}` : 'карта без тесных связей'
      await shareImage(await renderShare(chart, person.name, link), `nit-${person.name}.png`)
    } finally {
      setSharing(false)
    }
  }

  const touring = step !== null
  const tour = touring ? steps[step] : null
  const focus: Selection = tour ? tour.focus : sel

  const caption = (() => {
    if (sel.from === 'point' && sel.point) {
      const p = chart.points.find((x) => x.key === sel.point)!
      return {
        img: undefined,
        head: `${POINTS.find((x) => x.key === p.key)!.name} · ${fmtDeg(p.deg)} ${SIGNS_GEN[p.sign]}${p.house ? ` · ${p.house} дом` : ''}`,
        meaning: p.key === 'node' ? nodeMeaning(p) : lilithMeaning(p),
        body: '',
      }
    }
    if (sel.from === 'overlay' && sel.overlay && sky) {
      const p = sky.chart.planets.find((x) => x.key === sel.overlay)!
      const links = sky.transits.filter((a) => a.b === p.key)
      return {
        img: planetEmblem(p.key),
        head: `сейчас на небе: ${planetName(p.key)} · ${fmtDeg(p.deg)} ${SIGNS_GEN[p.sign]}${p.retro ? ' · ретроградный' : ''}`,
        meaning: sky.lines.find((l) => l.aspect?.b === p.key)?.text ?? 'Сейчас эта планета не задевает вашу карту напрямую.',
        body: links.length ? `связи с картой: ${links.map((a) => `${ASPECTS.find((x) => x.type === a.type)!.name} с ${PLANET_WITH[a.a]}`).join(', ')}` : '',
      }
    }
    if (sel.from === 'planet' && sel.planets) {
      const p = chart.planets.find((x) => x.key === sel.planets![0])!
      const links = chart.aspects
        .filter((a) => a.a === p.key || a.b === p.key)
        .map((a) => `${ASPECTS.find((x) => x.type === a.type)!.name} с ${PLANET_WITH[a.a === p.key ? a.b : a.a]}`)
      return {
        img: planetEmblem(p.key),
        head: `${planetName(p.key)} · ${fmtDeg(p.deg)} ${SIGNS_GEN[p.sign]}${p.house ? ` · ${p.house} дом (${HOUSE_SHORT[p.house - 1]})` : ''}${p.retro ? ' · ретроградный' : ''}`,
        meaning: planetMeaning(p),
        body: links.length ? `связи: ${links.join(', ')}` : 'без тесных связей с другими планетами',
      }
    }
    if (sel.from === 'house' && sel.houses) {
      const n = sel.houses[0]
      const inside = chart.planets.filter((p) => p.house === n)
      return {
        img: undefined,
        head: `${n} дом · ${HOUSE_SHORT[n - 1]}`,
        meaning: houseMeaning(n, inside),
        body: inside.length ? `здесь: ${inside.map((p) => planetName(p.key)).join(', ')}` : '',
      }
    }
    return null
  })()

  return (
    <section className="screen">
      <ScreenHead title={person.name} onBack={onBack} />
      <p className="lede">
        {fmtDate(person.date)}
        {person.time ? `, ${person.time}` : person.period ? `, ${PERIODS.find((x) => x.key === person.period)!.name}` : ', время неизвестно'} · {person.city}
      </p>
      {ascOptions && (
        <div className="asc-options">
          <span className="hint-small">возможный Асцендент:</span>
          <div className="trio">
            {ascOptions.map((s) => (
              <figure key={s}>
                <img src={signEmblem(s)} alt="" />
                <figcaption>
                  <b>{SIGNS[s]}</b>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
      {built && (
        <div className="seg-row mode" role="group" aria-label="Что показать на круге">
          <button
            type="button"
            aria-pressed={mode === 'natal'}
            onClick={() => {
              play('tap')
              setMode('natal')
              setSel({})
            }}
          >
            карта рождения
          </button>
          <button
            type="button"
            aria-pressed={mode === 'sky'}
            onClick={() => {
              play('flip')
              setMode('sky')
              setSel({})
              setStep(null)
            }}
          >
            небо сегодня
          </button>
        </div>
      )}
      <div className={touring ? 'wheel-wrap zoomable' : 'wheel-wrap'}>
        <Wheel
          chart={chart}
          focus={focus}
          onPlanet={pickPlanet}
          onHouse={pickHouse}
          onPoint={pickPoint}
          onOverlay={pickOverlay}
          instant={still}
          overlay={overlay}
          zoom={tour ? tour.zoom : null}
        />
      </div>
      {tour ? (
        <div className="tour reading" aria-live="polite">
          <h2>
            &gt; {tour.title} <span className="tour-count">{step! + 1}/{steps.length}</span>
          </h2>
          <p className="text">{tour.text}</p>
          <div className="tour-nav">
            <button type="button" className="btn" disabled={step === 0} onClick={() => setStep((n) => Math.max(0, n! - 1))}>
              ←
            </button>
            <button type="button" className="btn" onClick={() => setStep(null)}>
              Закрыть
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                play('type')
                setStep((n) => (n! + 1 < steps.length ? n! + 1 : null))
              }}
            >
              {step! + 1 < steps.length ? '→' : 'Готово'}
            </button>
          </div>
        </div>
      ) : (
      <div className="wheel-caption" aria-live="polite">
        {caption ? (
          <>
            {caption.img && <img className="cap-img" src={caption.img} alt="" />}
            <div>
              <p className="cap-head">&gt; {caption.head}</p>
              <p className="cap-meaning">{caption.meaning}</p>
              {caption.body && <p className="cap-body">{caption.body}</p>}
            </div>
          </>
        ) : (
          <p className="cap-body">{built ? (mode === 'sky' ? 'внутреннее кольцо — планеты сейчас; нити — их связи с вашей картой' : 'коснитесь планеты или дома, чтобы увидеть связи') : ' '}</p>
        )}
      </div>
      )}
      {built && !touring && mode === 'natal' && (
        <div className="seg-row tools">
          <button
            type="button"
            onClick={() => {
              play('flip')
              setSel({})
              setStep(0)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            экскурсия по карте
          </button>
          <button type="button" onClick={share} disabled={sharing}>
            {sharing ? 'рисую…' : 'поделиться'}
          </button>
        </div>
      )}
      {sky && (
        <div className="reading sky">
          <h2>&gt; небо сегодня</h2>
          {sky.lines.map((l, i) => (
            <p key={i} className="text">
              {l.text}
            </p>
          ))}
        </div>
      )}
      <div className="reading natal-log" aria-hidden="true">
        <div className="log">
          {log.map((l, i) => (
            <p key={i}>
              <span className="prompt">&gt;</span> {l}
            </p>
          ))}
          {!built && (
            <p>
              <span className="prompt">&gt;</span> <span className="blink">_</span>
            </p>
          )}
        </div>
      </div>
      {built && (
        <div className="readings portrait">
          {sections.map((s, i) => (
            <article
              key={s.title}
              className={sel.from === 'section' && sel.section === i ? 'reading portrait-part on' : 'reading portrait-part'}
              style={{ animationDelay: `${i * 140}ms` }}
              onClick={() => {
                play('tap')
                setSel(sel.from === 'section' && sel.section === i ? {} : { ...s.focus, from: 'section', section: i })
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              <h2>&gt; {s.title}</h2>
              {i === 0 && (
                <div className="trio" aria-hidden="true">
                  {(
                    [
                      ['Солнце', chart.planets[0].sign],
                      ['Луна', chart.planets[1].sign],
                      ...(chart.angles ? [['Асцендент', Math.floor(chart.angles.asc / 30)] as const] : []),
                    ] as const
                  ).map(([label, sign]) => (
                    <figure key={label}>
                      <img src={signEmblem(sign)} alt="" />
                      <figcaption>
                        {label}
                        <br />
                        <b>{SIGNS[sign]}</b>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              )}
              {s.title.startsWith('стихии') && <Elements chart={chart} />}
              {s.text.split('\n\n').map((t, k) => (
                <p key={k} className="text">
                  {t}
                </p>
              ))}
            </article>
          ))}
          <article className="reading portrait-part arcana">
            <h2>&gt; аркан судьбы</h2>
            <div className="arcana-row">
              <div className="arcana-card">
                <PixelCard id={hasArt(arcana) ? arcana : null} label={`${DECK[arcana].numeral} · ${DECK[arcana].name}`} />
              </div>
              <div>
                <p className="arcana-name">
                  {destiny} · {ARCANA[destiny].name}
                </p>
                <p className="hint-small">центр вашей матрицы судьбы · {ARCANA[destiny].key}{hasArt(arcana) ? '' : ' · рисунок этой карты ещё в работе'}</p>
              </div>
            </div>
            <p className="text">{ARCANA[destiny].plus}</p>
            <p className="text">Это ваша карта-спутник в колоде «Нить». Если она выпадет в раскладе, отнеситесь к ней особенно внимательно: она говорит о вас самих. Подробнее — в разделе «Матрица судьбы».</p>
          </article>
          {!person.time && <p className="hint-small">Без точного времени рождения карта неполная: нет домов, Асцендент неизвестен, а положение Луны примерное.</p>}
        </div>
      )}
      <div className="divider" aria-hidden="true" />
      <div className="actions">
        <button type="button" className="btn wide" onClick={onEdit}>
          Изменить данные
        </button>
      </div>
      <button
        type="button"
        className="link-danger"
        onClick={() => {
          if (window.confirm(`Удалить карту «${person.name}»?`)) onDelete()
        }}
      >
        удалить карту
      </button>
    </section>
  )
}

/** Знак Солнца человека: для эмблемы в списке. Без времени берём полдень — знак Солнца от этого почти не зависит. */
function sunSign(p: Person): number {
  return chartOf(p).planets[0].sign
}

const ELEMENTS: { key: Element; name: string }[] = [
  { key: 'fire', name: 'огонь' },
  { key: 'earth', name: 'земля' },
  { key: 'air', name: 'воздух' },
  { key: 'water', name: 'вода' },
]
const SEGMENTS = 20

/** Баланс стихий пиксельными полосками: каждая клетка — 5% карты. */
function Elements({ chart }: { chart: Chart }) {
  const balance = elementBalance(chart)
  const total = ELEMENTS.reduce((sum, e) => sum + balance[e.key], 0)
  return (
    <div className="elements" aria-label="Баланс стихий">
      {ELEMENTS.map((e, row) => {
        const share = balance[e.key] / total
        const filled = Math.round(share * SEGMENTS)
        return (
          <div key={e.key} className={`el-row el-${e.key}`}>
            <span className="el-name">{e.name}</span>
            <span className="el-bar" aria-hidden="true">
              {Array.from({ length: SEGMENTS }, (_, i) => (
                <i key={i} className={i < filled ? 'on' : undefined} style={{ animationDelay: `${row * 120 + i * 40}ms` }} />
              ))}
            </span>
            <span className="el-pct">{Math.round(share * 100)}%</span>
          </div>
        )
      })}
    </div>
  )
}
