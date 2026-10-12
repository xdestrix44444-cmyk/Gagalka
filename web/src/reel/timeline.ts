// Расписание ролика в миллисекундах: и картинка, и звук собираются по нему, поэтому не расходятся.
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
  flip: number
  flipEnd: number
  /** Начало субтитров диктора. */
  text: number
  end: number
  /** Субтитры диктора: [номер символа, мс от начала ролика]. */
  subs: [number, number][]
}

export interface Timeline {
  /** Загрузка: включение кинескопа, строки лога, «соединение установлено». */
  boot: { on: number; lines: number[]; connected: number; end: number }
  /** Имя знака и три рубашки; glitch — когда сбоит рубашка повреждённой карты. */
  hook: { start: number; end: number; glitch: number | null }
  cards: CardTimes[]
  /** Мелькнувшая на два кадра повреждённая карта из следующего месяца. */
  flash: { at: number; card: number } | null
  final: { start: number; lines: number[]; end: number }
  /** Кинескоп гаснет: экран схлопывается в линию, линия — в точку. */
  off: { start: number; end: number }
  total: number
  /** Где в дорожке начинается каждый файл озвучки. */
  voice: { file: string; at: number }[]
  /** Звуковые эффекты; len — длина, если у эффекта она переменная (модем). */
  sfx: { kind: SfxKind; at: number; len?: number }[]
  /** Отрезки тишины перед переворотами: гул на это время пропадает. */
  silence: [number, number][]
}

export type SfxKind = 'relay' | 'zap' | 'tick' | 'modem' | 'hit' | 'whoosh' | 'flip' | 'fail' | 'corrupt' | 'static' | 'clear' | 'off'

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
    { kind: 'relay', at: 0 },
    { kind: 'zap', at: 60 },
  ]

  // загрузка: кинескоп 0–400, лог сыплется по строке в 0,11 с, на 1500 — соединение
  const lines = [450, 560, 670, 780, 890]
  const boot = { on: 400, lines, connected: 1500, end: 1800 }
  lines.forEach((at) => sfx.push({ kind: 'tick', at }))
  sfx.push({ kind: 'modem', at: 480, len: 1020 }, { kind: 'hit', at: boot.connected })

  // зацепка: «Соединение установлено. Запрос: … Целостность нарушена»; рубашка вспыхивает на последней фразе
  const openEnd = say('open', boot.end + 50)
  const openFile = voice[voice.length - 1].at
  const damaged = states.indexOf('damaged')
  const lastPhrase = v.open.segs?.length ? openFile + ms(v.open.segs[v.open.segs.length - 1][0]) : openEnd - 900
  const hook = { start: boot.end, end: openEnd + 350, glitch: damaged >= 0 ? lastPhrase : null }
  if (hook.glitch !== null) sfx.push({ kind: 'static', at: hook.glitch })

  const cards: CardTimes[] = []
  let flash: Timeline['flash'] = null
  let t = hook.end
  states.forEach((state, i) => {
    const start = t
    sfx.push({ kind: 'whoosh', at: start })
    // чтение файла — быстрая полоса на экране вместе с выездом карты, без голоса
    const from = start + 100
    const to = from + 500
    let flip: number
    let flipMs = i === 2 ? 700 : 640
    let error: CardTimes['error']
    if (state === 'damaged') {
      // чтение застревает на проценте целостности, карта срывается вместе с «Ошибка. Повторная попытка», быстрый повтор
      const at = to + 50
      const errEnd = say('err', at)
      const fail = at + 30
      const failEnd = fail + 450
      const retryEnd = Math.max(failEnd + 430, errEnd - 200)
      error = { at, fail, failEnd, retryEnd }
      flip = retryEnd + 250
      flipMs = 420
      sfx.push({ kind: 'fail', at: fail }, { kind: 'tick', at: failEnd + 30 })
      silence.push([retryEnd, flip])
    } else {
      flip = Math.max(to, start + 500) + 350
      silence.push([flip - 350, flip])
    }
    const flipEnd = flip + flipMs
    sfx.push({ kind: 'flip', at: flip + flipMs / 2 }, { kind: 'hit', at: flipEnd })
    sfx.push({ kind: state === 'damaged' ? 'corrupt' : state === 'partial' ? 'static' : 'clear', at: flipEnd })
    const text = flipEnd + 10
    const info = v[`card${i + 1}`]
    const at = text - ms(info.start)
    voice.push({ file: `card${i + 1}.wav`, at })
    const end = text + ms(info.end - info.start) + 450
    const subs = (info.subs ?? []).map(([c, s]) => [c, at + s] as [number, number])
    cards.push({ start, load: { from, to }, error, flip, flipEnd, text, end, subs })
    // повреждённая карта из следующих месяцев мелькает на два кадра посреди первого толкования
    if (i === 0 && damaged > 0) flash = { at: text + 2200, card: damaged }
    t = end
  })

  // финал: строки терминала по одной, курсор ждёт ввода, затем кинескоп гаснет
  const fStart = t
  const fLines = [150, 650, 1150, 1650].map((d) => fStart + d)
  fLines.forEach((at) => sfx.push({ kind: 'tick', at }))
  const closeEnd = say('close', fStart + 250)
  const fEnd = Math.max(fLines[3] + 1400, closeEnd + 700)
  const off = { start: fEnd, end: fEnd + 600 }
  sfx.push({ kind: 'off', at: off.start })
  return {
    boot, hook, cards, flash,
    final: { start: fStart, lines: fLines, end: fEnd },
    off, total: off.end, voice, sfx, silence,
  }
}
