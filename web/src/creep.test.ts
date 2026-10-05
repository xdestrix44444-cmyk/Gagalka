import { describe, expect, it } from 'vitest'
import { BASE_CHANCE, MAX_CHANCE, corruptChance, isFriday13, isNewMoon, isNight, moonAge } from './creep'

const noon = new Date(2026, 9, 6, 12, 0)
const base = { date: noon, previousCardId: null, cardId: 18 }

describe('corruptChance', () => {
  it('днём без условий равна базовому шансу', () => {
    // 6 октября 2026 далеко от новолуния и не пятница 13-е
    expect(isNewMoon(noon)).toBe(false)
    expect(corruptChance(base)).toBeCloseTo(BASE_CHANCE)
  })

  it('ночью вдвое выше', () => {
    const night = new Date(2026, 9, 6, 23, 30)
    expect(isNight(night)).toBe(true)
    expect(corruptChance({ ...base, date: night })).toBeCloseTo(BASE_CHANCE * 2)
  })

  it('при повторной карте подряд вдвое выше', () => {
    expect(corruptChance({ ...base, previousCardId: 18 })).toBeCloseTo(BASE_CHANCE * 2)
    expect(corruptChance({ ...base, previousCardId: 16 })).toBeCloseTo(BASE_CHANCE)
  })

  it('в пятницу 13-го втрое выше', () => {
    const f13 = new Date(2026, 10, 13, 12, 0)
    expect(isFriday13(f13)).toBe(true)
    expect(corruptChance({ ...base, date: f13 })).toBeGreaterThanOrEqual(BASE_CHANCE * 3 - 1e-9)
  })

  it('никогда не выше потолка', () => {
    const worst = new Date(2026, 10, 13, 23, 0)
    expect(corruptChance({ ...base, date: worst, previousCardId: 18 })).toBeLessThanOrEqual(MAX_CHANCE)
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
