import { describe, expect, it } from 'vitest'
import { BASE_DAMAGE, MAX_DAMAGE, damageChance, isFriday13, isFullMoon, isMercuryRetrograde, isNewMoon, isNight, moonAge, omensFor, rollIntegrity } from './creep'
import { integrityState } from './deck'

const noon = new Date(2026, 9, 6, 12, 0)
const base = { date: noon, previousCardId: null, cardId: 18 }

describe('damageChance', () => {
  it('днём без условий равна базовому шансу', () => {
    // 6 октября 2026 далеко от новолуния и не пятница 13-е
    expect(isNewMoon(noon)).toBe(false)
    expect(damageChance(base)).toBeCloseTo(BASE_DAMAGE)
  })

  it('ночью и при повторной карте подряд выше', () => {
    const night = new Date(2026, 9, 6, 23, 30)
    expect(isNight(night)).toBe(true)
    expect(damageChance({ ...base, date: night })).toBeCloseTo(BASE_DAMAGE * 1.4)
    expect(damageChance({ ...base, previousCardId: 18 })).toBeCloseTo(BASE_DAMAGE * 1.4)
    expect(damageChance({ ...base, previousCardId: 16 })).toBeCloseTo(BASE_DAMAGE)
  })

  it('в пятницу 13-го вдвое выше, но никогда не выше потолка', () => {
    const f13 = new Date(2026, 10, 13, 12, 0)
    expect(isFriday13(f13)).toBe(true)
    expect(damageChance({ ...base, date: f13 })).toBeCloseTo(BASE_DAMAGE * 2)
    const worst = new Date(2026, 10, 13, 23, 0)
    expect(damageChance({ ...base, date: worst, previousCardId: 18 })).toBe(MAX_DAMAGE)
  })
})

describe('знамения', () => {
  it('полнолуние 26 октября 2026 повышает риск сбоя', () => {
    const full = new Date(2026, 9, 26, 12, 0)
    expect(isFullMoon(full)).toBe(true)
    expect(isNewMoon(full)).toBe(false)
    expect(omensFor({ ...base, date: full })).toContain('fullmoon')
    expect(damageChance({ ...base, date: full })).toBeGreaterThan(BASE_DAMAGE)
  })

  it('ретроградный Меркурий: осенью 2026 с конца октября до середины ноября', () => {
    expect(isMercuryRetrograde(new Date(2026, 10, 1, 12))).toBe(true)
    expect(isMercuryRetrograde(noon)).toBe(false)
    expect(isMercuryRetrograde(new Date(2026, 11, 10, 12))).toBe(false)
  })

  it('в обычный день знамений нет, повтор карты — знамение', () => {
    expect(omensFor(base)).toEqual([])
    expect(omensFor({ ...base, previousCardId: 18 })).toEqual(['repeat'])
  })
})

describe('rollIntegrity', () => {
  const fixed = (...xs: number[]) => {
    let i = 0
    return () => xs[i++ % xs.length]
  }

  it('первое число выбирает состояние, второе — процент внутри него', () => {
    expect(rollIntegrity(base, fixed(0, 0))).toBe(5)
    expect(rollIntegrity(base, fixed(0.24, 0.999))).toBe(59)
    expect(rollIntegrity(base, fixed(0.3, 0))).toBe(60)
    expect(rollIntegrity(base, fixed(0.49, 0.999))).toBe(89)
    expect(rollIntegrity(base, fixed(0.5, 0))).toBe(90)
    expect(rollIntegrity(base, fixed(0.99, 0.999))).toBe(100)
  })

  it('в обычный день примерно половина целых и по четверти остальных', () => {
    let s = 7
    const rng = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
    const n = 20000
    const counts = { whole: 0, partial: 0, damaged: 0 }
    for (let i = 0; i < n; i++) counts[integrityState(rollIntegrity(base, rng))]++
    expect(counts.whole / n).toBeCloseTo(0.5, 1)
    expect(counts.partial / n).toBeCloseTo(0.25, 1)
    expect(counts.damaged / n).toBeCloseTo(0.25, 1)
  })
})

describe('moonAge', () => {
  it('знает новолуние 6 января 2000', () => {
    expect(moonAge(new Date(Date.UTC(2000, 0, 6, 18, 14)))).toBeCloseTo(0, 5)
    expect(isNewMoon(new Date(Date.UTC(2000, 0, 7, 12, 0)))).toBe(true)
  })

  it('полнолуние примерно через половину цикла', () => {
    expect(isNewMoon(new Date(Date.UTC(2000, 0, 21, 12, 0)))).toBe(false)
  })
})
