// Тексты для «неба сегодня» (транзиты к своей карте) и совместимости двух карт.
// Собираются из тем планет и характера связи; временные до подключения ИИ.

import { ASPECTS, PLANETS, inSign, computeChart, crossAspects, signElement, type AspectType, type Chart, type CrossAspect, type Element, type PlanetKey } from './chart'
import { HOUSE_SPHERE } from './meanings'
import { elementBalance } from './portrait'
import type { PortraitSection } from './portrait'

const name = (k: PlanetKey) => PLANETS.find((p) => p.key === k)!.name
const aspectName = (t: AspectType) => ASPECTS.find((a) => a.type === t)!.name
const FEMININE: PlanetKey[] = ['moon', 'venus']
/** «с вашим Солнцем», «с вашей Луной». */
const INSTR: Record<PlanetKey, string> = { sun: 'Солнцем', moon: 'Луной', mercury: 'Меркурием', venus: 'Венерой', mars: 'Марсом', jupiter: 'Юпитером', saturn: 'Сатурном', uranus: 'Ураном', neptune: 'Нептуном', pluto: 'Плутоном' }
const withYour = (k: PlanetKey) => `с ${FEMININE.includes(k) ? 'вашей' : 'вашим'} ${INSTR[k]}`

/** О чём планета в человеке. */
const THEME: Record<PlanetKey, string> = {
  sun: 'ощущение себя',
  moon: 'чувства и потребность в покое',
  mercury: 'мысли и слова',
  venus: 'симпатии и удовольствия',
  mars: 'желания и решимость',
  jupiter: 'вера и планы на рост',
  saturn: 'обязательства и границы',
  uranus: 'тяга к свободе',
  neptune: 'мечты и интуиция',
  pluto: 'глубинная сила',
}

/** Чем действует планета, когда проходит по небу. */
const FORCE: Record<PlanetKey, string> = {
  sun: 'вниманием и силой',
  moon: 'настроением',
  mercury: 'разговорами и новостями',
  venus: 'симпатией и удовольствиями',
  mars: 'напором и спешкой',
  jupiter: 'возможностями и щедростью',
  saturn: 'дисциплиной и сроками',
  uranus: 'неожиданностями',
  neptune: 'туманом и вдохновением',
  pluto: 'глубокими переменами',
}

export type Tone = 'soft' | 'hard' | 'fusion'
export const tone = (t: AspectType): Tone => (t === 'trine' || t === 'sextile' ? 'soft' : t === 'conjunction' ? 'fusion' : 'hard')

const PERSONAL: PlanetKey[] = ['sun', 'moon', 'mercury', 'venus', 'mars']

export interface SkyToday {
  chart: Chart
  transits: CrossAspect[]
  lines: { text: string; aspect?: CrossAspect }[]
}

/**
 * Небо сегодня: положение планет сейчас и самые точные связи с личными планетами карты.
 * В транзитах a — планета рождения, b — планета на небе сейчас.
 */
export function skyToday(natal: Chart, now = new Date()): SkyToday {
  const sky = computeChart(now)
  // Луна за день проходит 13°, поэтому её связи не перечисляем — о Луне отдельная строка
  const transits = crossAspects(natal.planets, sky.planets.filter((p) => p.key !== 'moon'), 0.35).filter((a) => PERSONAL.includes(a.a) || a.a === 'saturn')
  const lines: SkyToday['lines'] = []
  const moon = sky.planets.find((p) => p.key === 'moon')!
  if (natal.angles) {
    const house = natal.angles.cusps.findIndex((c, i) => {
      const next = natal.angles!.cusps[(i + 1) % 12]
      return (moon.lon - c + 360) % 360 < (next - c + 360) % 360
    })
    lines.push({ text: `Луна сегодня ${inSign(moon.sign)} и проходит ваш ${house + 1}-й дом — сферу «${HOUSE_SPHERE[house]}». Настроение дня легко цепляется именно за неё.` })
  } else lines.push({ text: `Луна сегодня ${inSign(moon.sign)}: так окрашено общее настроение дня.` })
  for (const a of transits.slice(0, 4)) {
    const t = tone(a.type)
    const head = `${name(a.b)} — ${aspectName(a.type)} ${withYour(a.a)}.`
    const body =
      t === 'soft'
        ? `Поддержка: тема «${THEME[a.a]}» сейчас подпитывается ${FORCE[a.b]}. Хорошее время, чтобы этим воспользоваться.`
        : t === 'hard'
          ? `Проверка: тема «${THEME[a.a]}» сталкивается с ${FORCE[a.b]}. Не торопитесь и не принимайте это на свой счёт.`
          : `Фокус: тема «${THEME[a.a]}» сливается с ${FORCE[a.b]} и сейчас звучит громче остальных.`
    lines.push({ text: `${head} ${body}`, aspect: a })
  }
  if (transits.length === 0) lines.push({ text: 'Тесных связей неба с вашей картой сегодня нет: спокойный день, его можно наполнить чем угодно.' })
  return { chart: sky, transits, lines }
}

const COMPAT: Record<'same' | 'friend' | 'other', string> = {
  same: 'одна стихия: вы понимаете друг друга без слов, но и ошибаетесь одинаково',
  friend: 'стихии дружат и подпитывают друг друга: рядом легко',
  other: 'разные стихии: вы говорите на разных языках, и это требует перевода — но именно так вы учитесь друг у друга',
}
const FRIENDS: Record<Element, Element> = { fire: 'air', air: 'fire', earth: 'water', water: 'earth' }
const relation = (a: Element, b: Element) => (a === b ? 'same' : FRIENDS[a] === b ? 'friend' : 'other')
const ELEMENT_NAME: Record<Element, string> = { fire: 'огня', earth: 'земли', air: 'воздуха', water: 'воды' }

export interface Synastry {
  cross: CrossAspect[]
  sections: PortraitSection[]
}

/** Совместимость: связи планет A (a) с планетами B (b) и портрет пары. */
export function synastry(A: Chart, B: Chart, nameA: string, nameB: string): Synastry {
  const cross = crossAspects(A.planets, B.planets, 0.75)
  const pa = (k: PlanetKey) => A.planets.find((p) => p.key === k)!
  const pb = (k: PlanetKey) => B.planets.find((p) => p.key === k)!
  const sections: PortraitSection[] = []

  const sm1 = relation(signElement(pa('sun').sign), signElement(pb('moon').sign))
  const sm2 = relation(signElement(pb('sun').sign), signElement(pa('moon').sign))
  sections.push({
    title: 'солнце и луна',
    text: `Солнце ${inSign(pa('sun').sign)} (${nameA}) и Луна ${inSign(pb('moon').sign)} (${nameB}): ${COMPAT[sm1]}.\n\nСолнце ${inSign(pb('sun').sign)} (${nameB}) и Луна ${inSign(pa('moon').sign)} (${nameA}): ${COMPAT[sm2]}.`,
    focus: { planets: ['sun', 'moon'] },
  })

  const attraction = cross.filter((a) => (a.a === 'venus' && a.b === 'mars') || (a.a === 'mars' && a.b === 'venus') || (a.a === 'venus' && a.b === 'venus') || (a.a === 'sun' && a.b === 'moon') || (a.a === 'moon' && a.b === 'sun'))
  if (attraction.length) {
    const a = attraction[0]
    const t = tone(a.type)
    sections.push({
      title: 'притяжение',
      text: `${name(a.a)} (${nameA}) и ${name(a.b)} (${nameB}) — ${aspectName(a.type)}. ${
        t === 'soft' ? 'Лёгкое притяжение: вам просто нравится быть рядом, и это не требует усилий.' : t === 'fusion' ? 'Сильное притяжение: трудно не заметить друг друга, вас тянет друг к другу почти сразу.' : 'Искра с напряжением: тянет, но и задевает. Такие пары не бывают скучными.'
      }`,
      focus: { planets: [a.a] },
    })
  } else
    sections.push({ title: 'притяжение', text: 'Явной искры по картам нет. Это не приговор: притяжение растёт постепенно, через общее дело, разговоры и время.', focus: {} })

  const personal = cross.filter((a) => PERSONAL.includes(a.a) && PERSONAL.includes(a.b))
  const soft = personal.find((a) => tone(a.type) === 'soft')
  if (soft)
    sections.push({
      title: 'где легко',
      text: `${name(soft.a)} (${nameA}) и ${name(soft.b)} (${nameB}) — ${aspectName(soft.type)}. С одной стороны — ${THEME[soft.a]}, с другой — ${THEME[soft.b]}, и они говорят на одном языке. Здесь вы отдыхаете друг с другом.`,
      focus: { planets: [soft.a] },
    })
  const hard = personal.find((a) => tone(a.type) === 'hard')
  if (hard)
    sections.push({
      title: 'где искрит',
      text: `${name(hard.a)} (${nameA}) и ${name(hard.b)} (${nameB}) — ${aspectName(hard.type)}. С одной стороны — ${THEME[hard.a]}, с другой — ${THEME[hard.b]}, и они задевают друг друга. Здесь чаще всего возникают споры. Помогает договариваться заранее, а не в момент обиды.`,
      focus: { planets: [hard.a] },
    })

  const saturn = cross.find((a) => (a.a === 'saturn' && PERSONAL.includes(a.b)) || (a.b === 'saturn' && PERSONAL.includes(a.a)))
  if (saturn)
    sections.push({
      title: 'опора',
      text:
        tone(saturn.type) === 'hard'
          ? 'Сатурн одного касается личных планет другого напряжённо: кто-то из вас может чувствовать себя ограниченным или «воспитываемым». Важно не превращать заботу в контроль.'
          : 'Сатурн одного мягко касается личных планет другого: в паре есть опора и чувство надёжности. Такие отношения со временем крепнут.',
      focus: { planets: [saturn.a] },
    })

  const ea = elementBalance(A)
  const eb = elementBalance(B)
  const els = Object.keys(ea) as Element[]
  const topA = els.sort((x, y) => ea[y] - ea[x])[0]
  const topB = [...els].sort((x, y) => eb[y] - eb[x])[0]
  sections.push({
    title: 'стихии пары',
    text:
      topA === topB
        ? `У обоих больше всего ${ELEMENT_NAME[topA]}. Вы похожи по темпераменту: легко понимать друг друга, но и слабые места у вас общие — их стоит знать.`
        : `${nameA}: больше всего ${ELEMENT_NAME[topA]}. ${nameB}: больше всего ${ELEMENT_NAME[topB]}. Вы разные по темпераменту и можете дополнять друг друга, если не пытаться переделать.`,
    focus: {},
  })

  const nSoft = cross.filter((a) => tone(a.type) === 'soft').length
  const nHard = cross.filter((a) => tone(a.type) === 'hard').length
  const nFusion = cross.filter((a) => tone(a.type) === 'fusion').length
  sections.push({
    title: 'нить между вами',
    text: `Между вашими картами ${cross.length} связей: ${nSoft} лёгких, ${nHard} напряжённых и ${nFusion} слияний. ${
      nSoft >= nHard ? 'Лёгких больше: в этой паре многое получается само.' : 'Напряжённых больше: эта пара растёт через трение, и скучно в ней не будет.'
    } Карты показывают, где легко и где трудно, но не решают за вас — решают двое.`,
    focus: {},
  })
  return { cross, sections }
}
