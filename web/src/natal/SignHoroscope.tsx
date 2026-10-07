import { useMemo, useState } from 'react'
import { play } from '../sound'
import { SIGNS } from './chart'
import { signEmblem } from './emblems'
import { forSign, horoscope, type HoroscopePeriod } from './horoscope'

const KEY = 'nit.sign'

function loadSign(): number | null {
  try {
    const v = Number(localStorage.getItem(KEY))
    return localStorage.getItem(KEY) !== null && v >= 0 && v < 12 ? v : null
  } catch {
    return null
  }
}

function saveSign(sign: number) {
  try {
    localStorage.setItem(KEY, String(sign))
  } catch {
    // без сохранения: знак спросим снова
  }
}

/** Гороскоп по знаку на день или неделю. Знак — свой (из своей карты), последний выбранный или по касанию. */
export function SignHoroscope({ ownSign }: { ownSign: number | null }) {
  const [sign, setSign] = useState<number | null>(() => loadSign() ?? ownSign)
  const [period, setPeriod] = useState<HoroscopePeriod>('day')
  // пока знак не выбран, сетка знаков открыта; потом сворачивается до одной строки
  const [picking, setPicking] = useState(sign === null)
  const h = useMemo(() => (sign === null ? null : horoscope(sign, period)), [sign, period])

  return (
    <div className="reading horo">
      <h2>&gt; гороскоп{sign !== null && !picking ? ` ${forSign(sign)}` : ''}</h2>
      {picking || sign === null ? (
        <>
          <p className="hint horo-ask">выберите свой знак</p>
          <div className="horo-signs">
            {SIGNS.map((s, i) => (
              <button
                key={s}
                type="button"
                className={i === sign ? 'horo-sign on' : 'horo-sign'}
                aria-pressed={i === sign}
                onClick={() => {
                  play('tap')
                  setSign(i)
                  saveSign(i)
                  setPicking(false)
                }}
              >
                <img src={signEmblem(i)} alt="" />
                <span>{s}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="horo-head">
            <img className="horo-emblem" src={signEmblem(sign)} alt="" />
            <div className="seg-row horo-period">
              {(['day', 'week'] as const).map((p) => (
                <button key={p} type="button" aria-pressed={period === p} onClick={() => (play('tap'), setPeriod(p))}>
                  {p === 'day' ? 'сегодня' : 'неделя'}
                </button>
              ))}
            </div>
          </div>
          {h && (
            <>
              <p className="horo-sky">
                <span className="prompt">&gt;</span> {h.sky}
              </p>
              {h.lines.map((l, i) => (
                <p key={`${period}${i}`} className="text">
                  {l}
                </p>
              ))}
            </>
          )}
          <button type="button" className="link-quiet horo-change" onClick={() => (play('tap'), setPicking(true))}>
            другой знак
          </button>
        </>
      )}
    </div>
  )
}
