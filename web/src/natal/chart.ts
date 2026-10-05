// Натальная карта: положения планет (astronomy-engine, тропический зодиак, истинная эклиптика даты),
// Асцендент и MC, дома по Плацидусу (за полярным кругом — Порфирий), главные аспекты.

import { Body, Ecliptic, EclipticGeoMoon, GeoVector, MakeTime, SiderealTime, SunPosition, e_tilt } from 'astronomy-engine'

export const SIGNS = ['Овен', 'Телец', 'Близнецы', 'Рак', 'Лев', 'Дева', 'Весы', 'Скорпион', 'Стрелец', 'Козерог', 'Водолей', 'Рыбы'] as const
/** Родительный падеж: «14° Скорпиона». */
export const SIGNS_GEN = ['Овна', 'Тельца', 'Близнецов', 'Рака', 'Льва', 'Девы', 'Весов', 'Скорпиона', 'Стрельца', 'Козерога', 'Водолея', 'Рыб'] as const
/** Предложный падеж: «Луна в Раке». */
export const SIGNS_IN = ['Овне', 'Тельце', 'Близнецах', 'Раке', 'Льве', 'Деве', 'Весах', 'Скорпионе', 'Стрельце', 'Козероге', 'Водолее', 'Рыбах'] as const
/** Знаки с текстовым начертанием (U+FE0E), чтобы телефоны не рисовали их эмодзи. */
export const SIGN_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'].map((g) => g + '︎')

export type Element = 'fire' | 'earth' | 'air' | 'water'
export type Modality = 'cardinal' | 'fixed' | 'mutable'
export const signElement = (sign: number): Element => (['fire', 'earth', 'air', 'water'] as const)[sign % 4]
export const signModality = (sign: number): Modality => (['cardinal', 'fixed', 'mutable'] as const)[sign % 3]

export type PlanetKey = 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto'

export const PLANETS: readonly { key: PlanetKey; name: string; glyph: string; body?: Body }[] = [
  { key: 'sun', name: 'Солнце', glyph: '☉' },
  { key: 'moon', name: 'Луна', glyph: '☽' },
  { key: 'mercury', name: 'Меркурий', glyph: '☿', body: Body.Mercury },
  { key: 'venus', name: 'Венера', glyph: '♀', body: Body.Venus },
  { key: 'mars', name: 'Марс', glyph: '♂', body: Body.Mars },
  { key: 'jupiter', name: 'Юпитер', glyph: '♃', body: Body.Jupiter },
  { key: 'saturn', name: 'Сатурн', glyph: '♄', body: Body.Saturn },
  { key: 'uranus', name: 'Уран', glyph: '♅', body: Body.Uranus },
  { key: 'neptune', name: 'Нептун', glyph: '♆', body: Body.Neptune },
  { key: 'pluto', name: 'Плутон', glyph: '♇', body: Body.Pluto },
]

export type AspectType = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition'
export const ASPECTS: readonly { type: AspectType; angle: number; orb: number; name: string }[] = [
  { type: 'conjunction', angle: 0, orb: 8, name: 'соединение' },
  { type: 'sextile', angle: 60, orb: 4, name: 'секстиль' },
  { type: 'square', angle: 90, orb: 7, name: 'квадрат' },
  { type: 'trine', angle: 120, orb: 7, name: 'трин' },
  { type: 'opposition', angle: 180, orb: 8, name: 'оппозиция' },
]

export interface PlanetPos {
  key: PlanetKey
  lon: number
  sign: number
  /** Градус внутри знака, 0–29.99. */
  deg: number
  retro: boolean
  /** Дом 1–12; нет, если время рождения неизвестно. */
  house?: number
}

export interface Aspect {
  a: PlanetKey
  b: PlanetKey
  type: AspectType
  /** Отклонение от точного угла, градусы. Чем меньше, тем сильнее аспект. */
  orb: number
}

export interface Chart {
  utc: Date
  planets: PlanetPos[]
  aspects: Aspect[]
  /** Есть, только если известно время рождения. */
  angles?: { asc: number; mc: number; cusps: number[]; system: 'placidus' | 'porphyry' }
}

export const norm = (x: number) => ((x % 360) + 360) % 360
const rad = Math.PI / 180
const sin = (d: number) => Math.sin(d * rad)
const cos = (d: number) => Math.cos(d * rad)
const tan = (d: number) => Math.tan(d * rad)
const atan2d = (y: number, x: number) => norm(Math.atan2(y, x) / rad)
/** Угловое расстояние по дуге в сторону знаков, 0–360: от a до b. */
export const arc = (a: number, b: number) => norm(b - a)

function longitude(key: PlanetKey, body: Body | undefined, date: Date): number {
  if (key === 'sun') return SunPosition(date).elon
  if (key === 'moon') return EclipticGeoMoon(date).lon
  return Ecliptic(GeoVector(body!, date, true)).elon
}

/** Асцендент, MC и куспиды домов для момента (UTC) и места. */
export function houses(utc: Date, lat: number, lon: number): NonNullable<Chart['angles']> {
  const eps = e_tilt(MakeTime(utc)).tobl
  const ramc = norm(SiderealTime(utc) * 15 + lon)
  const asc = atan2d(cos(ramc), -(sin(ramc) * cos(eps) + tan(lat) * sin(eps)))
  let mc = atan2d(sin(ramc), cos(ramc) * cos(eps))
  // за полярным кругом MC бывает под горизонтом и оси идут не по порядку: берём противоположную точку,
  // чтобы MC лежал в квадранте перед Асцендентом, как принято в полярных картах
  if (arc(mc, asc) > 180) mc = norm(mc + 180)
  // точка эклиптики с прямым восхождением ra
  const lonFromRa = (ra: number) => atan2d(sin(ra), cos(ra) * cos(eps))
  const decOf = (l: number) => Math.asin(sin(eps) * sin(l)) / rad
  /** Плацидус: куспида делит полудугу точки на трети. k — доля, nocturnal — под горизонтом. */
  const placidus = (k: number, nocturnal: boolean): number | null => {
    let ra = norm(ramc + (nocturnal ? 90 + 90 * k : 90 * k))
    for (let i = 0; i < 60; i++) {
      const x = -tan(lat) * tan(decOf(lonFromRa(ra)))
      if (Math.abs(x) > 1) return null
      const sda = Math.acos(x) / rad
      const next = norm(ramc + (nocturnal ? sda + (180 - sda) * k : sda * k))
      if (Math.min(arc(ra, next), arc(next, ra)) < 1e-7) return lonFromRa(next)
      ra = next
    }
    return lonFromRa(ra)
  }
  const c11 = placidus(1 / 3, false)
  const c12 = placidus(2 / 3, false)
  const c2 = placidus(1 / 3, true)
  const c3 = placidus(2 / 3, true)
  const ic = norm(mc + 180)
  if (c11 !== null && c12 !== null && c2 !== null && c3 !== null) {
    const cusps = [asc, c2, c3, ic, norm(c11 + 180), norm(c12 + 180), norm(asc + 180), norm(c2 + 180), norm(c3 + 180), mc, c11, c12]
    return { asc, mc, cusps, system: 'placidus' }
  }
  // Порфирий: каждый квадрант между осями делится на три равные части
  const cusps: number[] = []
  const quad = [asc, ic, norm(asc + 180), mc]
  for (let q = 0; q < 4; q++) {
    const from = quad[q]
    const span = arc(from, quad[(q + 1) % 4])
    for (let i = 0; i < 3; i++) cusps.push(norm(from + (span * i) / 3))
  }
  return { asc, mc, cusps, system: 'porphyry' }
}

/** Номер дома 1–12 для долготы по куспидам. */
export function houseOf(lon: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) if (arc(cusps[i], lon) < arc(cusps[i], cusps[(i + 1) % 12])) return i + 1
  return 12
}

export function computeChart(utc: Date, place?: { lat: number; lon: number }): Chart {
  const dayLater = new Date(utc.getTime() + 86_400_000)
  const angles = place ? houses(utc, place.lat, place.lon) : undefined
  const planets: PlanetPos[] = PLANETS.map(({ key, body }) => {
    const lon = longitude(key, body, utc)
    const motion = arc(lon, longitude(key, body, dayLater))
    return {
      key,
      lon,
      sign: Math.floor(lon / 30),
      deg: lon % 30,
      // Солнце и Луна не бывают ретроградными; у планет попятное движение — дуга «назад» за сутки
      retro: key !== 'sun' && key !== 'moon' && motion > 180,
      house: angles ? houseOf(lon, angles.cusps) : undefined,
    }
  })
  const aspects: Aspect[] = []
  for (let i = 0; i < planets.length; i++)
    for (let j = i + 1; j < planets.length; j++) {
      const d = Math.min(arc(planets[i].lon, planets[j].lon), arc(planets[j].lon, planets[i].lon))
      for (const asp of ASPECTS) {
        const orb = Math.abs(d - asp.angle)
        if (orb <= asp.orb) aspects.push({ a: planets[i].key, b: planets[j].key, type: asp.type, orb })
      }
    }
  aspects.sort((x, y) => x.orb - y.orb)
  return { utc, planets, aspects, angles }
}

/** Местное время рождения в часовом поясе города → момент UTC (с историческими сдвигами поясов). */
export function localToUtc(date: string, time: string, timeZone: string): Date {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  const wall = Date.UTC(y, mo - 1, d, h, mi)
  const offsetAt = (t: number) => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(t))
    const get = (type: string) => Number(parts.find((p) => p.type === type)!.value)
    return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute')) - t
  }
  // два шага уточнения: смещение зависит от самого момента (летнее время, смены поясов)
  let utc = wall - offsetAt(wall)
  utc = wall - offsetAt(utc)
  return new Date(utc)
}
