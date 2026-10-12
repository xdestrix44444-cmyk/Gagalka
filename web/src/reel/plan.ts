// Ролики «что ждёт знак до конца 2026»: знаки, позиции и честное вытягивание карт.
// Карты тянет тот же код, что и в приложении; зерно — знак и дата, поэтому ролик можно пересобрать.

import { rollIntegrity } from '../creep'
import { DECK, integrityState, type IntegrityState } from '../deck'
import { drawCards } from '../draw'

export interface Sign {
  slug: string
  name: string
  /** Кому переслать: «знакомому Раку», «знакомым Близнецам». */
  to: string
}

export const SIGNS: readonly Sign[] = [
  { slug: 'oven', name: 'Овен', to: 'знакомому Овну' },
  { slug: 'telets', name: 'Телец', to: 'знакомому Тельцу' },
  { slug: 'bliznetsy', name: 'Близнецы', to: 'знакомым Близнецам' },
  { slug: 'rak', name: 'Рак', to: 'знакомому Раку' },
  { slug: 'lev', name: 'Лев', to: 'знакомому Льву' },
  { slug: 'deva', name: 'Дева', to: 'знакомой Деве' },
  { slug: 'vesy', name: 'Весы', to: 'знакомым Весам' },
  { slug: 'skorpion', name: 'Скорпион', to: 'знакомому Скорпиону' },
  { slug: 'strelets', name: 'Стрелец', to: 'знакомому Стрельцу' },
  { slug: 'kozerog', name: 'Козерог', to: 'знакомому Козерогу' },
  { slug: 'vodoley', name: 'Водолей', to: 'знакомому Водолею' },
  { slug: 'ryby', name: 'Рыбы', to: 'знакомым Рыбам' },
]

/** Три позиции расклада: месяц как каркас и смысл, который превращает карту в совет. */
export const POSITIONS = [
  { month: 'Октябрь', meaning: 'что отпустить' },
  { month: 'Ноябрь', meaning: 'что придёт' },
  { month: 'Декабрь', meaning: 'с чем войдёшь в 2027' },
] as const

export interface PlannedCard {
  id: number
  numeral: string
  name: string
  integrity: number
  state: IntegrityState
}

export interface ReelPlan {
  sign: Sign
  date: string
  seed: number
  cards: PlannedCard[]
}

/** Строка → 32-битное зерно (FNV-1a). */
export function hashSeed(s: string): number {
  let h = 0x811c9dc5
  for (const ch of s) {
    h ^= ch.codePointAt(0)!
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

/** Детерминированный генератор (mulberry32). */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Расклад для знака на дату (YYYY-MM-DD): карты и их целостность, как если бы их вытянули в приложении вечером. */
export function planReel(signSlug: string, date: string): ReelPlan {
  const sign = SIGNS.find((s) => s.slug === signSlug)
  if (!sign) throw new Error(`Нет знака «${signSlug}». Есть: ${SIGNS.map((s) => s.slug).join(', ')}`)
  const seed = hashSeed(`nit-reel|year2026|${sign.slug}|${date}`)
  const rng = seededRng(seed)
  const when = new Date(`${date}T19:00:00`)
  const cards = drawCards(3, rng).map((card) => {
    const integrity = rollIntegrity({ date: when, previousCardId: null, cardId: card.id }, rng)
    return { id: card.id, numeral: card.numeral, name: DECK[card.id].name, integrity, state: integrityState(integrity) }
  })
  return { sign, date, seed, cards }
}
