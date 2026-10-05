// Экскурсия по карте: круг по очереди приближает главные места, а текст объясняет, что там.

import { ASPECTS, inSign, type Chart, type PlanetKey } from './chart'
import { HOUSE_SPHERE, nodeMeaning, planetMeaning } from './meanings'
import { mainAspect } from './portrait'
import type { Selection } from './Wheel'

export interface TourStep {
  title: string
  text: string
  focus: Selection
  /** Долгота, к которой приблизить круг; null — весь круг. */
  zoom: number | null
}

const INSTR: Record<PlanetKey, string> = { sun: 'Солнцем', moon: 'Луной', mercury: 'Меркурием', venus: 'Венерой', mars: 'Марсом', jupiter: 'Юпитером', saturn: 'Сатурном', uranus: 'Ураном', neptune: 'Нептуном', pluto: 'Плутоном' }

export function tourSteps(chart: Chart): TourStep[] {
  const by = (k: PlanetKey) => chart.planets.find((p) => p.key === k)!
  const steps: TourStep[] = [
    {
      title: 'ваше небо',
      text: 'Это небо в момент вашего рождения. Внешнее кольцо — двенадцать знаков зодиака, внутри — планеты на своих местах. Линии в центре показывают, как планеты связаны между собой.',
      focus: {},
      zoom: null,
    },
  ]
  if (chart.angles) {
    steps.push({
      title: 'асцендент',
      text: `Слева — Асцендент, точка, которая восходила на востоке, когда вы родились. Это ваша подача и первое впечатление. У вас он ${inSign(Math.floor(chart.angles.asc / 30))}.`,
      focus: { houses: [1] },
      zoom: chart.angles.asc,
    })
    steps.push({
      title: 'вершина карты',
      text: `Вверху — MC, самая высокая точка неба. Она говорит о призвании и о том, каким вы хотите быть в глазах мира. У вас MC ${inSign(Math.floor(chart.angles.mc / 30))}.`,
      focus: { houses: [10] },
      zoom: chart.angles.mc,
    })
  }
  for (const k of ['sun', 'moon'] as const) {
    const p = by(k)
    steps.push({
      title: k === 'sun' ? 'солнце' : 'луна',
      text: `${k === 'sun' ? 'Солнце — ваша воля и ощущение себя.' : 'Луна — чувства и то, что даёт вам покой.'} ${planetMeaning(p)}`,
      focus: { planets: [k] },
      zoom: p.lon,
    })
  }
  if (chart.angles) {
    const counts = Array.from({ length: 12 }, (_, i) => chart.planets.filter((p) => p.house === i + 1).length)
    const top = counts.indexOf(Math.max(...counts)) + 1
    steps.push({
      title: 'дома',
      text: `Двенадцать секторов внутри — дома, сферы жизни. Больше всего планет у вас в ${top}-м доме: «${HOUSE_SPHERE[top - 1]}». Сюда уходит много вашей энергии.`,
      focus: { houses: [top], planets: chart.planets.filter((p) => p.house === top).map((p) => p.key) },
      zoom: null,
    })
  }
  const main = mainAspect(chart)
  if (main)
    steps.push({
      title: 'связи',
      text: `Линии в центре — аспекты, связи между планетами. Бирюзовые — лёгкие, ржавые — напряжённые, светлые — слияния. Главная личная связь у вас — ${ASPECTS.find((a) => a.type === main.type)!.name} между ${INSTR[main.a]} и ${INSTR[main.b]}.`,
      focus: { planets: [main.a, main.b] },
      zoom: null,
    })
  const node = chart.points.find((p) => p.key === 'node')!
  steps.push({ title: 'северный узел', text: nodeMeaning(node), focus: { point: 'node' }, zoom: node.lon })
  steps.push({
    title: 'дальше сами',
    text: 'Экскурсия окончена. Касайтесь любых планет и домов — каждая подскажет, что значит. А ниже вас ждёт портрет по всей карте.',
    focus: {},
    zoom: null,
  })
  return steps
}
