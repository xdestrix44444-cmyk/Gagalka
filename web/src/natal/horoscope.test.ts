import { describe, expect, it } from 'vitest'
import { horoscope, lunations, solarHouse } from './horoscope'

describe('гороскоп по знаку', () => {
  it('сферы считаются от знака человека', () => {
    expect(solarHouse(0, 0)).toBe(0)
    expect(solarHouse(3, 2)).toBe(11)
    expect(solarHouse(11, 0)).toBe(1)
  })

  it('день: строка о Луне первой, небо с фазой', () => {
    const h = horoscope(4, 'day', new Date('2026-10-06T12:00:00Z'))
    expect(h.sky).toMatch(/^Луна (в|во) \S+ · /)
    expect(h.lines[0]).toMatch(/^Луна /)
  })

  it('неделя: четыре быстрые планеты и лунации', () => {
    const h = horoscope(0, 'week', new Date('2026-10-06T12:00:00Z'))
    expect(h.lines.slice(0, 4).map((l) => l.split(' ')[0])).toEqual(['Солнце', 'Меркурий', 'Венера', 'Марс'])
    // за любые 15 дней есть ровно одна лунация
    const l = lunations(new Date('2026-10-06T12:00:00Z'), 15)
    expect(l.length).toBeGreaterThanOrEqual(1)
    expect(l.length).toBeLessThanOrEqual(2)
  })
})

describe('лунации', () => {
  it('точные даты осени 2026', () => {
    const l = lunations(new Date('2026-10-01T00:00:00Z'), 31)
    const fmt = (d: Date) => d.toISOString().slice(0, 16)
    // по таблицам: новолуние 10.10.2026 15:50 UTC, полнолуние 26.10.2026 04:12 UTC
    expect(l.map((x) => `${x.kind} ${fmt(x.at)}`)).toEqual(['new 2026-10-10T15:50', 'full 2026-10-26T04:12'])
  })
})
