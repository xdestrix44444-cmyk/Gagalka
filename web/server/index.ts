// Сервер ИИ-толкований «Нити». Ключ API живёт только здесь, в переменных окружения (web/.env).
// POST /api/reading — толкование потоком обычного текста; GET /api/health — включён ли ИИ.
// Модель: Gemini, если задан GEMINI_API_KEY (бесплатный лимит), иначе Claude по ANTHROPIC_API_KEY.
// Запуск: npm run server (в разработке Vite проксирует /api сюда).

import Anthropic from '@anthropic-ai/sdk'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { parseReadingRequest } from '../src/reading-request'
import { DEFAULT_MODEL, GeminiError, geminiStream } from './gemini'
import { SYSTEM_PROMPT, buildUserMessage } from './prompt'

try {
  process.loadEnvFile('.env')
} catch {
  // .env нет: берём переменные из окружения
}

const PORT = Number(process.env.PORT ?? 8787)
const CLAUDE_MODEL = 'claude-sonnet-5-5'
/** Запросов с одного адреса в час. Грубая защита от перерасхода до подключения подписки. */
const HOURLY_LIMIT = Number(process.env.READINGS_PER_HOUR ?? 30)
const BODY_LIMIT = 4096

const useGemini = !!process.env.GEMINI_API_KEY
const hasClaudeKey = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)
const client = !useGemini && hasClaudeKey ? new Anthropic() : null
const aiOn = useGemini || !!client
const GEMINI = { key: process.env.GEMINI_API_KEY ?? '', model: process.env.GEMINI_MODEL }
const MODEL = useGemini ? (GEMINI.model ?? DEFAULT_MODEL) : CLAUDE_MODEL
/** С какого адреса приложению можно обращаться к серверу: приложение на GitHub Pages, сервер — на своём домене. */
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN ?? '*'

const hits = new Map<string, number[]>()

function allow(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000)
  if (recent.length >= HOURLY_LIMIT) return false
  recent.push(now)
  hits.set(ip, recent)
  return true
}

/** За прокси (хостинг) адрес клиента в X-Forwarded-For; доверяем ему только с TRUST_PROXY=1. */
function clientIp(req: IncomingMessage): string {
  const fwd = req.headers['x-forwarded-for']
  if (process.env.TRUST_PROXY === '1' && typeof fwd === 'string') return fwd.split(',')[0].trim()
  return req.socket.remoteAddress ?? 'unknown'
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

async function readBody(req: IncomingMessage): Promise<string | null> {
  let size = 0
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > BODY_LIMIT) return null
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

async function reading(req: IncomingMessage, res: ServerResponse) {
  if (!aiOn) return json(res, 503, { error: 'no-key' })
  const body = await readBody(req)
  if (body === null) return json(res, 413, { error: 'слишком большой запрос' })
  let raw: unknown
  try {
    raw = JSON.parse(body)
  } catch {
    return json(res, 400, { error: 'неверный JSON' })
  }
  const parsed = parseReadingRequest(raw)
  if (typeof parsed === 'string') return json(res, 400, { error: parsed })
  if (!allow(clientIp(req))) return json(res, 429, { error: 'слишком много толкований, попробуйте через час' })
  if (useGemini) return readingGemini(buildUserMessage(parsed), res)
  if (!client) return

  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: 'low' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(parsed) }],
  })
  // человек закрыл экран — останавливаем генерацию, чтобы не платить за неё
  res.on('close', () => {
    if (!res.writableFinished) stream.abort()
  })

  let started = false
  try {
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        if (!started) {
          res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' })
          started = true
        }
        res.write(event.delta.text)
      }
    }
    const final = await stream.finalMessage()
    if (final.stop_reason === 'refusal') console.warn('толкование отклонено', final.stop_details)
    if (!started) return json(res, 502, { error: final.stop_reason === 'refusal' ? 'refusal' : 'пустой ответ' })
    res.end()
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) console.warn('лимит API', err.message)
    else if (err instanceof Anthropic.APIConnectionError) console.warn('нет связи с API', err.message)
    else if (err instanceof Anthropic.APIError) console.error('ошибка API', err.status, err.message)
    else if (!res.destroyed) console.error(err)
    // уже начатый поток просто обрываем: приложение покажет то, что успело прийти, или запасной текст
    if (!started && !res.headersSent) json(res, 502, { error: 'ИИ недоступен' })
    else res.end()
  }
}

async function readingGemini(user: string, res: ServerResponse) {
  // человек закрыл экран — обрываем запрос, чтобы не тратить лимит
  const ctrl = new AbortController()
  res.on('close', () => {
    if (!res.writableFinished) ctrl.abort()
  })
  let started = false
  try {
    const it = geminiStream(GEMINI, SYSTEM_PROMPT, user, ctrl.signal)
    let step = await it.next()
    for (; !step.done; step = await it.next()) {
      if (!started) {
        res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' })
        started = true
      }
      res.write(step.value)
    }
    const finish = step.value
    if (finish && finish !== 'STOP') console.warn('Gemini остановился:', finish)
    if (!started) return json(res, 502, { error: finish?.startsWith('BLOCKED') || finish === 'SAFETY' ? 'refusal' : 'пустой ответ' })
    res.end()
  } catch (err) {
    if (err instanceof GeminiError) console.warn(err.status === 429 ? 'лимит Gemini исчерпан' : `ошибка Gemini ${err.status}`, err.message)
    else if (!ctrl.signal.aborted) console.error(err)
    if (!started && !res.headersSent) json(res, 502, { error: 'ИИ недоступен' })
    else res.end()
  }
}

createServer((req, res) => {
  const url = req.url?.split('?')[0]
  res.setHeader('access-control-allow-origin', ALLOW_ORIGIN)
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'access-control-allow-methods': 'GET, POST', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' })
    return res.end()
  }
  if (req.method === 'GET' && url === '/api/health') return json(res, 200, { ai: aiOn, model: MODEL })
  if (req.method === 'POST' && url === '/api/reading') {
    reading(req, res).catch((err) => {
      console.error(err)
      if (!res.headersSent) json(res, 500, { error: 'ошибка сервера' })
    })
    return
  }
  json(res, 404, { error: 'не найдено' })
}).listen(PORT, () => {
  console.log(`Нить: сервер толкований на http://localhost:${PORT} · ИИ ${aiOn ? `включён (${MODEL})` : 'выключен: нет GEMINI_API_KEY или ANTHROPIC_API_KEY в web/.env'}`)
})
