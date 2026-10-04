import { CREEP_LEVELS, type CreepLevel } from './creep'

export interface HistoryEntry {
  id: string
  at: number
  kind: 'day' | 'three'
  cards: number[]
  /** Номера карт из cards, выпавших в повреждённой версии. */
  corrupt?: number[]
}

const HISTORY_KEY = 'nit.history.v1'
const DAY_KEY = 'nit.day.v1'
const CREEP_KEY = 'nit.creep.v1'

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
  corrupt: boolean
}

export function loadDayCard(day: string): DayCard | null {
  const saved = read<{ day: string; cardId: number; corrupt?: boolean } | null>(DAY_KEY, null)
  return saved && saved.day === day ? { cardId: saved.cardId, corrupt: !!saved.corrupt } : null
}

export function saveDayCard(day: string, card: DayCard) {
  write(DAY_KEY, { day, ...card })
}

export function loadCreepLevel(): CreepLevel {
  const v = read<string>(CREEP_KEY, 'normal')
  return (CREEP_LEVELS as readonly string[]).includes(v) ? (v as CreepLevel) : 'normal'
}

export function saveCreepLevel(level: CreepLevel) {
  write(CREEP_KEY, level)
}

/** Номера карт, которые уже выпадали в повреждённой версии. */
export function foundCorrupt(history: HistoryEntry[]): Set<number> {
  const found = new Set<number>()
  for (const h of history) h.corrupt?.forEach((id) => found.add(id))
  return found
}
