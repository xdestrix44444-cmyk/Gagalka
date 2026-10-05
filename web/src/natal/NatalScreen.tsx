import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { play } from '../sound'
import { ASPECTS, PLANETS, SIGNS_GEN, computeChart, localToUtc, type PlanetKey } from './chart'
import { findCities, type City } from './cities'
import { cityOf, deletePerson, loadPeople, savePerson, type Person } from './people'
import { portrait } from './portrait'
import { STAGE, Wheel, buildMs, planetsDone, type Selection } from './Wheel'

const HOUSE_SHORT = ['личность', 'ресурсы', 'общение', 'дом и корни', 'творчество и любовь', 'работа и здоровье', 'партнёрство', 'глубина и кризисы', 'смысл и дорога', 'призвание', 'друзья и будущее', 'уединение']

const fmtDeg = (deg: number) => `${Math.floor(deg)}°${String(Math.floor((deg % 1) * 60)).padStart(2, '0')}′`
const planetName = (k: PlanetKey) => PLANETS.find((p) => p.key === k)!.name
/** Творительный падеж для подписи связей: «трин с Юпитером». */
const PLANET_WITH: Record<PlanetKey, string> = { sun: 'Солнцем', moon: 'Луной', mercury: 'Меркурием', venus: 'Венерой', mars: 'Марсом', jupiter: 'Юпитером', saturn: 'Сатурном', uranus: 'Ураном', neptune: 'Нептуном', pluto: 'Плутоном' }
const fmtDate = (d: string) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${d}T12:00:00`))

type View = { kind: 'list' } | { kind: 'form'; person?: Person } | { kind: 'chart'; person: Person }

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
      <h1 className="title">
        <span className="gem" aria-hidden="true" />
        Натальные карты
        <span className="gem" aria-hidden="true" />
      </h1>
      <p className="lede">Карта неба в момент рождения. Своя и тех, кто рядом.</p>
      <ul className="people">
        {people.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="person"
              onClick={() => {
                play('tap')
                setView({ kind: 'chart', person: p })
              }}
            >
              <span className="person-name">
                {p.name}
                {p.self && <span className="self"> · это вы</span>}
              </span>
              <span className="person-meta">
                {fmtDate(p.date)}
                {p.time ? `, ${p.time}` : ''} · {p.city}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="divider" aria-hidden="true" />
      <div className="actions">
        <button type="button" className="btn primary" onClick={() => setView({ kind: 'form' })}>
          Новая карта
        </button>
        <button type="button" className="btn" onClick={onBack}>
          Назад
        </button>
      </div>
    </section>
  )
}

function PersonForm({ person, firstSelf, onSave, onCancel }: { person?: Person; firstSelf: boolean; onSave: (p: Person) => void; onCancel: () => void }) {
  const [name, setName] = useState(person?.name ?? '')
  const [date, setDate] = useState(person?.date ?? '')
  const [time, setTime] = useState(person?.time ?? '')
  const [noTime, setNoTime] = useState(person ? person.time === null : false)
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
    onSave(savePerson({ id: person?.id, name: name.trim(), date, time: noTime ? null : time, city: city.name, region: city.region, self }))
  }

  return (
    <section className="screen">
      <h1 className="title">
        <span className="gem" aria-hidden="true" />
        {person ? 'Изменить данные' : 'Новая карта'}
        <span className="gem" aria-hidden="true" />
      </h1>
      <p className="lede">Чем точнее время рождения, тем точнее Асцендент и дома.</p>
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
          <span>не знаю время — построить без Асцендента и домов</span>
        </label>
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
          <button type="submit" className="btn primary">
            Построить
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            Отмена
          </button>
        </div>
      </form>
    </section>
  )
}

function NatalChart({ person, onBack, onEdit, onDelete }: { person: Person; onBack: () => void; onEdit: () => void; onDelete: () => void }) {
  const city = cityOf(person)
  const chart = useMemo(() => {
    // без времени берём полдень: Луна может сдвинуться на несколько градусов, остальное почти не меняется
    const utc = localToUtc(person.date, person.time ?? '12:00', city?.tz ?? 'Europe/Moscow')
    return computeChart(utc, person.time && city ? city : undefined)
  }, [person, city])
  const sections = useMemo(() => portrait(chart), [chart])
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const total = buildMs(chart.aspects.length)
  const [built, setBuilt] = useState(still)
  const [log, setLog] = useState<string[]>([])
  const [sel, setSel] = useState<Selection & { from?: 'planet' | 'house' | 'section'; section?: number }>({})

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

  const caption = (() => {
    if (sel.from === 'planet' && sel.planets) {
      const p = chart.planets.find((x) => x.key === sel.planets![0])!
      const links = chart.aspects
        .filter((a) => a.a === p.key || a.b === p.key)
        .map((a) => `${ASPECTS.find((x) => x.type === a.type)!.name} с ${PLANET_WITH[a.a === p.key ? a.b : a.a]}`)
      return {
        head: `${planetName(p.key)} · ${fmtDeg(p.deg)} ${SIGNS_GEN[p.sign]}${p.house ? ` · ${p.house} дом (${HOUSE_SHORT[p.house - 1]})` : ''}${p.retro ? ' · ретроградный' : ''}`,
        body: links.length ? `связи: ${links.join(', ')}` : 'без тесных связей с другими планетами',
      }
    }
    if (sel.from === 'house' && sel.houses) {
      const n = sel.houses[0]
      const inside = chart.planets.filter((p) => p.house === n).map((p) => planetName(p.key))
      return { head: `${n} дом · ${HOUSE_SHORT[n - 1]}`, body: inside.length ? `здесь: ${inside.join(', ')}` : 'планет здесь нет: эта сфера живёт спокойно и не требует постоянного внимания' }
    }
    return null
  })()

  return (
    <section className="screen">
      <h1 className="title">
        <span className="gem" aria-hidden="true" />
        {person.name}
        <span className="gem" aria-hidden="true" />
      </h1>
      <p className="lede">
        {fmtDate(person.date)}
        {person.time ? `, ${person.time}` : ', время неизвестно'} · {person.city}
      </p>
      <div className="wheel-wrap">
        <Wheel chart={chart} focus={sel} onPlanet={pickPlanet} onHouse={pickHouse} instant={still} />
      </div>
      <div className="wheel-caption" aria-live="polite">
        {caption ? (
          <>
            <p className="cap-head">&gt; {caption.head}</p>
            <p className="cap-body">{caption.body}</p>
          </>
        ) : (
          <p className="cap-body">{built ? 'коснитесь планеты или дома, чтобы увидеть связи' : ' '}</p>
        )}
      </div>
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
              {s.text.split('\n\n').map((t, k) => (
                <p key={k} className="text">
                  {t}
                </p>
              ))}
            </article>
          ))}
          {!person.time && <p className="hint-small">Без времени рождения карта неполная: нет Асцендента и домов, а положение Луны примерное.</p>}
        </div>
      )}
      <div className="divider" aria-hidden="true" />
      <div className="actions three-btn">
        <button type="button" className="btn" onClick={onEdit}>
          Изменить
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            if (window.confirm(`Удалить карту «${person.name}»?`)) onDelete()
          }}
        >
          Удалить
        </button>
        <button type="button" className="btn primary" onClick={onBack}>
          К списку
        </button>
      </div>
    </section>
  )
}
