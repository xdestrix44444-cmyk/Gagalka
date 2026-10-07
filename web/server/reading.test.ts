import { describe, expect, it } from 'vitest'
import { QUESTION_MAX, parseReadingRequest } from '../src/reading-request'
import { SYSTEM_PROMPT, buildUserMessage } from './prompt'

describe('parseReadingRequest', () => {
  it('принимает карту дня и расклад с вопросом', () => {
    expect(parseReadingRequest({ kind: 'day', cards: [{ id: 0, integrity: 97 }] })).toEqual({ kind: 'day', cards: [{ id: 0, integrity: 97 }], question: undefined })
    const cards = [{ id: 0, integrity: 95 }, { id: 16, integrity: 21 }, { id: 42, integrity: 70 }]
    const r = parseReadingRequest({ kind: 'three', cards, question: '  что дальше?  ' })
    expect(r).toEqual({ kind: 'three', cards, question: 'что дальше?' })
  })

  it('требует целостность 0–100 у каждой карты', () => {
    expect(typeof parseReadingRequest({ kind: 'day', cards: [{ id: 0 }] })).toBe('string')
    expect(typeof parseReadingRequest({ kind: 'day', cards: [{ id: 0, integrity: 101 }] })).toBe('string')
    expect(typeof parseReadingRequest({ kind: 'day', cards: [{ id: 0, integrity: 50.5 }] })).toBe('string')
  })

  it('принимает только известные знамения и убирает повторы', () => {
    expect(parseReadingRequest({ kind: 'day', cards: [{ id: 18, integrity: 40, omens: ['fullmoon', 'night', 'night'] }] })).toEqual({
      kind: 'day',
      cards: [{ id: 18, integrity: 40, omens: ['fullmoon', 'night'] }],
      question: undefined,
    })
    expect(typeof parseReadingRequest({ kind: 'day', cards: [{ id: 18, integrity: 40, omens: ['комета'] }] })).toBe('string')
    expect(typeof parseReadingRequest({ kind: 'day', cards: [{ id: 18, integrity: 40, omens: 'night' }] })).toBe('string')
  })

  it('отклоняет карты не из игры, повторы и неверное число карт', () => {
    expect(typeof parseReadingRequest({ kind: 'day', cards: [{ id: 30, integrity: 90 }] })).toBe('string')
    expect(typeof parseReadingRequest({ kind: 'day', cards: [{ id: '0' }] })).toBe('string')
    expect(typeof parseReadingRequest({ kind: 'three', cards: [{ id: 0 }, { id: 0 }, { id: 5 }] })).toBe('string')
    expect(typeof parseReadingRequest({ kind: 'three', cards: [{ id: 0 }] })).toBe('string')
    expect(typeof parseReadingRequest({ kind: 'love', cards: [] })).toBe('string')
    expect(typeof parseReadingRequest(null)).toBe('string')
  })

  it('ограничивает длину вопроса', () => {
    const cards = [{ id: 0, integrity: 99 }, { id: 5, integrity: 99 }, { id: 17, integrity: 99 }]
    expect(typeof parseReadingRequest({ kind: 'three', cards, question: 'а'.repeat(QUESTION_MAX + 1) })).toBe('string')
    expect(typeof parseReadingRequest({ kind: 'three', cards, question: 'а'.repeat(QUESTION_MAX) })).toBe('object')
  })
})

describe('расклады', () => {
  it('одна карта и кельтский крест: нужное число карт, вопрос разрешён', () => {
    expect(parseReadingRequest({ kind: 'one', cards: [{ id: 9, integrity: 80 }], question: 'стоит ли?' })).toEqual({ kind: 'one', cards: [{ id: 9, integrity: 80 }], question: 'стоит ли?' })
    const ten = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((id) => ({ id, integrity: 90 }))
    expect(typeof parseReadingRequest({ kind: 'celtic', cards: ten })).toBe('object')
    expect(typeof parseReadingRequest({ kind: 'celtic', cards: ten.slice(0, 3) })).toBe('string')
    expect(typeof parseReadingRequest({ kind: 'cross', cards: ten })).toBe('string')
  })

  it('промпт кельтского креста называет позиции и их смысл', () => {
    const ten = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((id) => ({ id, integrity: 95 }))
    const msg = buildUserMessage({ kind: 'celtic', cards: ten })
    expect(msg).toMatch(/^Расклад «Кельтский крест»: суть, помеха/)
    expect(msg).toContain('Позиция «Итог (куда всё идёт, если ничего не менять)»: IX · Отшельник')
  })
})

describe('промпт', () => {
  it('описывает карты с позициями, целостностью и вопросом', () => {
    const msg = buildUserMessage({ kind: 'three', cards: [{ id: 0, integrity: 96 }, { id: 16, integrity: 21, omens: ['fullmoon', 'mercury'] }, { id: 23, integrity: 70 }], question: 'менять ли город?' })
    expect(msg).toContain('«менять ли город?»')
    expect(msg).toContain('Позиция «Ситуация (что происходит сейчас)»: 0 · Шут\n')
    expect(msg).toContain('целостность 96% [ЦЕЛ]')
    expect(msg).toContain('XVI · Башня (перевёрнута)')
    expect(msg).toContain('целостность 21% [ПОВРЕЖДЁН]')
    expect(msg).toContain('Перевёрнутая Башня')
    expect(msg).toContain('Знамения: полнолуние: сигнал перегрет; Меркурий ретрограден')
    expect(msg).not.toContain('сектор')
    expect(msg).toContain('Позиция «Совет (куда смотреть дальше)»: II · Двойка Жезлов')
    expect(msg).toContain('Помеха: план готов')
  })

  it('карта дня без вопроса; системный промпт содержит правила безопасности', () => {
    expect(buildUserMessage({ kind: 'day', cards: [{ id: 17, integrity: 100 }] })).toMatch(/^Карта дня\.[\s\S]*XVII · Звезда/)
    expect(SYSTEM_PROMPT).toContain('112')
    expect(SYSTEM_PROMPT).toContain('Не давай гарантий')
  })
})

describe('да или нет', () => {
  it('ответ зависит от карты и целостности', async () => {
    const { verdictOf } = await import('../src/yesno')
    expect(verdictOf(19, 95)).toBe('yes') // Солнце
    expect(verdictOf(19, 70)).toBe('likely')
    expect(verdictOf(19, 40)).toBe('unlikely')
    expect(verdictOf(16, 95)).toBe('no') // Башня
    expect(verdictOf(16, 70)).toBe('unlikely')
    expect(verdictOf(2, 95)).toBe('unclear') // Жрица
    expect(verdictOf(2, 30)).toBe('no')
  })

  it('у каждой из 78 карт есть склонность', async () => {
    const { leanOf } = await import('../src/yesno')
    for (let id = 0; id < 78; id++) expect(['yes', 'maybe', 'no']).toContain(leanOf(id))
    expect(leanOf(78)).toBeUndefined()
  })

  it('промпт передаёт ответ программы и объём', () => {
    const msg = buildUserMessage({ kind: 'yesno', cards: [{ id: 19, integrity: 99 }], question: 'получится?' })
    expect(msg).toContain('Ответ программы: ДА.')
    expect(msg).toContain('Объём: 1–2 коротких абзаца')
  })

  it('все расклады принимаются с нужным числом карт', async () => {
    const { SPREADS, SPREAD_KINDS, SPREAD_GROUPS, QUESTION_TOPICS } = await import('../src/spreads')
    for (const k of SPREAD_KINDS) {
      const n = SPREADS[k].positions.length
      const cards = Array.from({ length: n }, (_, i) => ({ id: i, integrity: 90 }))
      expect(typeof parseReadingRequest({ kind: k, cards })).toBe('object')
    }
    // каждый расклад есть на экране выбора, и готовые вопросы ведут в существующие расклады
    expect(SPREAD_GROUPS.flatMap((g) => g.kinds).sort()).toEqual([...SPREAD_KINDS].sort())
    for (const t of QUESTION_TOPICS) for (const q of t.questions) expect(SPREAD_KINDS).toContain(q.kind)
  })
})
