import { describe, expect, it } from 'vitest'
import { computeChart, localToUtc } from './chart'
import { findCities } from './cities'
import { skyToday, synastry } from './relations'

const kazan = findCities('Казань')[0]
const a = computeChart(localToUtc('1995-03-21', '07:40', kazan.tz), kazan)
const b = computeChart(localToUtc('1997-10-02', '18:15', kazan.tz), kazan)

describe('небо сегодня', () => {
  it('строка о Луне с домом и не больше 4 транзитов', () => {
    const sky = skyToday(a, new Date('2026-10-04T12:00:00Z'))
    expect(sky.lines[0].text).toMatch(/^Луна сегодня в .+ и проходит ваш \d+-й дом/)
    expect(sky.lines.length).toBeLessThanOrEqual(5)
    // транзитной Луны в связях нет: о ней отдельная строка
    expect(sky.transits.every((t) => t.b !== 'moon')).toBe(true)
  })
})

describe('совместимость', () => {
  it('портрет пары начинается с Солнца и Луны и заканчивается нитью между вами', () => {
    const s = synastry(a, b, 'Даниил', 'Анна')
    expect(s.sections[0].title).toBe('солнце и луна')
    expect(s.sections[0].text).toContain('(Даниил)')
    expect(s.sections.at(-1)!.title).toBe('нить между вами')
    expect(s.cross.length).toBeGreaterThan(0)
  })
})
