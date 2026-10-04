import { DECK, type Arcana } from './deck'

/** Источник случайных чисел в [0, 1). Подменяется в тестах. */
export type Rng = () => number

export const cryptoRng: Rng = () => {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 2 ** 32
}

/** Выбирает n разных карт; карты вытягивает код, а не ИИ. */
export function drawCards(n: number, rng: Rng = cryptoRng): Arcana[] {
  if (n < 0 || n > DECK.length) throw new RangeError(`Нельзя вытянуть ${n} карт`)
  const pool = [...DECK]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, n)
}

/** Ключ дня в локальном времени пользователя, например "2026-10-04". */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const THREE_CARD_POSITIONS = ['Ситуация', 'Препятствие', 'Совет'] as const
