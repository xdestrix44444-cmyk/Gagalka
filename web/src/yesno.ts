// Расклад «Да или нет»: классический способ — у каждой карты есть склонность к «да», «нет» или «неясно»,
// а перевёрнутая (у нас — повреждённая) карта тянет ответ к «нет».

import { integrityState } from './deck'

export type Lean = 'yes' | 'maybe' | 'no'

const Y = 'yes', M = 'maybe', N = 'no'

/** Склонность карт по id: 22 старших, затем жезлы, кубки, мечи, пентакли (туз … король). */
const LEAN: readonly Lean[] = [
  // Шут, Маг, Жрица, Императрица, Император, Иерофант, Влюблённые, Колесница, Сила, Отшельник, Колесо
  Y, Y, M, Y, Y, Y, Y, Y, Y, M, Y,
  // Справедливость, Повешенный, Смерть, Умеренность, Дьявол, Башня, Звезда, Луна, Солнце, Суд, Мир
  M, M, N, Y, N, N, Y, M, Y, Y, Y,
  // жезлы
  Y, M, Y, Y, N, Y, M, Y, M, N, Y, Y, Y, Y,
  // кубки
  Y, Y, Y, N, N, Y, M, N, Y, Y, Y, Y, Y, Y,
  // мечи
  Y, M, N, M, N, M, N, N, N, N, M, Y, M, M,
  // пентакли
  Y, M, Y, M, N, Y, M, Y, Y, Y, Y, M, Y, Y,
]

export type Verdict = 'yes' | 'likely' | 'unclear' | 'unlikely' | 'no'

export const VERDICT_LABEL: Record<Verdict, string> = {
  yes: 'ДА',
  likely: 'СКОРЕЕ ДА',
  unclear: 'СИГНАЛ НЕЯСЕН',
  unlikely: 'СКОРЕЕ НЕТ',
  no: 'НЕТ',
}

/** Пояснение под ответом, пока нет ИИ-толкования. */
export const VERDICT_NOTE: Record<Verdict, string> = {
  yes: 'Карта легла прямо и смотрит в сторону «да».',
  likely: 'Карта говорит «да», но что-то мешает ему проявиться: посмотрите, что именно.',
  unclear: 'Карта не даёт прямого ответа. Возможно, решение ещё не созрело или вопрос стоит задать иначе.',
  unlikely: 'Карта склоняется к «нет», но не окончательно: многое зависит от вас.',
  no: 'Карта легла против. Это не приговор, а повод посмотреть на ситуацию с другой стороны.',
}

export const leanOf = (cardId: number): Lean => LEAN[cardId]

/** Ответ по карте и её целостности: целая — как есть, с помехой — мягче, повреждённая — к «нет». */
export function verdictOf(cardId: number, integrity: number): Verdict {
  const lean = leanOf(cardId)
  const state = integrityState(integrity)
  if (state === 'whole') return lean === 'yes' ? 'yes' : lean === 'no' ? 'no' : 'unclear'
  if (state === 'partial') return lean === 'yes' ? 'likely' : lean === 'no' ? 'unlikely' : 'unclear'
  return lean === 'yes' ? 'unlikely' : 'no'
}
