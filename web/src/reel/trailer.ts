// Трейлер «Камеры»: стол гадалки через старые камеры наблюдения. Расписание в миллисекундах —
// по нему собираются и картинка (TrailerReel.tsx), и звук (scripts/reel/audio/trailer_mix.py).
// Голос только у диктора; картинка и музыка связаны: эмблемы гаснут на нотах шкатулки,
// монтаж переключений ускоряется вместе с шкатулкой и тиканьем.
import type { VoiceInfo } from './timeline'

/** Переход между каналами: мягко нарастающий белый шум; style — как именно ломается картинка. */
export interface Switch {
  from: number
  to: number
  style: 'roll' | 'tear' | 'dissolve' | 'vroll'
  /** Номер канала, который появляется («CH 02» по центру). */
  ch: number
}

/** Кадр быстрого монтажа: что мелькает на канале. */
export type ShotKind = 'eye' | 'tower' | 'line' | 'eye2' | 'death' | 'ring' | 'snow'
export interface Shot {
  at: number
  kind: ShotKind
  ch: number
}

export interface TrailerTimeline {
  /** Кинескоп разгорается из точки. */
  on: number
  /** Канал 01: круг эмблем; гаснут парами на нотах dimNotes, остаётся одна. */
  ring: { from: number; to: number }
  dimNotes: number[]
  /** Зум к последней эмблеме. */
  ringZoom: { from: number; snaps: number[]; to: number }
  /** Быстрый монтаж: каналы щёлкают всё чаще. */
  montage: { from: number; shots: Shot[]; to: number }
  /** Нет сигнала: всё тонет в снеге. */
  lost: { from: number; to: number }
  /** Обрыв: чёрный кадр и полная тишина. */
  black: { from: number; to: number }
  /** Резко, без перехода: Дьявол крупно, рывки ×2 и ×4, между ними — непрерывный наезд. */
  devil: { from: number; snaps: number[]; to: number }
  /** Канал 03: терминал сам печатает запрос. */
  term: { from: number; to: number }
  /** Титр НИТЬ.EXE на чёрном. */
  title: { from: number; to: number }
  /** Кинескоп гаснет в точку. */
  off: { from: number; to: number }
  switches: Switch[]
  total: number
  /** Ноты шкатулки: [время, номер ноты мотива]; вторая часть — на октаву ниже. */
  boxNotes: [number, number][]
  lowNotes: [number, number][]
  /** Тиканье часов: ускоряется к монтажу и обрывается на тишине. */
  ticks: number[]
  voice: { file: string; at: number }[]
}

/** Последняя мерцающая эмблема (0–11) — чья, по задумке не понять: на зуме она размыта. */
export const LAST_EMBLEM = 7
/** Карта, к которой ведёт зум, и карты, мелькающие в монтаже. */
export const DEVIL = 15
export const TOWER = 16
export const DEATH = 13

export function buildTrailer(v: Record<string, VoiceInfo>): TrailerTimeline {
  const ms = (s: number) => Math.round(s * 1000)
  const voice: TrailerTimeline['voice'] = []
  /** Реплика диктора начинается ровно в момент t (если она уже озвучена). */
  const say = (file: string, t: number) => {
    if (v[file]) voice.push({ file: `${file}.wav`, at: t - ms(v[file].start) })
  }
  say('card1', 2600) // «Ты снова здесь.»
  say('card2', 9850) // «Не переключай.» — до щелчка переключателя, чтобы не утонуло в шуме
  say('card3', 16300) // «Связь слабеет.»
  say('card4', 30400) // «Ответ уже готов. Осталось задать вопрос.»

  // шкатулка: сначала спокойно, раз в 1,5 с; на 6–9 с быстрее — на каждой ноте гаснут две эмблемы
  const calm = [2200, 3700, 5200]
  const dimNotes = [6000, 6500, 7000, 7500, 8000, 8500]
  // монтаж: каналы щёлкают всё чаще; на каждой смене — нота шкатулки
  const gaps = [800, 650, 520, 420, 340, 280, 230, 190, 160, 140, 120]
  const kinds: ShotKind[] = ['eye', 'line', 'tower', 'eye2', 'ring', 'death', 'eye', 'snow', 'tower', 'eye2', 'death', 'snow']
  const shots: Shot[] = []
  let t = 11300
  kinds.forEach((kind, i) => {
    shots.push({ at: t, kind, ch: 2 + ((i * 5) % 7) })
    t += gaps[i] ?? 120
  })
  const boxNotes: [number, number][] = [...calm, ...dimNotes, ...shots.map((s) => s.at)].map((at, i) => [at, i % 5])

  // вторая часть шкатулки: ниже и медленнее, паузы растут — завод кончается
  const lowNotes: [number, number][] = []
  let lt = 27400
  let gap = 1800
  for (let k = 0; lt < 33300; k++) {
    lowNotes.push([Math.round(lt), k % 5])
    lt += gap
    gap *= 1.1
  }

  // тиканье: раз в секунду, на монтаже чаще и чаще, до самой тишины
  const ticks: number[] = []
  for (let tk = 600; tk < 18000; ) {
    ticks.push(Math.round(tk))
    tk += tk < 10500 ? 1000 : Math.max(180, 1000 - (tk - 10500) * 0.16)
  }

  return {
    on: 1500,
    ring: { from: 0, to: 9000 },
    dimNotes,
    ringZoom: { from: 9000, snaps: [9000, 9700], to: 10500 },
    montage: { from: 10500, shots, to: 16000 },
    lost: { from: 16000, to: 18000 },
    black: { from: 18000, to: 20000 },
    devil: { from: 20000, snaps: [20000, 23000], to: 26000 },
    term: { from: 27300, to: 30000 },
    title: { from: 30000, to: 34200 },
    off: { from: 34200, to: 34900 },
    switches: [
      { from: 10500, to: 11300, style: 'tear', ch: 2 },
      { from: 26000, to: 27300, style: 'vroll', ch: 3 },
    ],
    total: 34900,
    boxNotes,
    lowNotes,
    ticks,
    voice,
  }
}
