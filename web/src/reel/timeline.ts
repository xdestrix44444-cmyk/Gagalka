// Расписание ролика в миллисекундах: и картинка, и звук собираются по нему, поэтому не расходятся.
import type { Sfx } from '../sound'

// Длины частей берутся из озвучки: терминал озвучивает процесс, диктор читает толкования.

/** Длина файла озвучки и где в нём начинается и кончается речь, в секундах. */
export interface VoiceInfo {
  sec: number
  start: number
  end: number
  /** Опорные точки субтитров: [номер символа, мс от начала файла]. */
  subs?: [number, number][]
  /** Фразы терминала: [начало, конец] в секундах от начала файла. */
  segs?: [number, number][]
}

/** Терминал: open, err, close; диктор: card1–3. */
export type Voices = Record<string, VoiceInfo>

export type CardState = 'whole' | 'partial' | 'damaged'

export interface CardTimes {
  /** Рубашка выезжает из ряда в центр. */
  start: number
  /** Полоса чтения файла: идёт с from до to (у повреждённой застревает на to). */
  load: { from: number; to: number }
  /** Повреждённая: ошибка чтения, сорвавшийся переворот и быстрая повторная загрузка. */
  error?: { at: number; fail: number; failEnd: number; retryEnd: number }
  /** Частично целая: полоса рябит помехами с from до to, вместо тишины — треск. */
  noise?: { from: number; to: number }
  flip: number
  flipEnd: number
  /** Начало субтитров диктора. */
  text: number
  end: number
  /** Субтитры диктора: [номер символа, мс от начала ролика]. */
  subs: [number, number][]
}

export interface Timeline {
  /** Загрузка: включение кинескопа, строки лога; затем экран соединения, где надписи появляются
   *  вместе со словами терминала: «Соединение установлено» (connected … connectedEnd), «Запрос:» (query), знак (sign). */
  boot: { on: number; lines: number[]; connected: number; connectedEnd: number; query: number; sign: number; end: number }
  /** Имя знака и три рубашки; glitch — когда сбоит рубашка худшей карты (повреждённой, иначе с помехой). */
  hook: {
    start: number; end: number; glitch: number | null; worst: number; kind: CardState | null
    /** Когда печатается строка состояния (вместе со второй фразой, если она есть). */
    alert: number
    /** Все карты целые: рубашки гаснут и гул пропадает с at до end. */
    quiet: { at: number; end: number } | null
  }
  cards: CardTimes[]
  /** Мелькнувшая на два кадра повреждённая карта из следующего месяца. */
  flash: { at: number; card: number } | null
  final: { start: number; lines: number[]; end: number }
  /** Кинескоп гаснет: экран схлопывается в линию, линия — в точку. */
  off: { start: number; end: number }
  total: number
  /** Где в дорожке начинается каждый файл озвучки; from/to — кусок файла в секундах (фраза реплики). */
  voice: { file: string; at: number; from?: number; to?: number }[]
  /** Звуки приложения (sound.ts); modem — запись, len — сколько её звучит. */
  sfx: { kind: SfxKind; at: number; len?: number; vol?: number }[]
  /** Отрезки тишины перед переворотами: гул на это время пропадает. */
  silence: [number, number][]
}

export type SfxKind = Sfx | 'online'

/** У «corrupt» и «static» в приложении встроена задержка на время переворота (0,64 с). */
const FLIP_DELAY = 640

export function buildTimeline(v: Voices, states: readonly CardState[]): Timeline {
  const ms = (s: number) => Math.round(s * 1000)
  /** Файл озвучки так, чтобы речь началась в момент t; возвращает момент конца речи. */
  const say = (file: string, t: number) => {
    voice.push({ file: `${file}.wav`, at: t - ms(v[file].start) })
    return t + ms(v[file].end - v[file].start)
  }
  const voice: Timeline['voice'] = []
  const silence: Timeline['silence'] = []
  const sfx: Timeline['sfx'] = [
    { kind: 'boot', at: 0 },
    { kind: 'blink', at: 60 },
  ]

  // загрузка: кинескоп 0–400, лог сыплется по строке в 0,2 с, курсор мигает, затем соединение
  const lines = [450, 650, 850, 1050, 1250]
  const CONNECT = 1900
  lines.forEach((at) => sfx.push({ kind: 'key', at }))

  // первая реплика режется на фразы «Соединение установлено» / «Запрос: знак» / состояние и ставится с паузами,
  // чтобы насыщенный экран успевали прочитать; голос при этом не ускоряется и не замедляется
  const o = v.open
  const fallback: [number, number][] = [[o.start, o.start + 1.2], [o.start + 1.6, o.start + 2.3], [o.start + 2.7, o.start + 3.1], [o.start + 3.5, o.end]]
  const segs = o.segs && o.segs.length >= 4 ? o.segs : fallback
  const LEAD = 0.08
  /** Кусок реплики [фраза a … до начала фразы b), речь которого начинается в момент t. */
  const phrase = (a: number, b: number | null, t: number) => {
    const from = segs[a][0] - LEAD
    const to = b === null ? o.sec : segs[b][0] - 0.05
    voice.push({ file: 'open.wav', at: t - ms(LEAD), from, to })
  }
  const dur = (k: number) => ms(segs[k][1] - segs[k][0])
  phrase(0, 1, CONNECT)
  const query = CONNECT + dur(0) + 800
  phrase(1, 3, query)
  const sign = query + ms(segs[2][0] - segs[1][0])
  const signEnd = sign + dur(2)
  // знак с эмблемой стоит секунду, потом переезжает наверх, выезжают рубашки
  const boot = { on: 400, lines, connected: CONNECT, connectedEnd: CONNECT + dur(0), query, sign, end: signEnd + 1000 }
  sfx.push({ kind: 'modem', at: 480, len: CONNECT - 480 }, { kind: 'online', at: CONNECT - 100 }, { kind: 'glitch', at: sign })

  // зацепка: состояние звучит, когда рубашки легли; рубашка худшей карты вспыхивает на этих словах.
  // Если состояние из двух фраз («Помех нет. Состояние линии: тишина»), вторая идёт после паузы
  const status = boot.end + 1700
  const last = segs.length - 1
  let statusEnd: number
  let second = status
  // вторая фраза начинается после самой длинной паузы внутри состояния — на конце предложения
  let split = 0
  for (let k = 4; k <= last; k++) if (!split || segs[k][0] - segs[k - 1][1] > segs[split][0] - segs[split - 1][1]) split = k
  if (segs.length > 5) {
    phrase(3, split, status)
    second = status + ms(segs[split - 1][1] - segs[3][0]) + 500
    phrase(split, null, second)
    statusEnd = second + ms(segs[last][1] - segs[split][0])
  } else {
    phrase(3, null, status)
    statusEnd = status + ms(segs[last][1] - segs[3][0])
  }
  const damaged = states.indexOf('damaged')
  const worst = damaged >= 0 ? damaged : states.indexOf('partial')
  // все карты целые: на последнем слове состояния рубашки гаснут и гул пропадает на секунду
  let quiet: Timeline['hook']['quiet'] = null
  if (worst < 0) {
    const at = second + ms(segs[last][0] - segs[segs.length > 5 ? split : 3][0])
    quiet = { at, end: at + 1000 }
    silence.push([at, at + 1000])
  }
  const hook = {
    start: boot.end, end: Math.max(statusEnd + 1500, quiet ? quiet.end + 1200 : 0), glitch: worst >= 0 ? status : null,
    worst, kind: worst >= 0 ? states[worst] : null, alert: second, quiet,
  }

  const cards: CardTimes[] = []
  let flash: Timeline['flash'] = null
  let t = hook.end
  states.forEach((state, i) => {
    const start = t
    sfx.push({ kind: 'deal', at: start })
    // чтение файла — быстрая полоса на экране вместе с выездом карты, без голоса
    const from = start + 100
    const to = from + 500
    let flip: number
    let flipMs = i === 2 ? 700 : 640
    let error: CardTimes['error']
    let noise: CardTimes['noise']
    if (state === 'partial') {
      // помеха: полоса доходит до процента целостности и рябит, вместо тишины — треск
      noise = { from: to, to: to + 550 }
      flip = noise.to + 100
      sfx.push({ kind: 'interference', at: noise.from }, { kind: 'interference', at: noise.from + 260 }, { kind: 'glitch', at: noise.to - 120 })
      silence.push([noise.from, flip])
    } else if (state === 'damaged') {
      // чтение застревает на проценте целостности, карта срывается вместе с «Ошибка. Повторная попытка», быстрый повтор
      const at = to + 50
      const errEnd = say('err', at)
      const fail = at + 30
      const failEnd = fail + 450
      const retryEnd = Math.max(failEnd + 430, errEnd - 200)
      error = { at, fail, failEnd, retryEnd }
      flip = retryEnd + 250
      flipMs = 420
      sfx.push({ kind: 'deny', at: fail }, { kind: 'lag', at: fail + 250 }, { kind: 'key', at: failEnd + 30 })
      silence.push([retryEnd, flip])
    } else {
      flip = Math.max(to, start + 500) + 350
      silence.push([flip - 350, flip])
    }
    const flipEnd = flip + flipMs
    sfx.push({ kind: 'flip', at: flip })
    if (state === 'damaged') sfx.push({ kind: 'corrupt', at: flipEnd - FLIP_DELAY }, { kind: 'glitch', at: flipEnd })
    else if (state === 'partial') sfx.push({ kind: 'static', at: flipEnd - FLIP_DELAY }, { kind: 'interference', at: flipEnd })
    else sfx.push({ kind: 'done', at: flipEnd })
    const text = flipEnd + 10
    const info = v[`card${i + 1}`]
    const at = text - ms(info.start)
    voice.push({ file: `card${i + 1}.wav`, at })
    // после последнего слова текст стоит ещё секунду, чтобы его дочитали
    const end = text + ms(info.end - info.start) + 1000
    const subs = (info.subs ?? []).map(([c, s]) => [c, at + s] as [number, number])
    cards.push({ start, load: { from, to }, error, noise, flip, flipEnd, text, end, subs })
    // повреждённая карта из следующих месяцев мелькает на два кадра посреди первого толкования
    if (i === 0 && damaged > 0) flash = { at: text + 2200, card: damaged }
    t = end
  })

  // финал: строки терминала по одной, курсор ждёт ввода, затем кинескоп гаснет
  const fStart = t
  const fLines = [150, 650, 1150, 1650].map((d) => fStart + d)
  fLines.forEach((at) => sfx.push({ kind: 'key', at }))
  const closeEnd = say('close', fStart + 250)
  const fEnd = Math.max(fLines[3] + 1400, closeEnd + 700)
  const off = { start: fEnd, end: fEnd + 600 }
  sfx.push({ kind: 'back', at: off.start }, { kind: 'blink', at: off.end - 120 })
  return {
    boot, hook, cards, flash,
    final: { start: fStart, lines: fLines, end: fEnd },
    off, total: off.end, voice, sfx, silence,
  }
}
