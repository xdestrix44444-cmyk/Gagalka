// Код человека для обмена между друзьями: имя, дата, время и город рождения в одной строке «nit:…».
// Сервера нет, поэтому код передают в мессенджере; получатель вставляет его в «Добавить по коду».

import { PERIODS, type DayPeriod } from './chart'
import { CITIES } from './cities'
import type { Person } from './people'

const PREFIX = 'nit:'

/** Что передаётся в коде. Отметка «это я» не передаётся: у получателя это чужая карта. */
export type SharedPerson = Pick<Person, 'name' | 'date' | 'time' | 'period' | 'city' | 'region'>

const toB64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

export function encodePerson(p: SharedPerson): string {
  const data: Record<string, string> = { n: p.name, d: p.date }
  if (p.time) data.t = p.time
  if (!p.time && p.period) data.p = p.period
  if (p.city) {
    data.c = p.city
    data.r = p.region
  }
  return PREFIX + toB64url(new TextEncoder().encode(JSON.stringify({ v: 1, ...data })))
}

/** Достаёт код из любого текста (например, из пересланного сообщения) и проверяет его. */
export function decodePerson(text: string): SharedPerson | null {
  const m = /nit:([A-Za-z0-9_-]{8,})/.exec(text)
  if (!m) return null
  let raw: unknown
  try {
    raw = JSON.parse(new TextDecoder().decode(fromB64url(m[1])))
  } catch {
    return null
  }
  if (!raw || typeof raw !== 'object') return null
  const { v, n, d, t, p, c, r } = raw as Record<string, unknown>
  if (v !== 1 || typeof n !== 'string' || typeof d !== 'string') return null
  const name = n.trim().slice(0, 40)
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null
  const probe = new Date(`${d}T12:00:00Z`)
  if (Number.isNaN(probe.getTime()) || probe.toISOString().slice(0, 10) !== d || d < '1900-01-01') return null
  const time = typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? t : null
  const period = !time && PERIODS.some((x) => x.key === p) ? (p as DayPeriod) : undefined
  // город берём только из своего списка: так у получателя считается та же карта
  const city = typeof c === 'string' && typeof r === 'string' ? CITIES.find((x) => x.name === c && x.region === r) : undefined
  return { name, date: d, time, period, city: city?.name ?? '', region: city?.region ?? '' }
}

/** Текст для мессенджера: что это и куда вставить. */
export function shareMessage(p: SharedPerson): string {
  return `Мои данные для «Нити» — натальная карта и матрица судьбы (${p.name}):\n${encodePerson(p)}\n\nОткройте «Нить» → Натальная карта или Матрица судьбы → «Добавить по коду» и вставьте это сообщение.`
}
