import { describe, expect, it } from 'vitest'
import { formatDigits, isoToRu, parseRuDate } from './DateField'

describe('ввод даты цифрами', () => {
  it('расставляет точки по мере ввода', () => {
    expect(formatDigits('1')).toBe('1')
    expect(formatDigits('140')).toBe('14.0')
    expect(formatDigits('1403')).toBe('14.03')
    expect(formatDigits('14031996')).toBe('14.03.1996')
    expect(formatDigits('14.03.19961')).toBe('14.03.1996')
  })

  it('принимает только существующие даты', () => {
    expect(parseRuDate('14.03.1996')).toBe('1996-03-14')
    expect(parseRuDate('29.02.2000')).toBe('2000-02-29')
    expect(parseRuDate('29.02.1999')).toBe('')
    expect(parseRuDate('31.04.2001')).toBe('')
    expect(parseRuDate('14.03.19')).toBe('')
  })

  it('показывает сохранённую дату в привычном виде', () => {
    expect(isoToRu('1996-03-14')).toBe('14.03.1996')
    expect(isoToRu('')).toBe('')
  })
})
