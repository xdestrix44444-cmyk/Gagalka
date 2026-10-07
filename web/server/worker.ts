// Сервер толкований для Cloudflare Workers — так ИИ работает в боте: приложение лежит на GitHub Pages,
// а /api/reading отвечает отсюда. Логика та же, что в server/index.ts, только на Gemini и без Node.
// Выкладка: npm run deploy:api (конфиг — wrangler.toml, ключ — секрет GEMINI_API_KEY в Cloudflare).

import { DEFAULT_MODEL, GeminiError, geminiStream } from './gemini'
import { SYSTEM_PROMPT, buildUserMessage } from './prompt'
import { parseReadingRequest } from '../src/reading-request'

interface Env {
  GEMINI_API_KEY?: string
  GEMINI_MODEL?: string
  /** Откуда можно обращаться: адрес приложения на GitHub Pages. */
  ALLOW_ORIGIN?: string
  /** Лимит запросов с одного адреса (Cloudflare Rate Limiting, см. wrangler.toml). */
  LIMITER?: { limit(o: { key: string }): Promise<{ success: boolean }> }
}

const BODY_LIMIT = 4096

function cors(env: Env): Record<string, string> {
  return { 'access-control-allow-origin': env.ALLOW_ORIGIN ?? '*', vary: 'origin' }
}

const json = (env: Env, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...cors(env) } })

async function reading(req: Request, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<Response> {
  if (!env.GEMINI_API_KEY) return json(env, 503, { error: 'no-key' })
  const body = await req.text()
  if (body.length > BODY_LIMIT) return json(env, 413, { error: 'слишком большой запрос' })
  let raw: unknown
  try {
    raw = JSON.parse(body)
  } catch {
    return json(env, 400, { error: 'неверный JSON' })
  }
  const parsed = parseReadingRequest(raw)
  if (typeof parsed === 'string') return json(env, 400, { error: parsed })
  const ip = req.headers.get('cf-connecting-ip') ?? 'unknown'
  if (env.LIMITER && !(await env.LIMITER.limit({ key: ip })).success) return json(env, 429, { error: 'слишком много толкований, попробуйте позже' })

  const it = geminiStream({ key: env.GEMINI_API_KEY, model: env.GEMINI_MODEL }, SYSTEM_PROMPT, buildUserMessage(parsed), req.signal)
  // первый кусок ждём здесь: если Gemini недоступен, приложение получит ошибку и покажет тексты колоды
  let first: IteratorResult<string, string | undefined>
  try {
    first = await it.next()
  } catch (err) {
    console.warn(err instanceof GeminiError ? `Gemini ${err.status}: ${err.message}` : err)
    return json(env, 502, { error: 'ИИ недоступен' })
  }
  if (first.done) return json(env, 502, { error: first.value?.startsWith('BLOCKED') || first.value === 'SAFETY' ? 'refusal' : 'пустой ответ' })

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const out = writable.getWriter()
  const enc = new TextEncoder()
  ctx.waitUntil(
    (async () => {
      try {
        await out.write(enc.encode(first.value))
        for (let step = await it.next(); !step.done; step = await it.next()) await out.write(enc.encode(step.value))
      } catch (err) {
        // оборванный поток: приложение покажет то, что успело прийти
        if (!req.signal.aborted) console.warn('поток Gemini оборвался', err)
      } finally {
        await out.close().catch(() => {})
      }
    })(),
  )
  return new Response(readable, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', ...cors(env) } })
}

export default {
  async fetch(req: Request, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<Response> {
    const path = new URL(req.url).pathname
    if (req.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: { ...cors(env), 'access-control-allow-methods': 'GET, POST', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' } })
    if (req.method === 'GET' && path === '/api/health') return json(env, 200, { ai: !!env.GEMINI_API_KEY, model: env.GEMINI_MODEL || DEFAULT_MODEL })
    if (req.method === 'POST' && path === '/api/reading') return reading(req, env, ctx)
    return json(env, 404, { error: 'не найдено' })
  },
}
