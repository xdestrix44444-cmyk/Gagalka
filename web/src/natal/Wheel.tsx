import type { CSSProperties } from 'react'
import { ASPECTS, PLANETS, POINTS, SIGNS, arc, norm, type Chart, type CrossAspect, type PlanetKey, type PlanetPos, type PointKey } from './chart'
import { planetEmblem, signEmblem } from './emblems'

/** Тайминги построения круга, мс; лог в NatalChart идёт по тем же отметкам. */
export const STAGE = { signs: 0, axes: 900, houses: 1300, planets: 2100, planetStep: 170, aspectStep: 110 }
export const planetsDone = () => STAGE.planets + PLANETS.length * STAGE.planetStep
export const buildMs = (aspects: number) => planetsDone() + Math.min(aspects, 20) * STAGE.aspectStep + 300

const C = 160
const R_SIGN_OUT = 157
const R_SIGN_IN = 127
const R_PLANET = 105
const R_HOUSE_NUM = 46
const R_ASPECT = 83
/** Узел и Лилит: между кольцом аспектов и планетами. */
const R_POINT = 93
/** Второе кольцо внутри: небо сегодня или планеты партнёра. */
const R_OVER = 62
const OVER_SIZE = 15
/** Размер эмблем на круге, единицы viewBox (круг 320). */
const SIGN_SIZE = 25
const PLANET_SIZE = 23
/** Минимальный зазор между эмблемами планет по кругу, градусы. */
const PLANET_GAP = 12.5

export interface Selection {
  planets?: PlanetKey[]
  houses?: number[]
  /** Выбранная точка: узел или Лилит. */
  point?: PointKey
  /** Выбранная планета второго кольца. */
  overlay?: PlanetKey
}

/** Второе кольцо: планеты неба сейчас или планеты другого человека и их связи с картой. */
export interface Overlay {
  kind: 'sky' | 'partner'
  planets: PlanetPos[]
  /** a — планета карты, b — планета второго кольца. */
  aspects: CrossAspect[]
}

/** Раздвигает значки, стоящие слишком близко по кругу. */
function spread(list: { key: PlanetKey; lon: number }[], gap: number): Map<PlanetKey, number> {
  const placed = [...list].sort((a, b) => a.lon - b.lon).map((p) => ({ key: p.key, at: p.lon }))
  for (let pass = 0; pass < 8; pass++)
    for (let i = 0; i < placed.length; i++) {
      const a = placed[i]
      const b = placed[(i + 1) % placed.length]
      const d = arc(a.at, b.at)
      if (d < gap) {
        a.at = norm(a.at - (gap - d) / 2)
        b.at = norm(b.at + (gap - d) / 2)
      }
    }
  return new Map(placed.map((p) => [p.key, p.at]))
}

interface Props {
  chart: Chart
  /** Что подсвечено: выбранная планета, дом или раздел портрета. */
  focus: Selection
  onPlanet: (k: PlanetKey) => void
  onHouse: (n: number) => void
  onPoint?: (k: PointKey) => void
  onOverlay?: (k: PlanetKey) => void
  /** Анимация построения уже была показана: рисуем сразу. */
  instant: boolean
  overlay?: Overlay
  /** Задержка появления второго кольца, мс (после построения круга — 0). */
  overlayDelay?: number
  /** Долгота, к которой приближает экскурсия; null — весь круг. */
  zoom?: number | null
}

/** Натальный круг: Асцендент слева, знаки против часовой стрелки, как в классической карте. */
export function Wheel({ chart, focus, onPlanet, onHouse, onPoint, onOverlay, instant, overlay, overlayDelay = 0, zoom = null }: Props) {
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

  const placed = spread(chart.planets, PLANET_GAP)
  const atOf = (k: PlanetKey) => placed.get(k)!
  const lonOf = (k: PlanetKey) => chart.planets.find((p) => p.key === k)!.lon
  const overPlaced = overlay ? spread(overlay.planets, 19) : null
  const overLon = (k: PlanetKey) => overlay!.planets.find((p) => p.key === k)!.lon

  const hasFocus = !!(focus.planets?.length || focus.houses?.length || focus.point || focus.overlay)
  const lit = (k: PlanetKey) => !hasFocus || !!focus.planets?.includes(k)
  const aspects = chart.aspects.slice(0, 20)
  const [zx, zy] = zoom === null ? [C, C] : pt(zoom, R_PLANET)
  const zoomStyle: CSSProperties = zoom === null ? { transform: 'none' } : { transform: 'scale(1.8)', transformOrigin: `${((zx + 10) / 340) * 100}% ${((zy + 10) / 340) * 100}%` }

  return (
    <svg className={`wheel${instant ? ' instant' : ''}${overlay ? ' has-overlay' : ''}`} viewBox="-10 -10 340 340" role="img" aria-label="Натальная карта" style={zoomStyle}>
      <circle className="w-ring" cx={C} cy={C} r={R_SIGN_OUT} />
      <circle className="w-ring" cx={C} cy={C} r={R_SIGN_IN} />
      <circle className="w-ring dim" cx={C} cy={C} r={R_ASPECT + 4} />

      {/* знаки зодиака */}
      {SIGNS.map((name, i) => {
        const [x, y] = pt(i * 30 + 15, (R_SIGN_OUT + R_SIGN_IN) / 2)
        return (
          <g key={i} className={`w-sign el-${i % 4}`} style={delay(STAGE.signs + i * 70)}>
            <path className="w-tick" d={line(i * 30, R_SIGN_IN, R_SIGN_OUT)} pathLength={1} />
            <image href={signEmblem(i)} x={x - SIGN_SIZE / 2} y={y - SIGN_SIZE / 2} width={SIGN_SIZE} height={SIGN_SIZE} className="w-emblem">
              <title>{name}</title>
            </image>
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
            <circle className="w-planet-hit" cx={x} cy={y} r={PLANET_SIZE / 2 + 1} />
            <image href={planetEmblem(pl.key)} x={x - PLANET_SIZE / 2} y={y - PLANET_SIZE / 2} width={PLANET_SIZE} height={PLANET_SIZE} className="w-emblem w-planet-img">
              <title>{pl.name}</title>
            </image>
            {p.retro && (
              <text x={x + 9} y={y + 10} className="w-retro">
                R
              </text>
            )}
          </g>
        )
      })}
      {/* узел и Лилит: маленькие отметки между кольцом аспектов и планетами */}
      {chart.points.map((p, i) => {
        const meta = POINTS.find((x) => x.key === p.key)!
        const [x, y] = pt(p.lon, R_POINT)
        const sel = focus.point === p.key
        return (
          <g key={p.key} className={`w-point ${p.key}${sel ? ' sel' : ''}${hasFocus && !sel ? ' off' : ''}`} style={delay(planetsDone() + 200 + i * 150)} onClick={() => onPoint?.(p.key)}>
            <circle className="w-point-hit" cx={x} cy={y} r={7} />
            <text x={x} y={y} className="w-point-glyph">
              {meta.glyph + '\uFE0E'}
            </text>
            <title>{meta.name}</title>
          </g>
        )
      })}

      {/* второе кольцо: небо сегодня или партнёр, и нити от его планет к планетам карты */}
      {overlay && (
        <g className={`w-overlay ${overlay.kind}`}>
          <circle className="w-over-ring" cx={C} cy={C} r={R_OVER} />
          {overlay.aspects.slice(0, 16).map((a, i) => {
            const [x1, y1] = pt(overLon(a.b), R_OVER)
            const [x2, y2] = pt(lonOf(a.a), R_ASPECT)
            const on = focus.overlay ? focus.overlay === a.b : focus.planets?.length === 1 ? focus.planets[0] === a.a : false
            const off = hasFocus && !on
            return (
              <path
                key={`${a.a}-${a.b}-${a.type}`}
                className={`w-thread ${a.type}${on ? ' on' : ''}${off ? ' off' : ''}`}
                d={`M${x1} ${y1}L${x2} ${y2}`}
                pathLength={1}
                style={delay(overlayDelay + 700 + i * 120)}
              />
            )
          })}
          {overlay.planets.map((p, i) => {
            const [x, y] = pt(overPlaced!.get(p.key)!, R_OVER)
            const [dx, dy] = pt(p.lon, R_OVER + 9)
            const sel = focus.overlay === p.key
            return (
              <g
                key={p.key}
                className={`w-over-planet${sel ? ' sel' : ''}${hasFocus && !sel && !(focus.planets?.length === 1 && overlay.aspects.some((a) => a.b === p.key && a.a === focus.planets![0])) ? ' off' : ''}`}
                style={{ ...delay(overlayDelay + i * 60), '--dx': `${C - x}px`, '--dy': `${C - y}px` } as CSSProperties}
                onClick={() => onOverlay?.(p.key)}
              >
                <circle className="w-over-dot" cx={dx} cy={dy} r={1.2} />
                <circle className="w-planet-hit" cx={x} cy={y} r={OVER_SIZE / 2 + 1} />
                <image href={planetEmblem(p.key)} x={x - OVER_SIZE / 2} y={y - OVER_SIZE / 2} width={OVER_SIZE} height={OVER_SIZE} className="w-emblem" />
              </g>
            )
          })}
        </g>
      )}
      <circle className="w-core" cx={C} cy={C} r={3} />
    </svg>
  )
}
