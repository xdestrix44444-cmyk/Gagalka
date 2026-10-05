import type { CSSProperties } from 'react'
import { ASPECTS, PLANETS, SIGN_GLYPHS, arc, norm, type Chart, type PlanetKey } from './chart'

/** Тайминги построения круга, мс; лог в NatalChart идёт по тем же отметкам. */
export const STAGE = { signs: 0, axes: 900, houses: 1300, planets: 2100, planetStep: 170, aspectStep: 110 }
export const planetsDone = () => STAGE.planets + PLANETS.length * STAGE.planetStep
export const buildMs = (aspects: number) => planetsDone() + Math.min(aspects, 20) * STAGE.aspectStep + 300

const C = 160
const R_SIGN_OUT = 154
const R_SIGN_IN = 132
const R_PLANET = 113
const R_HOUSE_NUM = 50
const R_ASPECT = 92

export interface Selection {
  planets?: PlanetKey[]
  houses?: number[]
}

interface Props {
  chart: Chart
  /** Что подсвечено: выбранная планета, дом или раздел портрета. */
  focus: Selection
  onPlanet: (k: PlanetKey) => void
  onHouse: (n: number) => void
  /** Анимация построения уже была показана: рисуем сразу. */
  instant: boolean
}

/** Натальный круг: Асцендент слева, знаки против часовой стрелки, как в классической карте. */
export function Wheel({ chart, focus, onPlanet, onHouse, instant }: Props) {
  // точка отсчёта: Асцендент; без времени — начало знака Солнца
  const start = chart.angles?.asc ?? Math.floor(chart.planets[0].lon / 30) * 30
  const pt = (lon: number, r: number) => {
    const t = ((180 + lon - start) * Math.PI) / 180
    return [C + r * Math.cos(t), C - r * Math.sin(t)] as const
  }
  const line = (lon: number, r1: number, r2: number) => {
    const [x1, y1] = pt(lon, r1)
    const [x2, y2] = pt(lon, r2)
    return `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`
  }
  /** Сектор кольца от a до b (по знакам) между радиусами. */
  const sector = (a: number, b: number, r1: number, r2: number) => {
    const span = arc(a, b)
    const large = span > 180 ? 1 : 0
    const [x1, y1] = pt(a, r2)
    const [x2, y2] = pt(b, r2)
    const [x3, y3] = pt(b, r1)
    const [x4, y4] = pt(a, r1)
    // по знакам — против часовой стрелки на экране, это sweep=0
    return `M${x1} ${y1}A${r2} ${r2} 0 ${large} 0 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 ${large} 1 ${x4} ${y4}Z`
  }
  const delay = (ms: number) => ({ animationDelay: `${ms}ms` }) as CSSProperties

  // планеты, стоящие слишком близко, раздвигаем по кругу, чтобы значки не налезали
  const placed = [...chart.planets].sort((a, b) => a.lon - b.lon).map((p) => ({ key: p.key, lon: p.lon, at: p.lon }))
  for (let pass = 0; pass < 8; pass++)
    for (let i = 0; i < placed.length; i++) {
      const a = placed[i]
      const b = placed[(i + 1) % placed.length]
      const gap = arc(a.at, b.at)
      if (gap < 9) {
        a.at = norm(a.at - (9 - gap) / 2)
        b.at = norm(b.at + (9 - gap) / 2)
      }
    }
  const atOf = (k: PlanetKey) => placed.find((p) => p.key === k)!.at
  const lonOf = (k: PlanetKey) => chart.planets.find((p) => p.key === k)!.lon

  const hasFocus = !!(focus.planets?.length || focus.houses?.length)
  const lit = (k: PlanetKey) => !hasFocus || !!focus.planets?.includes(k)
  const aspects = chart.aspects.slice(0, 20)

  return (
    <svg className={instant ? 'wheel instant' : 'wheel'} viewBox="0 0 320 320" role="img" aria-label="Натальная карта">
      <circle className="w-ring" cx={C} cy={C} r={R_SIGN_OUT} />
      <circle className="w-ring" cx={C} cy={C} r={R_SIGN_IN} />
      <circle className="w-ring dim" cx={C} cy={C} r={R_ASPECT + 4} />

      {/* знаки зодиака */}
      {SIGN_GLYPHS.map((g, i) => {
        const [x, y] = pt(i * 30 + 15, (R_SIGN_OUT + R_SIGN_IN) / 2)
        return (
          <g key={i} className={`w-sign el-${i % 4}`} style={delay(STAGE.signs + i * 70)}>
            <path className="w-tick" d={line(i * 30, R_SIGN_IN, R_SIGN_OUT)} pathLength={1} />
            <text x={x} y={y} className="w-glyph">
              {g}
            </text>
          </g>
        )
      })}

      {/* дома: секторы для касания и подсветки, линии куспид, номера */}
      {chart.angles &&
        chart.angles.cusps.map((c, i) => {
          const next = chart.angles!.cusps[(i + 1) % 12]
          const mid = norm(c + arc(c, next) / 2)
          const [nx, ny] = pt(mid, R_HOUSE_NUM)
          const n = i + 1
          const on = !!focus.houses?.includes(n)
          return (
            <g key={i} className={on ? 'w-house on' : 'w-house'} style={delay(STAGE.houses + i * 60)} onClick={() => onHouse(n)}>
              <path className="w-house-area" d={sector(c, next, 26, R_SIGN_IN)} />
              {i % 3 !== 0 && <path className="w-cusp" d={line(c, 26, R_SIGN_IN)} pathLength={1} />}
              <text x={nx} y={ny} className="w-house-num">
                {n}
              </text>
            </g>
          )
        })}

      {/* оси: Асцендент — Десцендент и MC — IC */}
      {chart.angles && (
        <g className="w-axes" style={delay(STAGE.axes)}>
          <path className="w-axis" d={line(chart.angles.asc, 0, R_SIGN_OUT + 4)} pathLength={1} />
          <path className="w-axis" d={line(chart.angles.asc + 180, 0, R_SIGN_OUT + 4)} pathLength={1} />
          <path className="w-axis" d={line(chart.angles.mc, 0, R_SIGN_OUT + 4)} pathLength={1} />
          <path className="w-axis" d={line(chart.angles.mc + 180, 0, R_SIGN_OUT + 4)} pathLength={1} />
          {(
            [
              ['ASC', chart.angles.asc],
              ['DSC', chart.angles.asc + 180],
              ['MC', chart.angles.mc],
              ['IC', chart.angles.mc + 180],
            ] as const
          ).map(([label, lon]) => {
            const [x, y] = pt(lon, R_SIGN_OUT + 0.5)
            return (
              <text key={label} x={x} y={y} className="w-axis-label">
                {label}
              </text>
            )
          })}
        </g>
      )}

      {/* аспекты */}
      {aspects.map((a, i) => {
        const type = ASPECTS.find((x) => x.type === a.type)!
        const [x1, y1] = pt(lonOf(a.a), R_ASPECT)
        const [x2, y2] = pt(lonOf(a.b), R_ASPECT)
        const on = hasFocus && !!focus.planets?.includes(a.a) && (focus.planets.length === 1 || focus.planets.includes(a.b))
        const off = hasFocus && !on
        return (
          <path
            key={`${a.a}-${a.b}-${a.type}`}
            className={`w-aspect ${a.type}${on ? ' on' : ''}${off ? ' off' : ''}`}
            d={`M${x1} ${y1}L${x2} ${y2}`}
            pathLength={1}
            style={delay(planetsDone() + i * STAGE.aspectStep)}
          >
            <title>{type.name}</title>
          </path>
        )
      })}

      {/* планеты: значок на кольце и метка точного положения у внутреннего края */}
      {PLANETS.map((pl, i) => {
        const p = chart.planets.find((x) => x.key === pl.key)!
        const [x, y] = pt(atOf(pl.key), R_PLANET)
        const [tx, ty] = pt(p.lon, R_SIGN_IN)
        const [ix, iy] = pt(p.lon, R_ASPECT)
        const cls = `w-planet${lit(pl.key) ? '' : ' off'}${focus.planets?.length === 1 && focus.planets[0] === pl.key ? ' sel' : ''}`
        return (
          <g key={pl.key} className={cls} style={{ ...delay(STAGE.planets + i * STAGE.planetStep), '--dx': `${C - x}px`, '--dy': `${C - y}px` } as CSSProperties} onClick={() => onPlanet(pl.key)}>
            <path className="w-planet-tick" d={`M${tx} ${ty}L${pt(p.lon, R_SIGN_IN - 5)[0]} ${pt(p.lon, R_SIGN_IN - 5)[1]}`} />
            <circle className="w-planet-dot" cx={ix} cy={iy} r={1.6} />
            <circle className="w-planet-hit" cx={x} cy={y} r={10} />
            <text x={x} y={y} className="w-planet-glyph">
              {pl.glyph + '︎'}
            </text>
            {p.retro && (
              <text x={x + 7} y={y + 7} className="w-retro">
                R
              </text>
            )}
          </g>
        )
      })}
      <circle className="w-core" cx={C} cy={C} r={3} />
    </svg>
  )
}
