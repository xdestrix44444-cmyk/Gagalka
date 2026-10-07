// Гороскоп по знаку зодиака на день и неделю — для тех, кто не строил натальную карту.
// Классический «солнечный» способ: знак считается первым домом, следующий знак — вторым и так далее,
// и смотрим, по каким сферам сейчас идут Луна и планеты. Тексты временные до подключения ИИ.

import { moonAge } from '../creep'
import { SIGNS_GEN, computeChart, inSign, type PlanetKey } from './chart'
import { HOUSE_SPHERE } from './meanings'

const SYNODIC = 29.530588853
const DAY = 86_400_000

/** Сфера, по которой идёт планета, если считать знак человека первым домом: 0–11. */
export const solarHouse = (sign: number, planetSign: number) => (planetSign - sign + 12) % 12

/** Луна за день: по сферам, считая от знака человека. */
const MOON_DAY = [
  'Луна в вашем знаке: чувства ближе к поверхности, чем обычно. Хороший день, чтобы заняться собой и не подстраиваться под чужое настроение.',
  'Луна проходит сферу денег и опоры. Тянет к уюту и покупкам, которые утешают. Проверьте, что вам действительно нужно, а что просто успокаивает.',
  'Луна в сфере общения: день сообщений, коротких встреч и случайных разговоров. Ответьте тому, кому давно собирались.',
  'Луна проходит сферу дома и корней. Хочется спрятаться в своём углу — это не лень, а подзарядка. Позвоните родным или наведите порядок в одном ящике.',
  'Луна в сфере радости и любви. Позвольте себе что-то просто потому, что это приятно: флирт, творчество, игру. День не для подвигов, а для удовольствия.',
  'Луна проходит сферу работы и быта. Хорошо разгребать мелкие дела и заботиться о теле: сон, еда, прогулка. Маленький порядок сегодня даст ясность завтра.',
  'Луна в сфере партнёрства: другие люди важнее обычного, и их настроение легко передаётся вам. Хороший день, чтобы договориться, а не победить.',
  'Луна проходит сферу глубины и перемен. Могут всплыть старые чувства или чужие секреты. Не торопитесь с выводами: сегодня важнее понять, чем решить.',
  'Луна в сфере дороги и смысла. Тянет за горизонт: в новые места, книги, идеи. Даже прогулка новым маршрутом сработает.',
  'Луна проходит сферу призвания. Ваши действия заметнее обычного, особенно для тех, кто оценивает. Покажите то, что давно лежит готовым.',
  'Луна в сфере друзей и планов. Хороший день для своих людей и общих затей. Напишите в чат, который давно молчит.',
  'Луна проходит сферу тишины. Сил может быть меньше, а снов и предчувствий — больше. Не перегружайте день: отдых сегодня — часть работы.',
] as const

/** Планета в самом знаке человека. */
const IN_YOUR_SIGN: Partial<Record<PlanetKey, string>> = {
  sun: 'Солнце сейчас в вашем знаке — сезон дня рождения. Время задавать тон и начинать свой год заново.',
  mercury: 'Меркурий в вашем знаке: слова и мысли даются легче, вас лучше слышат.',
  venus: 'Венера в вашем знаке: вы притягательнее обычного. Хорошее время для встреч и для себя.',
  mars: 'Марс в вашем знаке: много энергии и нетерпения. Направьте её в дело, а не в спор.',
  jupiter: 'Юпитер в вашем знаке: год роста и удачных совпадений. Не бойтесь просить больше.',
  saturn: 'Сатурн в вашем знаке: время взрослеть и отвечать за своё. Тяжело, но построенное сейчас простоит долго.',
  uranus: 'Уран в вашем знаке: жизнь сама подталкивает к переменам и свободе.',
  neptune: 'Нептун в вашем знаке: границы размыты — больше вдохновения, меньше ясности.',
  pluto: 'Плутон в вашем знаке: глубокая перестройка, которая идёт годами.',
}

/** Быстрые планеты на неделе: где они сейчас идут по сферам человека. */
const WEEK: { key: PlanetKey; text: (sphere: string) => string; retro?: string }[] = [
  { key: 'sun', text: (s) => `Солнце освещает сферу «${s}»: сюда сейчас уходит главное внимание.` },
  { key: 'mercury', text: (s) => `Меркурий в сфере «${s}»: разговоры, новости и решения недели крутятся вокруг неё.`, retro: 'Он ретрограден: перепроверяйте договорённости и не спешите подписывать.' },
  { key: 'venus', text: (s) => `Венера в сфере «${s}»: здесь проще найти тепло, красоту и удовольствие.`, retro: 'Она ретроградна: возвращаются старые симпатии и вопросы о том, чего вы на самом деле хотите.' },
  { key: 'mars', text: (s) => `Марс в сфере «${s}»: здесь больше энергии и больше споров. Действуйте, но не рубите сплеча.`, retro: 'Он ретрограден: силы лучше тратить на то, чтобы доделать начатое.' },
]

const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })

export type HoroscopePeriod = 'day' | 'week'

export interface Horoscope {
  /** Короткая строка о небе для всех: Луна и её фаза. */
  sky: string
  lines: string[]
}

/** Фаза Луны словами и освещённость. */
function moonPhase(date: Date): string {
  const age = moonAge(date)
  const lit = Math.round(((1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2) * 100)
  if (age < 1.5 || age > SYNODIC - 1.5) return 'новолуние'
  if (Math.abs(age - SYNODIC / 2) < 1.5) return 'полнолуние'
  return `${age < SYNODIC / 2 ? 'растущая' : 'убывающая'} луна, ${lit}%`
}

/** Новолуния и полнолуния в ближайшие дни: момент, когда возраст луны проходит 0 или половину цикла. */
export function lunations(from: Date, days: number): { kind: 'new' | 'full'; at: Date }[] {
  const out: { kind: 'new' | 'full'; at: Date }[] = []
  const step = 3 * 3_600_000
  let prev = moonAge(from)
  for (let t = from.getTime() + step; t <= from.getTime() + days * DAY; t += step) {
    const age = moonAge(new Date(t))
    if (age < prev) out.push({ kind: 'new', at: new Date(t) })
    else if (prev < SYNODIC / 2 && age >= SYNODIC / 2) out.push({ kind: 'full', at: new Date(t) })
    prev = age
  }
  return out
}

export function horoscope(sign: number, period: HoroscopePeriod, now = new Date()): Horoscope {
  const sky = computeChart(now)
  const moon = sky.planets.find((p) => p.key === 'moon')!
  const skyLine = `Луна ${inSign(moon.sign)} · ${moonPhase(now)}`
  const sphere = (planetSign: number) => HOUSE_SPHERE[solarHouse(sign, planetSign)]
  const lines: string[] = []

  if (period === 'day') {
    lines.push(MOON_DAY[solarHouse(sign, moon.sign)])
    for (const p of sky.planets) if (['sun', 'mercury', 'venus', 'mars'].includes(p.key) && p.sign === sign) lines.push(IN_YOUR_SIGN[p.key]!)
    const age = moonAge(now)
    if (age < 1.5 || age > SYNODIC - 1.5) lines.push(`Сегодня новолуние в сфере «${sphere(moon.sign)}»: хорошее время загадать и начать что-то новое именно здесь.`)
    else if (Math.abs(age - SYNODIC / 2) < 1.5) lines.push(`Сегодня полнолуние в сфере «${sphere(moon.sign)}»: эмоции на пике, что-то здесь дозревает до итога.`)
    if (sky.planets.find((p) => p.key === 'mercury')!.retro) lines.push('Меркурий ретрограден: перечитывайте сообщения перед отправкой и не удивляйтесь задержкам.')
    return { sky: skyLine, lines }
  }

  // неделя: быстрые планеты в середине недели, лунации за семь дней, медленные планеты в знаке человека
  const mid = computeChart(new Date(now.getTime() + 3.5 * DAY))
  for (const w of WEEK) {
    const p = mid.planets.find((x) => x.key === w.key)!
    lines.push(`${w.text(sphere(p.sign))}${p.retro && w.retro ? ` ${w.retro}` : ''}`)
  }
  for (const l of lunations(now, 7)) {
    const m = computeChart(l.at).planets.find((p) => p.key === 'moon')!
    const when = dayMonth.format(l.at)
    lines.push(
      l.kind === 'new'
        ? `${when} — новолуние в сфере «${sphere(m.sign)}»: момент, чтобы начать здесь что-то новое.`
        : `${when} — полнолуние в сфере «${sphere(m.sign)}»: здесь что-то дозреет до итога или откроется.`,
    )
  }
  for (const p of mid.planets) if (['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].includes(p.key) && p.sign === sign) lines.push(IN_YOUR_SIGN[p.key]!)
  return { sky: skyLine, lines }
}

/** «Гороскоп для Овна». */
export const forSign = (sign: number) => `для ${SIGNS_GEN[sign]}`
