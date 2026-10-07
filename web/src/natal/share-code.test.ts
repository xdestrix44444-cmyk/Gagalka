import { describe, expect, it } from 'vitest'
import { decodePerson, encodePerson, shareMessage } from './share-code'

const anya = { name: 'Аня', date: '1998-11-02', time: null, period: 'evening' as const, city: 'Санкт-Петербург', region: 'город федерального значения' }

describe('код человека', () => {
  it('туда и обратно сохраняет имя, дату, время и город', () => {
    const me = { name: 'Я', date: '1996-03-14', time: '07:40', city: 'Москва', region: 'столица' }
    expect(decodePerson(encodePerson(me))).toEqual({ ...me, period: undefined })
    expect(decodePerson(encodePerson(anya))).toEqual(anya)
  })

  it('без города — только для матрицы', () => {
    const m = { name: 'Лена', date: '1993-07-21', time: null, city: '', region: '' }
    expect(decodePerson(encodePerson(m))).toEqual({ ...m, period: undefined })
  })

  it('находит код внутри пересланного сообщения', () => {
    expect(decodePerson(shareMessage(anya))?.name).toBe('Аня')
    expect(decodePerson(`вот: ${encodePerson(anya)} — держи`)?.date).toBe('1998-11-02')
  })

  it('отклоняет мусор, битые даты и чужие города', () => {
    expect(decodePerson('привет')).toBeNull()
    expect(decodePerson('nit:!!!!!!!!!!')).toBeNull()
    const bad = (o: object) => 'nit:' + btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o)))).replace(/=+$/, '')
    expect(decodePerson(bad({ v: 1, n: 'X', d: '1999-02-31' }))).toBeNull()
    expect(decodePerson(bad({ v: 2, n: 'X', d: '1999-02-01' }))).toBeNull()
    expect(decodePerson(bad({ v: 1, n: 'X', d: '1999-02-01', c: 'Атлантида', r: 'нигде' }))?.city).toBe('')
  })
})
