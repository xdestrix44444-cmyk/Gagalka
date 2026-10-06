export interface HistoryEntry {
  id: string
  at: number
  kind: 'day' | 'three'
  cards: number[]
  /** Целостность каждой карты из cards, по порядку. */
  integrity?: number[]
  /** Старый формат: номера карт, выпавших повреждёнными. */
  corrupt?: number[]
}

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

export interface DayCard {
  cardId: number
  integrity: number
  /** ИИ-толкование карты дня: сохраняем, чтобы не запрашивать повторно. */
  ai?: string
}

export function loadDayCard(day: string): DayCard | null {
  const saved = read<{ day: string; cardId: number; integrity?: number; corrupt?: boolean; ai?: string } | null>(DAY_KEY, null)
  if (!saved || saved.day !== day) return null
  // карта дня, вытянутая до появления целостности: толкование сохранено, процент восстанавливаем из флага
  const integrity = saved.integrity ?? (saved.corrupt ? LEGACY_DAMAGED : 95)
  return { cardId: saved.cardId, integrity, ai: saved.ai }
}

export function saveDayCard(day: string, card: DayCard) {
  write(DAY_KEY, { day, ...card })
}
