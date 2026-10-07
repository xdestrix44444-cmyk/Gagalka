import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { ReadingRequest } from './reading-request'
import { play } from './sound'

/** Адрес сервера толкований. Пусто — тот же сайт (в разработке Vite проксирует /api на npm run server). */
const API = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

/**
 * Запрашивает толкование у сервера и отдаёт текст по мере генерации.
 * Возвращает весь текст; бросает ошибку, если ИИ недоступен или ответ пустой.
 */
export async function streamReading(req: ReadingRequest, onText: (text: string) => void, signal?: AbortSignal): Promise<string> {
  const res = await fetch(`${API}/api/reading`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  })
  if (!res.ok || !res.body) throw new Error(`толкование: ${res.status}`)
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let text = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    text += value
    onText(text)
  }
  if (!text.trim()) throw new Error('толкование: пустой ответ')
  return text
}

const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

type State = { status: 'loading' | 'streaming' | 'done'; text: string } | { status: 'failed'; text: string }

interface Props {
  request: ReadingRequest
  /** Что показать, если ИИ недоступен: временные тексты колоды. */
  fallback: ReactNode
  /** Готовый текст (например, сохранённое толкование карты дня): тогда запроса нет. */
  saved?: string
  /** Пауза перед запросом, мс: пока карта переворачивается и печатается лог. */
  delay?: number
  onDone?: (text: string) => void
}

/** ИИ-толкование: текст появляется по мере генерации; при сбое — временный текст колоды. */
export function AiText({ request, fallback, saved, delay = 0, onDone }: Props) {
  const [state, setState] = useState<State>(() => (saved ? { status: 'done', text: saved } : { status: 'loading', text: '' }))
  const key = JSON.stringify(request)

  useEffect(() => {
    if (saved) return
    const ctrl = new AbortController()
    let text = ''
    const t = setTimeout(() => {
      streamReading(request, (t) => {
        text = t
        setState({ status: 'streaming', text: t })
      }, ctrl.signal).then(
        (full) => {
          setState({ status: 'done', text: full })
          onDone?.(full)
        },
        () => {
          // оборванный на середине поток оставляем как есть, если что-то успело прийти
          if (!ctrl.signal.aborted) setState(text.trim() ? { status: 'done', text } : { status: 'failed', text: '' })
        },
      )
    }, delay)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
    // запрос определяется своим содержимым (key), а не ссылкой на объект
  }, [key, saved])

  // звук чтения: пока ждём — щелчки диска, пока текст идёт — стук клавиш, в конце — короткий отбой
  const lastKey = useRef(0)
  useEffect(() => {
    if (saved || state.status !== 'loading') return
    const iv = setInterval(() => play('think'), 650)
    return () => clearInterval(iv)
  }, [saved, state.status])
  useEffect(() => {
    if (saved) return
    if (state.status === 'done') play('done')
    else if (state.status === 'streaming' && performance.now() - lastKey.current > 90) {
      lastKey.current = performance.now()
      play('key')
    }
  }, [saved, state])

  if (state.status === 'failed') return <>{fallback}</>
  if (state.status === 'loading')
    return (
      <p className="ai-wait">
        <span className="prompt">&gt;</span> нить читает карты<span className="blink">_</span>
      </p>
    )
  const ps = paragraphs(state.text)
  return (
    <div className="ai-text" aria-busy={state.status === 'streaming'}>
      {ps.map((p, i) => (
        <p key={i} className="text">
          {p}
          {state.status === 'streaming' && i === ps.length - 1 && <span className="blink">_</span>}
        </p>
      ))}
    </div>
  )
}
