import { useMemo, useState } from 'react'
import { ScreenHead } from '../ui/ScreenHead'
import { play } from '../sound'
import { ASPECTS, PLANETS, SIGNS_GEN, type PlanetKey } from './chart'
import { planetEmblem, signEmblem } from './emblems'
import { chartOf, type Person } from './people'
import { synastry } from './relations'
import { Wheel, buildMs, type Selection } from './Wheel'

const planetName = (k: PlanetKey) => PLANETS.find((p) => p.key === k)!.name
const INSTR: Record<PlanetKey, string> = { sun: 'Солнцем', moon: 'Луной', mercury: 'Меркурием', venus: 'Венерой', mars: 'Марсом', jupiter: 'Юпитером', saturn: 'Сатурном', uranus: 'Ураном', neptune: 'Нептуном', pluto: 'Плутоном' }
const fmtDeg = (deg: number) => `${Math.floor(deg)}°${String(Math.floor((deg % 1) * 60)).padStart(2, '0')}′`

/** Совместимость: карта A снаружи, планеты B на внутреннем кольце, нити — связи между ними. */
export function SynastryView({ people, onBack }: { people: Person[]; onBack: () => void }) {
  const [aId, setAId] = useState(people[0].id)
  const [bId, setBId] = useState(people[1].id)
  const A = people.find((p) => p.id === aId)!
  const B = people.find((p) => p.id === bId)!
  const ca = useMemo(() => chartOf(A), [A])
  const cb = useMemo(() => chartOf(B), [B])
  const syn = useMemo(() => synastry(ca, cb, A.name, B.name), [ca, cb, A.name, B.name])
  const [sel, setSel] = useState<Selection & { from?: 'a' | 'b' }>({})
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

  const pick = (who: 'a' | 'b', k: PlanetKey) => {
    play('tap')
    setSel((s) => (s.from === who && (who === 'a' ? s.planets?.[0] : s.overlay) === k ? {} : who === 'a' ? { planets: [k], from: 'a' } : { overlay: k, from: 'b' }))
  }

  const caption = (() => {
    if (!sel.from) return null
    const who = sel.from === 'a' ? A : B
    const k = (sel.from === 'a' ? sel.planets![0] : sel.overlay)!
    const p = (sel.from === 'a' ? ca : cb).planets.find((x) => x.key === k)!
    const links = syn.cross.filter((x) => (sel.from === 'a' ? x.a === k : x.b === k))
    return {
      img: planetEmblem(k),
      head: `${who.name}: ${planetName(k)} · ${fmtDeg(p.deg)} ${SIGNS_GEN[p.sign]}`,
      body: links.length
        ? links.map((x) => `${ASPECTS.find((a) => a.type === x.type)!.name} с ${INSTR[sel.from === 'a' ? x.b : x.a]} (${sel.from === 'a' ? B.name : A.name})`).join(', ')
        : 'с планетами второго человека тесных связей нет',
    }
  })()

  const swap = () => {
    play('flip')
    setAId(bId)
    setBId(aId)
    setSel({})
  }

  return (
    <section className="screen">
      <ScreenHead title="Совместимость" onBack={onBack} />
      <div className="pair">
        <PersonPick people={people} value={aId} other={bId} onChange={(id) => (setAId(id), setSel({}))} label="снаружи" />
        <button type="button" className="swap" onClick={swap} aria-label="Поменять местами">
          ⇄
        </button>
        <PersonPick people={people} value={bId} other={aId} onChange={(id) => (setBId(id), setSel({}))} label="внутри" />
      </div>
      <p className="lede">
        Внешний круг — {A.name}, внутреннее кольцо — {B.name}. Нити между ними — связи двух карт.
      </p>
      <div className="wheel-wrap">
        <Wheel
          key={`${aId}-${bId}`}
          chart={ca}
          focus={sel}
          onPlanet={(k) => pick('a', k)}
          onHouse={() => {}}
          onOverlay={(k) => pick('b', k)}
          instant={still}
          overlay={{ kind: 'partner', planets: cb.planets, aspects: syn.cross }}
          overlayDelay={still ? 0 : buildMs(ca.aspects.length) - 600}
        />
      </div>
      <div className="wheel-caption" aria-live="polite">
        {caption ? (
          <>
            <img className="cap-img" src={caption.img} alt="" />
            <div>
              <p className="cap-head">&gt; {caption.head}</p>
              <p className="cap-body">{caption.body}</p>
            </div>
          </>
        ) : (
          <p className="cap-body">коснитесь планеты снаружи или внутри, чтобы увидеть её нити</p>
        )}
      </div>
      <div className="readings portrait">
        {syn.sections.map((s, i) => (
          <article
            key={`${aId}-${bId}-${s.title}`}
            className="reading portrait-part"
            style={{ animationDelay: `${i * 140}ms` }}
            onClick={() => {
              if (!s.focus.planets?.length) return
              play('tap')
              setSel({ planets: [s.focus.planets[0]], from: 'a' })
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
        {(!A.time || !B.time) && <p className="hint-small">Если у кого-то неизвестно время рождения, положение Луны примерное — учитывайте это в разделе «солнце и луна».</p>}
      </div>
    </section>
  )
}

function PersonPick({ people, value, other, onChange, label }: { people: Person[]; value: string; other: string; onChange: (id: string) => void; label: string }) {
  const p = people.find((x) => x.id === value)!
  return (
    <label className="person-pick">
      <img src={signEmblem(chartOf(p).planets[0].sign)} alt="" />
      <span className="hint-small">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {people
          .filter((x) => x.id !== other)
          .map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
      </select>
    </label>
  )
}
