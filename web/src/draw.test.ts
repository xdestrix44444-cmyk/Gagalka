import { describe, expect, it } from 'vitest'
import { ACTIVE_DECK, DECK } from './deck'
import { dayKey, drawCards } from './draw'

describe('drawCards', () => {
  it('возвращает запрошенное число разных карт', () => {
    const cards = drawCards(3)
    expect(cards).toHaveLength(3)
    expect(new Set(cards.map((c) => c.id)).size).toBe(3)
  })

  it('может вытянуть всю колоду без повторов', () => {
    const cards = drawCards(ACTIVE_DECK.length)
    expect(new Set(cards.map((c) => c.id)).size).toBe(ACTIVE_DECK.length)
  })

  it('с одним и тем же генератором даёт тот же результат', () => {
    const seq = () => {
      let s = 7
      return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
    }
    expect(drawCards(3, seq()).map((c) => c.id)).toEqual(drawCards(3, seq()).map((c) => c.id))
  })

  it('не позволяет вытянуть больше карт, чем в колоде', () => {
    expect(() => drawCards(ACTIVE_DECK.length + 1)).toThrow(RangeError)
  })
})

describe('dayKey', () => {
  it('форматирует локальную дату', () => {
    expect(dayKey(new Date(2026, 9, 4))).toBe('2026-10-04')
    expect(dayKey(new Date(2026, 0, 9))).toBe('2026-01-09')
  })
})

describe('колода', () => {
  it('в игре сейчас только карты с утверждаемым дизайном', () => {
    expect(ACTIVE_DECK.map((c) => c.id)).toEqual([1, 13, 16, 18])
  })

  it('содержит 22 старших аркана с уникальными номерами', () => {
    expect(DECK).toHaveLength(22)
    expect(new Set(DECK.map((c) => c.id)).size).toBe(22)
    DECK.forEach((c, i) => expect(c.id).toBe(i))
  })
})

describe('целостность карт', () => {
  it('делит карты на цел / частично / повреждён', async () => {
    const { integrityState } = await import('./deck')
    expect(integrityState(100)).toBe('whole')
    expect(integrityState(90)).toBe('whole')
    expect(integrityState(75)).toBe('partial')
    expect(integrityState(43)).toBe('damaged')
  })

  it('у каждой карты есть файл, две строки лога и текст', () => {
    for (const c of DECK) {
      expect(c.file).toMatch(/\.EXE$/)
      expect(c.log).toHaveLength(2)
      expect(c.text.length).toBeGreaterThan(40)
    }
  })
})

describe('повреждённые версии', () => {
  it('у Башни и Луны есть повреждённая версия с логом и текстом', async () => {
    const { CORRUPT_TOTAL, variantOf } = await import('./deck')
    expect(CORRUPT_TOTAL).toBe(2)
    for (const id of [16, 18]) {
      const v = variantOf(DECK[id], true)
      expect(v.log).toHaveLength(2)
      expect(v.integrity).toBeLessThan(DECK[id].integrity)
      expect(variantOf(DECK[id], false)).toBe(DECK[id])
    }
  })
})
