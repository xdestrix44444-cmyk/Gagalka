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
  it('в игре сейчас только карты с рисунком из «карточек»', async () => {
    const { hasArt } = await import('./sprites')
    expect(ACTIVE_DECK.map((c) => c.name)).toEqual(['Шут', 'Иерофант', 'Башня', 'Звезда', 'Двойка Жезлов', 'Семёрка Кубков'])
    for (const c of ACTIVE_DECK) expect(hasArt(c.id)).toBe(true)
  })

  it('полная колода: 78 карт, id совпадает с местом в колоде', () => {
    expect(DECK).toHaveLength(78)
    DECK.forEach((c, i) => expect(c.id).toBe(i))
    expect(DECK.filter((c) => !c.suit)).toHaveLength(22)
    for (const suit of ['wands', 'cups', 'swords', 'pentacles'] as const) expect(DECK.filter((c) => c.suit === suit)).toHaveLength(14)
  })

  it('у младших арканов есть номинал и масть в имени', () => {
    expect(DECK[22]).toMatchObject({ numeral: 'I', name: 'Туз Жезлов', file: 'ЖЕЗЛЫ_01.EXE' })
    expect(DECK[23]).toMatchObject({ numeral: 'II', name: 'Двойка Жезлов' })
    expect(DECK[42]).toMatchObject({ numeral: 'VII', name: 'Семёрка Кубков' })
    expect(DECK[77]).toMatchObject({ numeral: 'XIV', name: 'Король Пентаклей', file: 'ПЕНТАКЛИ_КОРОЛЬ.EXE' })
    expect(new Set(DECK.map((c) => c.file)).size).toBe(78)
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

describe('толкование по целостности', () => {
  it('у каждой карты в игре есть помеха и тень', async () => {
    const { LAYERS } = await import('./layers')
    for (const c of ACTIVE_DECK) {
      expect(LAYERS[c.id]?.noise.length).toBeGreaterThan(40)
      expect(LAYERS[c.id]?.shadow.log).toHaveLength(2)
      expect(LAYERS[c.id]?.shadow.text.length).toBeGreaterThan(40)
    }
  })

  it('целая — прямое значение, частично — с помехой, повреждённая — перевёрнутая тень', async () => {
    const { readingOf } = await import('./deck')
    const tower = DECK[16]
    expect(readingOf(tower, 95)).toMatchObject({ state: 'whole', reversed: false, text: tower.text, noise: undefined })
    expect(readingOf(tower, 70)).toMatchObject({ state: 'partial', reversed: false, text: tower.text })
    expect(readingOf(tower, 70).noise).toMatch(/^Помеха/)
    const dmg = readingOf(tower, 30)
    expect(dmg).toMatchObject({ state: 'damaged', reversed: true })
    expect(dmg.text).not.toBe(tower.text)
    expect(dmg.log).toEqual(['обрушение отложено', 'нагрузка на опоры растёт'])
  })
})
