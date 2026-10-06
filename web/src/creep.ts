// Целостность карты: насколько ясно она читается в этот раз. Выпадает заново при каждом вытягивании.
// ЦЕЛ — прямое значение, ЧАСТИЧНО — прямое с помехой, ПОВРЕЖДЁН — карта перевёрнута, читается её тень.

/** Шансы состояний в обычный день: половина целых, четверть с помехой, четверть повреждённых. */
export const BASE_DAMAGE = 0.25
export const PARTIAL = 0.25
export const MAX_DAMAGE = 0.6

const SYNODIC = 29.530588853
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14)

/** Возраст луны в сутках (0 — новолуние). Приближённая формула, этого достаточно для игры. */
export function moonAge(date: Date): number {
  const days = (date.getTime() - KNOWN_NEW_MOON) / 86_400_000
  return ((days % SYNODIC) + SYNODIC) % SYNODIC
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

export interface IntegrityContext {
  date: Date
  /** Карта, выпавшая прошлой в дневнике, если есть. */
  previousCardId: number | null
  cardId: number
}

/** Шанс повреждённой карты: ночью, в новолуние, при повторной карте подряд и в пятницу 13-го он растёт. */
export function damageChance(ctx: IntegrityContext): number {
  let p = BASE_DAMAGE
  if (isNight(ctx.date)) p *= 1.4
  if (isNewMoon(ctx.date)) p *= 1.4
  if (ctx.previousCardId === ctx.cardId) p *= 1.4
  if (isFriday13(ctx.date)) p *= 2
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
