import { OMEN_KEYS, type Omen } from './creep'
import type { SpreadKind } from './spreads'

export interface HistoryEntry {
  id: string
  at: number
  kind: 'day' | SpreadKind
  cards: number[]
  /** Целостность каждой карты из cards, по порядку. */
  integrity?: number[]
  /** Старый формат: номера карт, выпавших повреждёнными. */
  corrupt?: number[]
  /** Вопрос к раскладу, если был. */
  question?: string
  /** ИИ-толкование, когда оно пришло. */
  ai?: string
  /** Заметка человека. */
  note?: string
  /** Как отозвалось потом: сбылось, отчасти, не сбылось. */
  outcome?: Outcome
}

export type Outcome = 'yes' | 'partly' | 'no'
export const OUTCOMES: { key: Outcome; name: string; mark: string }[] = [
  { key: 'yes', name: 'сбылось', mark: '✓' },
  { key: 'partly', name: 'отчасти', mark: '~' },
  { key: 'no', name: 'не сбылось', mark: '✗' },
]

/** Целостность, которой заменяется старый флаг «повреждённая версия». */
const LEGACY_DAMAGED = 30

/** Целостность i-й карты записи; у старых записей восстанавливается из прежнего флага. */
export function entryIntegrity(h: HistoryEntry, i: number): number | null {
  if (h.integrity) return h.integrity[i] ?? null
  if (h.corrupt) return h.corrupt.includes(h.cards[i]) ? LEGACY_DAMAGED : null
  return null
}

const HISTORY_KEY = 'nit.history.v1'
const DAY_KEY = 'nit.day.v1'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // хранилище недоступно (приватный режим): работаем без сохранения
  }
}

export function loadHistory(): HistoryEntry[] {
  return read<HistoryEntry[]>(HISTORY_KEY, [])
}

export function saveHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'at'>): HistoryEntry {
  const full: HistoryEntry = { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: Date.now() }
  write(HISTORY_KEY, [full, ...loadHistory()].slice(0, 200))
  return full
}

/** Дописать в запись дневника: толкование, заметку, итог. */
export function updateHistoryEntry(id: string, patch: Partial<Omit<HistoryEntry, 'id' | 'at'>>): HistoryEntry | null {
  const list = loadHistory()
  const i = list.findIndex((h) => h.id === id)
  if (i < 0) return null
  list[i] = { ...list[i], ...patch }
  write(HISTORY_KEY, list)
  return list[i]
}

export interface DayCard {
  /** Запись дневника этой карты: туда же уходит толкование. */
  historyId?: string
  cardId: number
  integrity: number
  /** Знамения в момент вытягивания; у карт до их появления нет. */
  omens?: Omen[]
  /** ИИ-толкование карты дня: сохраняем, чтобы не запрашивать повторно. */
  ai?: string
}

export function loadDayCard(day: string): DayCard | null {
  const saved = read<{ day: string; cardId: number; integrity?: number; corrupt?: boolean; omens?: unknown; ai?: string; historyId?: string } | null>(DAY_KEY, null)
  if (!saved || saved.day !== day) return null
  // карта дня, вытянутая до появления целостности: толкование сохранено, процент восстанавливаем из флага
  const integrity = saved.integrity ?? (saved.corrupt ? LEGACY_DAMAGED : 95)
  const omens = Array.isArray(saved.omens) ? saved.omens.filter((o): o is Omen => OMEN_KEYS.includes(o)) : undefined
  return { cardId: saved.cardId, integrity, omens, ai: saved.ai, historyId: saved.historyId }
}

export function saveDayCard(day: string, card: DayCard) {
  write(DAY_KEY, { day, ...card })
}
