import { describe, expect, it } from 'vitest'
import { computeChart, localToUtc } from './chart'
import { findCities } from './cities'
import { portrait } from './portrait'

describe('портрет', () => {
  const kazan = findCities('Казань')[0]

  it('с временем: ядро с Асцендентом, стихии, связь и совет', () => {
    const chart = computeChart(localToUtc('1995-03-21', '07:40', kazan.tz), kazan)
    const s = portrait(chart)
    expect(s[0].title).toBe('ядро')
    expect(s[0].text).toContain('Солнце в Овне')
    expect(s[0].text).toContain('Асцендент в Близнецах')
    expect(s.some((x) => x.title.startsWith('главная связь'))).toBe(true)
    expect(s.at(-1)!.title).toBe('совет нити')
    // главная связь всегда про личные планеты, а не про поколенческие пары
    const main = s.find((x) => x.title.startsWith('главная связь'))!
    expect(main.focus.planets!.some((k) => ['sun', 'moon', 'mercury', 'venus', 'mars'].includes(k))).toBe(true)
  })

  it('без времени: без Асцендента и домов', () => {
    const chart = computeChart(localToUtc('1995-03-21', '12:00', kazan.tz))
    const s = portrait(chart)
    expect(s[0].text).not.toContain('Асцендент')
    expect(s.find((x) => x.title === 'куда смотрит карта')).toBeUndefined()
  })
})

describe('города', () => {
  it('ищет без учёта регистра, ё и дефисов', () => {
    expect(findCities('орел')[0].name).toBe('Орёл')
    expect(findCities('ростов на')[0].name).toBe('Ростов-на-Дону')
    expect(findCities('спб')).toEqual([])
    expect(findCities('санкт')[0].tz).toBe('Europe/Moscow')
  })
})
