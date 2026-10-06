import { describe, expect, it } from 'vitest'
import { baseOf, coupleMatrix, deckId, matrixOf, reduce } from './calc'

describe('reduce', () => {
  it('оставляет 1–22 и сворачивает большие числа по цифрам', () => {
    expect(reduce(1)).toBe(1)
    expect(reduce(22)).toBe(22)
    expect(reduce(23)).toBe(5)
    expect(reduce(31)).toBe(4)
    expect(reduce(99)).toBe(18)
    expect(reduce(0)).toBe(22)
  })

  it('22 — это Шут, в колоде у него номер 0', () => {
    expect(deckId(22)).toBe(0)
    expect(deckId(7)).toBe(7)
    // в матрице 8 — Справедливость, 11 — Сила; в колоде наоборот
    expect(deckId(8)).toBe(11)
    expect(deckId(11)).toBe(8)
  })
})

describe('матрица', () => {
  // 14.03.1996: день 14, месяц 3, год 1+9+9+6 = 25 → 7, хвост 14+3+7 = 24 → 6
  it('опорные точки по дате', () => {
    expect(baseOf('1996-03-14')).toEqual({ a: 14, b: 3, c: 7, d: 6 })
  })

  it('центр, диагонали, лучи, деньги и любовь, предназначения', () => {
    const m = matrixOf('1996-03-14')
    expect(m.e).toBe(3) // 14+3+7+6 = 30 → 3
    expect([m.f, m.g, m.h, m.i]).toEqual([17, 10, 13, 20])
    expect([m.a1, m.a2]).toEqual([17, 4]) // 14+3; 14+17 = 31 → 4
    expect([m.c1, m.c2, m.d1, m.d2]).toEqual([10, 17, 9, 15])
    expect([m.x, m.money, m.love]).toEqual([19, 11, 10])
    expect([m.sky, m.earth, m.personal]).toEqual([9, 21, 3])
    expect([m.male, m.female, m.social, m.spiritual, m.planetary]).toEqual([3, 3, 6, 9, 15])
  })

  it('день больше 22 сворачивается', () => {
    expect(baseOf('2001-12-29').a).toBe(11)
    expect(baseOf('2001-12-29').c).toBe(3)
  })

  it('матрица пары складывает опорные точки', () => {
    const m = coupleMatrix('1996-03-14', '1998-11-02')
    // второй: день 2, месяц 11, год 27 → 9, хвост 22
    expect([m.a, m.b, m.c, m.d]).toEqual([16, 14, 16, 10])
  })
})
