// «Повреждённые» версии карт: редкая жуткая версия вместо обычной.
// Смысл толкования остаётся добрым, меняются картинка и системный лог.

/** Базовый шанс повреждённой версии у карты, у которой она есть: примерно 1 из 12. */
export const BASE_CHANCE = 1 / 12
export const MAX_CHANCE = 0.5

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

export interface CreepContext {
  date: Date
  /** Карта, выпавшая прошлой в дневнике, если есть. */
  previousCardId: number | null
  cardId: number
}

/** Вероятность повреждённой версии: ночью, в новолуние, при повторной карте и в пятницу 13-го она растёт. */
export function corruptChance(ctx: CreepContext): number {
  let p = BASE_CHANCE
  if (isNight(ctx.date)) p *= 2
  if (isNewMoon(ctx.date)) p *= 2
  if (ctx.previousCardId === ctx.cardId) p *= 2
  if (isFriday13(ctx.date)) p *= 3
  return Math.min(p, MAX_CHANCE)
}

export function rollCorrupt(ctx: CreepContext, rng: () => number): boolean {
  return rng() < corruptChance(ctx)
}
