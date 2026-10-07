// Настройки «Нити»: громкость и мягкий режим. Хранятся в браузере; при изменении на window
// летит событие, чтобы звук, фон и экраны подстроились сразу.

const KEY = 'nit.settings.v1'
export const SETTINGS_EVENT = 'nit-settings'

export interface Settings {
  /** Громкость 0–1. */
  volume: number
  /** Мягкий режим: без мерцания, сбоев, глаз на фоне и жутких звуков. */
  soft: boolean
}

const DEFAULTS: Settings = { volume: 0.5, soft: false }

export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>
    return {
      volume: typeof raw.volume === 'number' ? Math.min(1, Math.max(0, raw.volume)) : DEFAULTS.volume,
      soft: raw.soft === true,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...loadSettings(), ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // без сохранения
  }
  applySettings(next)
  window.dispatchEvent(new Event(SETTINGS_EVENT))
  return next
}

/** Мягкий режим включается классом на <html>: стили сами выключают сбои и мерцание. */
export function applySettings(s: Settings = loadSettings()) {
  document.documentElement.classList.toggle('soft', s.soft)
}

/** Ключи всех данных «Нити» в браузере: для полного сброса. */
export function clearAllData() {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('nit.')) localStorage.removeItem(k)
    for (const k of Object.keys(sessionStorage)) if (k.startsWith('nit.')) sessionStorage.removeItem(k)
  } catch {
    // хранилище недоступно
  }
}
