// Telegram держит приложение в кэше и после выкладки может открыть старую версию.
// Поэтому при запуске, ещё до первого экрана, сверяемся с version.json (кладётся при сборке, см. vite.config.ts):
// если вышла новая сборка — один раз перезагружаемся на адрес с ?v=…, которого в кэше ещё нет.
// Посреди сеанса не перезагружаемся: иначе экран входа и звук модема обрываются и окно «открывается дважды».

const RELOADED = 'nit.reloaded-to'

/** Сколько ждать ответа о версии, мс: на медленной сети лучше открыть старую сборку, чем держать пустой экран. */
const WAIT_MS = 1500

/** true — ушли на перезагрузку, рисовать приложение не нужно. */
async function check(): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), WAIT_MS)
    const r = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store', signal: ctrl.signal })
    clearTimeout(timer)
    if (!r.ok) return false
    const { build } = (await r.json()) as { build?: string }
    if (!build || build === __BUILD__) return false
    // не зацикливаться, если кэш всё равно отдал старое
    if (sessionStorage.getItem(RELOADED) === build) return false
    sessionStorage.setItem(RELOADED, build)
    const url = new URL(location.href)
    url.searchParams.set('v', build)
    // hash не трогаем: в нём Telegram передаёт данные запуска
    location.replace(url.toString())
    return true
  } catch {
    // нет сети, долгий ответ или нет файла (ссылка-артефакт) — работаем с тем, что есть
    return false
  }
}

/** Проверяет версию до первого экрана. Возвращает true, если страница перезагружается на новую сборку. */
export function updateBeforeStart(): Promise<boolean> {
  if (import.meta.env.DEV) return Promise.resolve(false)
  return check()
}
