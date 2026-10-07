// Толкования через Google Gemini (REST, потоком SSE) — без SDK, одним fetch.
// Ключ: GEMINI_API_KEY из Google AI Studio. Модель: GEMINI_MODEL, по умолчанию Gemini 3.6 Flash —
// на бесплатном лимите 3.8 и 3.7 отвечали по 20–40 с из-за очереди и перегрузки.

// Модуль без Node: им пользуются и сервер (server/index.ts), и Cloudflare Worker (server/worker.ts).

export const DEFAULT_MODEL = 'gemini-3.6-flash'

/** Запасные модели: Flash бывает перегружен (503), а у каждой модели свой бесплатный лимит (429). */
const FALLBACKS = ['gemini-3.7-flash', 'gemini-3.5-flash-lite']
const chain = (model: string) => [model, ...FALLBACKS.filter((m) => m !== model)]

/** Сколько модели думать перед ответом. Человек ждёт текст на экране, а толкованию нужен тон, а не долгий анализ:
 *  3.6 Flash без размышлений отвечала за ~2,5 с, с 'low' — 5–19 с. 3.7 Flash 'minimal' не поддерживает. */
const thinkingLevel = (model: string) => (model === 'gemini-3.7-flash' ? 'low' : 'minimal')

/** Ошибка API Gemini со статусом: 429 — исчерпан лимит, 400/403 — ключ или регион. */
export class GeminiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

interface Chunk {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[]
  promptFeedback?: { blockReason?: string }
}

/** Текст толкования кусками по мере генерации. Последним значением возвращает причину остановки. */
export interface GeminiOptions {
  key: string
  model?: string
}

async function open(key: string, model: string, system: string, user: string, signal: AbortSignal): Promise<Response> {
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      // запас лимита — под размышления, они тоже считаются в ответ
      generationConfig: { maxOutputTokens: 8192, temperature: 1, thinkingConfig: { thinkingLevel: thinkingLevel(model) } },
    }),
    signal,
  })
}

export async function* geminiStream(opts: GeminiOptions, system: string, user: string, signal: AbortSignal): AsyncGenerator<string, string | undefined> {
  // перегруженную или исчерпанную модель пропускаем — пока текст не пошёл, это незаметно
  let res: Response | null = null
  for (const model of chain(opts.model || DEFAULT_MODEL)) {
    const t = Date.now()
    res = await open(opts.key, model, system, user, signal)
    if (res.ok || (res.status !== 503 && res.status !== 429)) break
    console.warn(`Gemini ${model}: ${res.status} за ${((Date.now() - t) / 1000).toFixed(1)} с, пробую следующую модель`)
    await res.body?.cancel()
  }
  if (!res?.ok || !res.body) throw new GeminiError(res?.status ?? 0, ((await res?.text().catch(() => '')) ?? '').slice(0, 500))

  let finish: string | undefined
  let buf = ''
  const decoder = new TextDecoder()
  for await (const bytes of res.body) {
    buf += decoder.decode(bytes as Uint8Array, { stream: true })
    // события SSE разделены пустой строкой, данные — в строках «data: {...}»
    let cut: number
    while ((cut = buf.search(/\r?\n\r?\n/)) >= 0) {
      const event = buf.slice(0, cut)
      buf = buf.slice(cut).replace(/^\r?\n\r?\n/, '')
      for (const line of event.split(/\r?\n/)) {
        if (!line.startsWith('data:')) continue
        const chunk = JSON.parse(line.slice(5)) as Chunk
        if (chunk.promptFeedback?.blockReason) return `BLOCKED:${chunk.promptFeedback.blockReason}`
        const c = chunk.candidates?.[0]
        for (const p of c?.content?.parts ?? []) if (p.text && !p.thought) yield p.text
        if (c?.finishReason) finish = c.finishReason
      }
    }
  }
  return finish
}
