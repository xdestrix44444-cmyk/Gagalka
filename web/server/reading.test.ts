import { describe, expect, it } from 'vitest'
import { QUESTION_MAX, parseReadingRequest } from '../src/reading-request'
import { SYSTEM_PROMPT, buildUserMessage } from './prompt'

describe('parseReadingRequest', () => {
  it('принимает карту дня и расклад с вопросом', () => {
    expect(parseReadingRequest({ kind: 'day', cards: [{ id: 0, corrupt: false }] })).toEqual({ kind: 'day', cards: [{ id: 0, corrupt: false }], question: undefined })
    const r = parseReadingRequest({ kind: 'three', cards: [{ id: 0 }, { id: 16, corrupt: true }, { id: 42 }], question: '  что дальше?  ' })
    expect(r).toEqual({ kind: 'three', cards: [{ id: 0, corrupt: false }, { id: 16, corrupt: true }, { id: 42, corrupt: false }], question: 'что дальше?' })
  })

  it('отклоняет карты не из игры, повторы и неверное число карт', () => {
    expect(typeof parseReadingRequest({ kind: 'day', cards: [{ id: 1 }] })).toBe('string')
    expect(typeof parseReadingRequest({ kind: 'day', cards: [{ id: '0' }] })).toBe('string')
    expect(typeof parseReadingRequest({ kind: 'three', cards: [{ id: 0 }, { id: 0 }, { id: 5 }] })).toBe('string')
    expect(typeof parseReadingRequest({ kind: 'three', cards: [{ id: 0 }] })).toBe('string')
    expect(typeof parseReadingRequest({ kind: 'love', cards: [] })).toBe('string')
    expect(typeof parseReadingRequest(null)).toBe('string')
  })

  it('ограничивает длину вопроса', () => {
    const cards = [{ id: 0 }, { id: 5 }, { id: 17 }]
    expect(typeof parseReadingRequest({ kind: 'three', cards, question: 'а'.repeat(QUESTION_MAX + 1) })).toBe('string')
    expect(typeof parseReadingRequest({ kind: 'three', cards, question: 'а'.repeat(QUESTION_MAX) })).toBe('object')
  })
})

describe('промпт', () => {
  it('описывает карты с позициями, повреждённой версией и вопросом', () => {
    const msg = buildUserMessage({ kind: 'three', cards: [{ id: 0, corrupt: false }, { id: 16, corrupt: true }, { id: 23, corrupt: false }], question: 'менять ли город?' })
    expect(msg).toContain('«менять ли город?»')
    expect(msg).toContain('Позиция «Ситуация»: 0 · Шут')
    expect(msg).toContain('XVI · Башня (повреждённая версия)')
    expect(msg).toContain('файл изменён: не вами')
    expect(msg).toContain('Позиция «Совет»: II · Двойка Жезлов')
  })

  it('карта дня без вопроса; системный промпт содержит правила безопасности', () => {
    expect(buildUserMessage({ kind: 'day', cards: [{ id: 17, corrupt: false }] })).toMatch(/^Карта дня\.[\s\S]*XVII · Звезда/)
    expect(SYSTEM_PROMPT).toContain('112')
    expect(SYSTEM_PROMPT).toContain('Не давай гарантий')
  })
})
