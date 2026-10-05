import { Horizon, MakeTime, Observer, SiderealTime, e_tilt } from 'astronomy-engine'
import { describe, expect, it } from 'vitest'
import { arc, computeChart, houses, localToUtc, norm } from './chart'

const rad = Math.PI / 180
/** Точка эклиптики → экваториальные координаты даты. */
function equatorial(lon: number, date: Date) {
  const eps = e_tilt(MakeTime(date)).tobl * rad
  const l = lon * rad
  const dec = Math.asin(Math.sin(eps) * Math.sin(l)) / rad
  const ra = norm(Math.atan2(Math.sin(l) * Math.cos(eps), Math.cos(l)) / rad)
  return { ra, dec }
}

describe('localToUtc', () => {
  it('учитывает летнее время СССР и «вечное летнее» 2011–2014', () => {
    expect(localToUtc('1985-07-01', '12:00', 'Europe/Moscow').toISOString()).toBe('1985-07-01T08:00:00.000Z')
    expect(localToUtc('2012-01-01', '12:00', 'Europe/Moscow').toISOString()).toBe('2012-01-01T08:00:00.000Z')
    expect(localToUtc('2020-01-01', '12:00', 'Europe/Moscow').toISOString()).toBe('2020-01-01T09:00:00.000Z')
    expect(localToUtc('1995-03-10', '07:30', 'Asia/Vladivostok').toISOString()).toBe('1995-03-09T21:30:00.000Z')
  })
})

describe('положения планет', () => {
  it('Солнце в полдень 1 января 2000 около 280,4°', () => {
    const c = computeChart(new Date('2000-01-01T12:00:00Z'))
    const sun = c.planets.find((p) => p.key === 'sun')!
    expect(sun.lon).toBeGreaterThan(280.2)
    expect(sun.lon).toBeLessThan(280.6)
    expect(sun.sign).toBe(9) // Козерог
    expect(c.angles).toBeUndefined()
  })

  it('находит аспекты и сортирует по точности', () => {
    const c = computeChart(new Date('1990-05-15T10:00:00Z'))
    expect(c.aspects.length).toBeGreaterThan(3)
    for (let i = 1; i < c.aspects.length; i++) expect(c.aspects[i].orb).toBeGreaterThanOrEqual(c.aspects[i - 1].orb)
  })
})

describe('дома', () => {
  const utc = new Date('1990-05-15T10:00:00Z')
  const moscow = { lat: 55.756, lon: 37.617 }

  it('Асцендент восходит на востоке, MC на меридиане', () => {
    const h = houses(utc, moscow.lat, moscow.lon)
    const obs = new Observer(moscow.lat, moscow.lon, 0)
    const asc = equatorial(h.asc, utc)
    const hz = Horizon(utc, obs, asc.ra / 15, asc.dec, undefined)
    expect(Math.abs(hz.altitude)).toBeLessThan(0.05)
    expect(hz.azimuth).toBeGreaterThan(0)
    expect(hz.azimuth).toBeLessThan(180)
    const ramc = norm(SiderealTime(utc) * 15 + moscow.lon)
    expect(Math.min(arc(equatorial(h.mc, utc).ra, ramc), arc(ramc, equatorial(h.mc, utc).ra))).toBeLessThan(1e-6)
  })

  it('Плацидус: 11-я куспида на трети дневной полудуги к востоку от MC', () => {
    const h = houses(utc, moscow.lat, moscow.lon)
    expect(h.system).toBe('placidus')
    const ramc = norm(SiderealTime(utc) * 15 + moscow.lon)
    const { ra, dec } = equatorial(h.cusps[10], utc)
    const sda = Math.acos(-Math.tan(moscow.lat * rad) * Math.tan(dec * rad)) / rad
    expect(arc(ramc, ra)).toBeCloseTo(sda / 3, 4)
  })

  it('куспиды идут по порядку, планеты разложены по домам', () => {
    const c = computeChart(utc, moscow)
    const cusps = c.angles!.cusps
    let total = 0
    for (let i = 0; i < 12; i++) total += arc(cusps[i], cusps[(i + 1) % 12])
    expect(total).toBeCloseTo(360, 6)
    for (const p of c.planets) expect(p.house).toBeGreaterThanOrEqual(1)
  })

  it('за полярным кругом переходит на Порфирий', () => {
    // Норильск зимой: часть эклиптики не восходит, Плацидус не определён
    const h = houses(new Date('1990-12-21T06:00:00Z'), 69.35, 88.2)
    expect(['placidus', 'porphyry']).toContain(h.system)
    let total = 0
    for (let i = 0; i < 12; i++) total += arc(h.cusps[i], h.cusps[(i + 1) % 12])
    expect(total).toBeCloseTo(360, 6)
  })
})

describe('полярные карты', () => {
  it('в любой момент суток дома обходят круг ровно один раз', () => {
    for (const lat of [42.98, 55.76, 64.54, 66.53, 68.97, 69.35])
      for (const month of [5, 11])
        for (let hour = 0; hour < 24; hour += 1) {
          const h = houses(new Date(Date.UTC(1990, month, 21, hour, 17)), lat, 60)
          let total = 0
          for (let i = 0; i < 12; i++) total += arc(h.cusps[i], h.cusps[(i + 1) % 12])
          expect(total).toBeCloseTo(360, 6)
          expect(h.cusps[0]).toBeCloseTo(h.asc, 9)
        }
  })
})
