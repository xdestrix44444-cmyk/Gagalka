import { beforeEach, describe, expect, it } from 'vitest'

// в тестах нет браузера: простое хранилище в памяти вместо localStorage
class MemoryStorage {
  private m = new Map<string, string>()
  getItem(k: string) {
    return this.m.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v))
  }
  removeItem(k: string) {
    this.m.delete(k)
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null
  }
  get length() {
    return this.m.size
  }
}

const g = globalThis as unknown as Record<string, unknown>

beforeEach(() => {
  const ls = new MemoryStorage()
  const ss = new MemoryStorage()
  // Object.keys(localStorage) в браузере отдаёт ключи; повторяем это через Proxy
  const keyed = (st: MemoryStorage) => new Proxy(st, { ownKeys: () => Array.from({ length: st.length }, (_, i) => st.key(i)!), getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) })
  g.localStorage = keyed(ls)
  g.sessionStorage = keyed(ss)
  g.window = { dispatchEvent: () => true, addEventListener: () => {} }
  g.document = { documentElement: { classList: { toggle: () => {} } } }
})

describe('дневник', () => {
  it('запись дописывается: толкование, заметка, итог', async () => {
    const { loadHistory, saveHistoryEntry, updateHistoryEntry } = await import('./storage')
    const h = saveHistoryEntry({ kind: 'three', cards: [1, 2, 3], integrity: [90, 70, 40], question: 'что дальше?' })
    updateHistoryEntry(h.id, { ai: 'толкование' })
    updateHistoryEntry(h.id, { note: 'запомнить', outcome: 'partly' })
    expect(loadHistory()[0]).toMatchObject({ id: h.id, question: 'что дальше?', ai: 'толкование', note: 'запомнить', outcome: 'partly' })
    expect(updateHistoryEntry('нет-такой', { note: 'x' })).toBeNull()
  })

  it('карта дня помнит свою запись дневника', async () => {
    const { loadDayCard, saveDayCard } = await import('./storage')
    saveDayCard('2026-10-07', { cardId: 9, integrity: 80, historyId: 'h1' })
    expect(loadDayCard('2026-10-07')?.historyId).toBe('h1')
  })
})

describe('настройки', () => {
  it('громкость ограничена 0–1, мягкий режим по умолчанию выключен', async () => {
    const { loadSettings, saveSettings } = await import('./settings')
    expect(loadSettings()).toEqual({ volume: 0.5, soft: false })
    saveSettings({ volume: 3, soft: true })
    expect(loadSettings()).toEqual({ volume: 1, soft: true })
  })

  it('удаление данных стирает только ключи «Нити»', async () => {
    const { clearAllData } = await import('./settings')
    localStorage.setItem('nit.history.v1', '[]')
    localStorage.setItem('nit.people.v1', '[]')
    localStorage.setItem('чужое', '1')
    clearAllData()
    expect(localStorage.getItem('nit.history.v1')).toBeNull()
    expect(localStorage.getItem('nit.people.v1')).toBeNull()
    expect(localStorage.getItem('чужое')).toBe('1')
  })
})
