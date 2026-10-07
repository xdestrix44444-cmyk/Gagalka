// Целостность карты: насколько ясно она читается в этот раз. Выпадает заново при каждом вытягивании.
// ЦЕЛ — прямое значение, ЧАСТИЧНО — прямое с помехой, ПОВРЕЖДЁН — карта перевёрнута, читается её тень.
// Знамения (ночь, фазы луны, ретроградный Меркурий, повтор карты, пятница 13-е) повышают риск сбоя.

import { Body, Ecliptic, GeoVector, MoonPhase } from 'astronomy-engine'

/** Шансы состояний в обычный день: половина целых, четверть с помехой, четверть повреждённых. */
export const BASE_DAMAGE = 0.25
export const PARTIAL = 0.25
export const MAX_DAMAGE = 0.6

const SYNODIC = 29.530588853

/** Возраст луны в сутках (0 — новолуние, половина цикла — полнолуние): по настоящему углу Луна–Солнце из astronomy-engine. */
export function moonAge(date: Date): number {
  return (MoonPhase(date) / 360) * SYNODIC
}

export function isNewMoon(date: Date): boolean {
  const age = moonAge(date)
  return age < 1.5 || age > SYNODIC - 1.5
}

export function isNight(date: Date): boolean {
  const h = date.getHours()
  return h >= 22 || h < 5
}

export function isFriday13(date: Date): boolean {
  return date.getDay() === 5 && date.getDate() === 13
}

export function isFullMoon(date: Date): boolean {
  return Math.abs(moonAge(date) - SYNODIC / 2) < 1.5
}

/** Меркурий ретрограден: его эклиптическая долгота с Земли за сутки уменьшается. */
export function isMercuryRetrograde(date: Date): boolean {
  const lon = (d: Date) => Ecliptic(GeoVector(Body.Mercury, d, true)).elon
  const delta = ((lon(new Date(date.getTime() + 86_400_000)) - lon(date) + 540) % 360) - 180
  return delta < 0
}

export interface IntegrityContext {
  date: Date
  /** Карта, выпавшая прошлой в дневнике, если есть. */
  previousCardId: number | null
  cardId: number
}

/** Знамения, которые повышают риск сбоя. Показываются в логе карты и уходят ИИ-толкователю. */
export type Omen = 'night' | 'newmoon' | 'fullmoon' | 'mercury' | 'repeat' | 'friday13'

export const OMENS: Record<Omen, { line: string; mult: number }> = {
  night: { line: 'ночь: в эфире чужие голоса', mult: 1.4 },
  newmoon: { line: 'новолуние: канал без лунной подсветки', mult: 1.4 },
  fullmoon: { line: 'полнолуние: сигнал перегрет', mult: 1.4 },
  mercury: { line: 'Меркурий ретрограден: пакеты идут вспять', mult: 1.3 },
  repeat: { line: 'файл вернулся: та же карта второй раз подряд', mult: 1.4 },
  friday13: { line: 'пятница, 13-е: защита снята', mult: 2 },
}

export const OMEN_KEYS = Object.keys(OMENS) as Omen[]

/** Строка лога, когда знамений нет. */
export const NO_OMENS = 'знамений нет: эфир чист'

export function omensFor(ctx: IntegrityContext): Omen[] {
  const d = ctx.date
  const found: Omen[] = []
  if (isNight(d)) found.push('night')
  if (isNewMoon(d)) found.push('newmoon')
  if (isFullMoon(d)) found.push('fullmoon')
  if (isMercuryRetrograde(d)) found.push('mercury')
  if (ctx.previousCardId === ctx.cardId) found.push('repeat')
  if (isFriday13(d)) found.push('friday13')
  return found
}

/** Шанс повреждённой карты: каждое знамение умножает его, но не выше потолка. */
export function damageChance(ctx: IntegrityContext): number {
  const p = omensFor(ctx).reduce((acc, o) => acc * OMENS[o].mult, BASE_DAMAGE)
  return Math.min(p, MAX_DAMAGE)
}

/** Целостность 1–100: сначала выбирается состояние, затем процент внутри него. */
export function rollIntegrity(ctx: IntegrityContext, rng: () => number): number {
  const u = rng()
  const v = rng()
  const dmg = damageChance(ctx)
  if (u < dmg) return 5 + Math.floor(v * 55) // 5–59
  if (u < dmg + PARTIAL) return 60 + Math.floor(v * 30) // 60–89
  return 90 + Math.floor(v * 11) // 90–100
}
