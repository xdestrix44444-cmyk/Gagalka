import { describe, expect, it } from 'vitest'
import { CITIES, findCities } from './cities'

describe('города', () => {
  it('у каждого города рабочий часовой пояс и правдоподобные координаты', () => {
    for (const c of CITIES) {
      expect(() => new Intl.DateTimeFormat('en-US', { timeZone: c.tz })).not.toThrow()
      // от Калининграда и Закавказья до Чукотки
      expect(c.lat).toBeGreaterThan(35)
      expect(c.lat).toBeLessThan(72)
      expect(c.lon).toBeGreaterThan(19)
      expect(c.lon).toBeLessThan(180)
    }
  })

  it('нет повторов город + регион', () => {
    const keys = CITIES.map((c) => `${c.name}|${c.region}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('находит Подмосковье, города СНГ и старые названия', () => {
    expect(findCities('одинц')[0]).toMatchObject({ name: 'Одинцово', region: 'Московская обл.' })
    expect(findCities('алмат')[0]?.name).toBe('Алматы')
    expect(findCities('алма-ата')[0]?.name).toBe('Алматы')
    expect(findCities('днепропетровск')[0]?.name).toBe('Днепр')
    expect(findCities('ленинград')[0]?.name).toBe('Санкт-Петербург')
    expect(findCities('фрунзе')[0]?.name).toBe('Бишкек')
    expect(findCities('минск')[0]).toMatchObject({ name: 'Минск', tz: 'Europe/Minsk' })
  })

  it('пояса стран СНГ: Алматы летом 1990 — UTC+7, Ташкент — UTC+7, Минск — UTC+3', () => {
    const offset = (tz: string) => new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date(Date.UTC(1990, 6, 1, 12))).find((p) => p.type === 'timeZoneName')?.value
    expect(offset(findCities('алматы')[0].tz)).toBe('GMT+7')
    expect(offset(findCities('ташкент')[0].tz)).toBe('GMT+7')
    expect(offset(findCities('минск')[0].tz)).toBe('GMT+3')
  })
})
