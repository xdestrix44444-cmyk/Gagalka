import { describe, expect, it } from 'vitest'
import { DECK } from './deck'
import { dayKey, drawCards } from './draw'

describe('drawCards', () => {
  it('возвращает запрошенное число разных карт', () => {
    const cards = drawCards(3)
    expect(cards).toHaveLength(3)
    expect(new Set(cards.map((c) => c.id)).size).toBe(3)
  })

  it('может вытянуть всю колоду без повторов', () => {
    const cards = drawCards(DECK.length)
    expect(new Set(cards.map((c) => c.id)).size).toBe(DECK.length)
  })

  it('с одним и тем же генератором даёт тот же результат', () => {
    const seq = () => {
      let s = 7
      return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
    }
    expect(drawCards(5, seq()).map((c) => c.id)).toEqual(drawCards(5, seq()).map((c) => c.id))
  })

  it('не позволяет вытянуть больше карт, чем в колоде', () => {
    expect(() => drawCards(DECK.length + 1)).toThrow(RangeError)
  })
})

describe('dayKey', () => {
  it('форматирует локальную дату', () => {
    expect(dayKey(new Date(2026, 9, 4))).toBe('2026-10-04')
    expect(dayKey(new Date(2026, 0, 9))).toBe('2026-01-09')
  })
})

describe('колода', () => {
  it('содержит 22 старших аркана с уникальными номерами', () => {
    expect(DECK).toHaveLength(22)
    expect(new Set(DECK.map((c) => c.id)).size).toBe(22)
    DECK.forEach((c, i) => expect(c.id).toBe(i))
  })
})
