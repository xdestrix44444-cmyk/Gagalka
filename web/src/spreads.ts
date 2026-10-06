// Расклады «Нити»: на одну карту, на три и кельтский крест на десять.
// Общие для приложения, сервера толкований и дневника.

export type SpreadKind = 'one' | 'three' | 'celtic'

export interface Position {
  name: string
  /** Что означает место в раскладе: подсказка человеку и ИИ-толкователю. */
  hint: string
}

export interface Spread {
  kind: SpreadKind
  name: string
  /** Короткая строка на выборе расклада. */
  line: string
  positions: Position[]
}

export const SPREADS: Record<SpreadKind, Spread> = {
  one: {
    kind: 'one',
    name: 'Одна карта',
    line: 'один ответ, без лишних слов',
    positions: [{ name: 'Ответ', hint: 'что нить говорит на ваш вопрос' }],
  },
  three: {
    kind: 'three',
    name: 'Три карты',
    line: 'ситуация, препятствие, совет',
    positions: [
      { name: 'Ситуация', hint: 'что происходит сейчас' },
      { name: 'Препятствие', hint: 'что мешает' },
      { name: 'Совет', hint: 'куда смотреть дальше' },
    ],
  },
  celtic: {
    kind: 'celtic',
    name: 'Кельтский крест',
    line: 'десять карт, вся ситуация целиком',
    positions: [
      { name: 'Суть', hint: 'что происходит сейчас' },
      { name: 'Помеха', hint: 'что пересекает путь' },
      { name: 'Основа', hint: 'корень, из которого всё выросло' },
      { name: 'Прошлое', hint: 'что уходит' },
      { name: 'Возможное', hint: 'лучшее, что может из этого выйти' },
      { name: 'Ближайшее', hint: 'что случится скоро' },
      { name: 'Вы сами', hint: 'как вы держитесь в этой ситуации' },
      { name: 'Окружение', hint: 'люди и обстоятельства вокруг' },
      { name: 'Надежды и страхи', hint: 'чего вы ждёте и чего боитесь' },
      { name: 'Итог', hint: 'куда всё идёт, если ничего не менять' },
    ],
  },
}

export const SPREAD_KINDS = Object.keys(SPREADS) as SpreadKind[]

export const isSpreadKind = (k: unknown): k is SpreadKind => typeof k === 'string' && k in SPREADS
