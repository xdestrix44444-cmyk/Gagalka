// Telegram держит приложение в кэше и после выкладки может открыть старую версию.
// Поэтому при запуске и при возврате в приложение сверяемся с version.json (кладётся при сборке, см. vite.config.ts):
// если вышла новая сборка — один раз перезагружаемся на адрес с ?v=…, которого в кэше ещё нет.

const RELOADED = 'nit.reloaded-to'

async function check() {
  try {
    const r = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!r.ok) return
    const { build } = (await r.json()) as { build?: string }
    if (!build || build === __BUILD__) return
    // не зацикливаться, если кэш всё равно отдал старое
    if (sessionStorage.getItem(RELOADED) === build) return
    sessionStorage.setItem(RELOADED, build)
    const url = new URL(location.href)
    url.searchParams.set('v', build)
    // hash не трогаем: в нём Telegram передаёт данные запуска
    location.replace(url.toString())
  } catch {
    // нет сети или нет файла (ссылка-артефакт) — работаем с тем, что есть
  }
}

export function watchForUpdates() {
  if (import.meta.env.DEV) return
  void check()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void check()
  })
}
