// Запрос на ИИ-толкование: общий для приложения и сервера (web/server).
// Карты вытягивает код в приложении; сервер только проверяет, что такие карты есть в игре.

import { ACTIVE_IDS } from './deck'
import { THREE_CARD_POSITIONS } from './draw'

export const QUESTION_MAX = 300

export interface ReadingRequest {
  kind: 'day' | 'three'
  /** Карты в порядке позиций: для 'three' — ситуация, препятствие, совет. */
  cards: { id: number; corrupt: boolean }[]
  /** Вопрос человека, только для расклада. */
  question?: string
}

/** Проверяет присланный JSON. Возвращает нормализованный запрос или текст ошибки. */
export function parseReadingRequest(raw: unknown): ReadingRequest | string {
  if (!raw || typeof raw !== 'object') return 'ожидается объект'
  const r = raw as Record<string, unknown>
  if (r.kind !== 'day' && r.kind !== 'three') return 'kind: day или three'
  const want = r.kind === 'day' ? 1 : THREE_CARD_POSITIONS.length
  if (!Array.isArray(r.cards) || r.cards.length !== want) return `cards: нужно ${want}`
  const cards: ReadingRequest['cards'] = []
  for (const c of r.cards as unknown[]) {
    const { id, corrupt } = (c ?? {}) as Record<string, unknown>
    if (typeof id !== 'number' || !ACTIVE_IDS.includes(id)) return `карта ${String(id)} не в игре`
    if (cards.some((x) => x.id === id)) return 'карты не должны повторяться'
    cards.push({ id, corrupt: corrupt === true })
  }
  let question: string | undefined
  if (r.kind === 'three' && r.question !== undefined) {
    if (typeof r.question !== 'string') return 'question: строка'
    const q = r.question.trim()
    if (q.length > QUESTION_MAX) return `question: не длиннее ${QUESTION_MAX} символов`
    if (q) question = q
  }
  return { kind: r.kind, cards, question }
}
