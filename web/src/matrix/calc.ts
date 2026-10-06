// Матрица судьбы по методу Н. Ладини: 22 аркана из даты рождения.
// Восьмиугольник из двух квадратов: прямой (день, месяц, год, кармический хвост) и диагональный (линии рода),
// в центре — зона комфорта; на лучах к центру — промежуточные точки, справа снизу — линия денег и любви.

/** Аркан матрицы: 1–22, где 22 — Шут (в колоде «Нить» у Шута номер 0). */
export type Arcanum = number

/** Сводит число к аркану 1–22: пока больше 22, складываем его цифры. */
export function reduce(n: number): Arcanum {
  let x = Math.abs(Math.trunc(n))
  while (x > 22) x = String(x).split('').reduce((s, d) => s + Number(d), 0)
  return x === 0 ? 22 : x
}

/**
 * Номер карты в колоде «Нить» для аркана матрицы: 22 — Шут (0).
 * В матрице (как у Ладини) 8 — Справедливость, 11 — Сила; в колоде порядок Уэйта, наоборот.
 */
export function deckId(a: Arcanum): number {
  if (a === 8) return 11
  if (a === 11) return 8
  return a % 22
}

const digitSum = (n: number) => String(n).split('').reduce((s, d) => s + Number(d), 0)

/** Четыре опорные точки прямого квадрата. Из них считается всё остальное. */
export interface Base {
  /** Слева: день рождения. */
  a: Arcanum
  /** Сверху: месяц. */
  b: Arcanum
  /** Справа: год. */
  c: Arcanum
  /** Снизу: кармический хвост. */
  d: Arcanum
}

export interface Matrix extends Base {
  /** Центр: зона комфорта, суть характера. */
  e: Arcanum
  /** Диагональный квадрат: сверху слева, сверху справа, снизу справа, снизу слева. */
  f: Arcanum
  g: Arcanum
  h: Arcanum
  i: Arcanum
  /** Точки на лучах к центру: 1 — ближе к центру, 2 — ближе к краю. */
  a1: Arcanum
  a2: Arcanum
  b1: Arcanum
  b2: Arcanum
  c1: Arcanum
  c2: Arcanum
  d1: Arcanum
  d2: Arcanum
  /** Линия денег и любви: точка равновесия между ними, вход в деньги, вход в отношения. */
  x: Arcanum
  money: Arcanum
  love: Arcanum
  /** Предназначения: небо и земля, линии мужского и женского рода. */
  sky: Arcanum
  earth: Arcanum
  male: Arcanum
  female: Arcanum
  personal: Arcanum
  social: Arcanum
  spiritual: Arcanum
  planetary: Arcanum
}

/** Опорные точки по дате ГГГГ-ММ-ДД. */
export function baseOf(date: string): Base {
  const [y, m, d] = date.split('-').map(Number)
  const a = reduce(d)
  const b = reduce(m)
  const c = reduce(digitSum(y))
  return { a, b, c, d: reduce(a + b + c) }
}

/** Вся матрица из опорных точек. */
export function matrixFrom({ a, b, c, d }: Base): Matrix {
  const e = reduce(a + b + c + d)
  const [f, g, h, i] = [reduce(a + b), reduce(b + c), reduce(c + d), reduce(d + a)]
  const ray = (p: Arcanum) => {
    const p1 = reduce(p + e)
    return [p1, reduce(p + p1)] as const
  }
  const [a1, a2] = ray(a)
  const [b1, b2] = ray(b)
  const [c1, c2] = ray(c)
  const [d1, d2] = ray(d)
  const x = reduce(c1 + d1)
  const sky = reduce(b + d)
  const earth = reduce(a + c)
  const male = reduce(f + h)
  const female = reduce(g + i)
  const personal = reduce(sky + earth)
  const social = reduce(male + female)
  const spiritual = reduce(personal + social)
  return {
    a, b, c, d, e, f, g, h, i, a1, a2, b1, b2, c1, c2, d1, d2,
    x, money: reduce(x + c1), love: reduce(x + d1),
    sky, earth, male, female, personal, social, spiritual, planetary: reduce(social + spiritual),
  }
}

export function matrixOf(date: string): Matrix {
  return matrixFrom(baseOf(date))
}

/** Матрица пары: опорные точки двух людей складываются попарно, остальное считается как обычно. */
export function coupleMatrix(dateA: string, dateB: string): Matrix {
  const p = baseOf(dateA)
  const q = baseOf(dateB)
  return matrixFrom({ a: reduce(p.a + q.a), b: reduce(p.b + q.b), c: reduce(p.c + q.c), d: reduce(p.d + q.d) })
}
