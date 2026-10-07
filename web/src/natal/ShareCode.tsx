import { useMemo, useRef, useState } from 'react'
import { play } from '../sound'
import { ScreenHead } from '../ui/ScreenHead'
import { fmtDate, loadPeople, savePerson, type Person } from './people'
import { decodePerson, shareMessage } from './share-code'

/** Кнопка и панель «Отправить данные другу»: код, копирование, предупреждение о личных данных. */
export function SendToFriend({ person }: { person: Person }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const box = useRef<HTMLTextAreaElement>(null)
  const message = useMemo(() => shareMessage(person), [person])

  const copy = () => {
    play('tap')
    const fallback = () => {
      box.current?.focus()
      box.current?.select()
    }
    // копирование работает только из обработчика нажатия; если запрещено — выделяем текст
    navigator.clipboard?.writeText(message).then(() => setCopied(true), fallback) ?? fallback()
  }

  if (!open)
    return (
      <button
        type="button"
        className="btn wide"
        onClick={() => {
          play('tap')
          setOpen(true)
        }}
      >
        Отправить данные другу
      </button>
    )
  return (
    <article className="reading share-code">
      <h2>&gt; код для друга</h2>
      <p className="hint-small">Отправьте это сообщение. Друг откроет «Нить» → Натальная карта или Матрица судьбы → «Добавить по коду» и вставит его.</p>
      <textarea ref={box} className="share-box" readOnly rows={5} value={message} onFocus={(e) => e.currentTarget.select()} aria-label="Сообщение с кодом" />
      <button type="button" className="btn primary wide" onClick={copy}>
        {copied ? 'Скопировано' : 'Скопировать'}
      </button>
      <p className="hint-small">В коде имя, дата, время и город рождения. Отправляйте только тем, кому доверяете.</p>
    </article>
  )
}

/** Экран «Добавить по коду»: вставить сообщение от друга, проверить, добавить. */
export function ImportPerson({ onBack, onAdded }: { onBack: () => void; onAdded: (p: Person) => void }) {
  const [text, setText] = useState('')
  const shared = useMemo(() => decodePerson(text), [text])
  // тот же человек уже есть (имя и дата совпадают) — обновим его, а не заведём второго
  const existing = useMemo(() => (shared ? loadPeople().find((p) => p.name === shared.name && p.date === shared.date) : undefined), [shared])

  const add = () => {
    if (!shared) return
    play('tap')
    onAdded(savePerson({ ...shared, id: existing?.id, self: existing?.self ?? false }))
  }

  return (
    <section className="screen">
      <ScreenHead title="Добавить по коду" onBack={onBack} />
      <p className="lede">Вставьте сообщение с кодом, которое прислал друг.</p>
      <label className="question">
        <span>
          <span className="prompt">&gt;</span> код или всё сообщение
        </span>
        <textarea value={text} rows={4} placeholder="nit:…" onChange={(e) => setText(e.target.value)} autoComplete="off" spellCheck={false} />
      </label>
      {text.trim() && !shared && <p className="form-error">&gt; Код не читается. Скопируйте сообщение целиком и вставьте ещё раз.</p>}
      {shared && (
        <article className="reading share-preview">
          <h2>&gt; найдено</h2>
          <p className="person-name">{shared.name}</p>
          <p className="person-meta">
            {fmtDate(shared.date)}
            {shared.time ? `, ${shared.time}` : ''}
            {shared.city ? ` · ${shared.city}` : ' · без места рождения: только матрица судьбы'}
          </p>
          {existing && <p className="hint-small">Такой человек уже есть — данные обновятся.</p>}
        </article>
      )}
      <div className="actions">
        <button type="button" className="btn primary wide" disabled={!shared} onClick={add}>
          {existing ? 'Обновить' : 'Добавить'}
        </button>
      </div>
    </section>
  )
}
