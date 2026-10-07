// Запрос на ИИ-толкование: общий для приложения и сервера (web/server).
// Карты вытягивает код в приложении; сервер только проверяет, что такие карты есть в игре.

import { OMEN_KEYS, type Omen } from './creep'
import { ACTIVE_IDS } from './deck'
import { SPREADS, isSpreadKind, type SpreadKind } from './spreads'

export const QUESTION_MAX = 300

export interface ReadingRequest {
  /** Карта дня или один из раскладов (spreads.ts). */
  kind: 'day' | SpreadKind
  /** Карты в порядке позиций расклада. */
  cards: { id: number; integrity: number; omens?: Omen[] }[]
  /** Вопрос человека, только для расклада. */
  question?: string
}

/** Проверяет присланный JSON. Возвращает нормализованный запрос или текст ошибки. */
export function parseReadingRequest(raw: unknown): ReadingRequest | string {
  if (!raw || typeof raw !== 'object') return 'ожидается объект'
  const r = raw as Record<string, unknown>
  if (r.kind !== 'day' && !isSpreadKind(r.kind)) return `kind: day или ${Object.keys(SPREADS).join(', ')}`
  const want = r.kind === 'day' ? 1 : SPREADS[r.kind].positions.length
  if (!Array.isArray(r.cards) || r.cards.length !== want) return `cards: нужно ${want}`
  const cards: ReadingRequest['cards'] = []
  for (const c of r.cards as unknown[]) {
    const { id, integrity, omens } = (c ?? {}) as Record<string, unknown>
    if (typeof id !== 'number' || !ACTIVE_IDS.includes(id)) return `карта ${String(id)} не в игре`
    if (cards.some((x) => x.id === id)) return 'карты не должны повторяться'
    if (typeof integrity !== 'number' || !Number.isInteger(integrity) || integrity < 0 || integrity > 100) return 'integrity: целое 0–100'
    if (omens !== undefined && (!Array.isArray(omens) || omens.some((o) => !OMEN_KEYS.includes(o)))) return 'omens: список известных знамений'
    cards.push(omens === undefined ? { id, integrity } : { id, integrity, omens: [...new Set(omens as Omen[])] })
  }
  let question: string | undefined
  if (r.kind !== 'day' && r.question !== undefined) {
    if (typeof r.question !== 'string') return 'question: строка'
    const q = r.question.trim()
    if (q.length > QUESTION_MAX) return `question: не длиннее ${QUESTION_MAX} символов`
    if (q) question = q
  }
  return { kind: r.kind, cards, question }
}
