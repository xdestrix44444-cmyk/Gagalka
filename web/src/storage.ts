export interface HistoryEntry {
  id: string
  at: number
  kind: 'day' | 'three'
  cards: number[]
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

export function loadDayCard(day: string): number | null {
  const saved = read<{ day: string; cardId: number } | null>(DAY_KEY, null)
  return saved && saved.day === day ? saved.cardId : null
}

export function saveDayCard(day: string, cardId: number) {
  write(DAY_KEY, { day, cardId })
}
