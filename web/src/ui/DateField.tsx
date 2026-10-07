import { useState } from 'react'

// Дата рождения вводится цифрами: на iOS поле type="date" открывает только колёсико прокрутки.
// Точки расставляются сами: 14031996 → 14.03.1996. Наружу отдаётся ГГГГ-ММ-ДД или '' пока дата не полная.

/** Цифры → «ДД.ММ.ГГГГ» по мере ввода. */
export function formatDigits(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`
}

/** «ДД.ММ.ГГГГ» → ГГГГ-ММ-ДД, если такая дата существует; иначе ''. */
export function parseRuDate(text: string): string {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text)
  if (!m) return ''
  const [, dd, mm, yyyy] = m
  const day = Number(dd)
  const month = Number(mm)
  const year = Number(yyyy)
  const probe = new Date(Date.UTC(year, month - 1, day))
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return ''
  return `${yyyy}-${mm}-${dd}`
}

/** ГГГГ-ММ-ДД → «ДД.ММ.ГГГГ». */
export function isoToRu(iso: string): string {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}.${m}.${y}` : ''
}

export function DateField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [text, setText] = useState(() => isoToRu(value))
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="bday"
      placeholder="ДД.ММ.ГГГГ"
      maxLength={10}
      value={text}
      onChange={(e) => {
        const raw = e.target.value
        let digits = raw.replace(/\D/g, '')
        // стёрли точку — стираем и цифру перед ней, иначе точка тут же вернётся
        if (raw.length < text.length && digits === text.replace(/\D/g, '')) digits = digits.slice(0, -1)
        const next = formatDigits(digits)
        setText(next)
        onChange(parseRuDate(next))
      }}
    />
  )
}
