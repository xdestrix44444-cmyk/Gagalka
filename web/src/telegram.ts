interface TelegramWebApp {
  ready(): void
  expand(): void
  setHeaderColor?(color: string): void
  setBackgroundColor?(color: string): void
  initDataUnsafe?: { user?: { first_name?: string } }
  HapticFeedback?: { impactOccurred(style: 'light' | 'medium' | 'heavy'): void }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

export function initTelegram(): { firstName: string | null } {
  const tg = window.Telegram?.WebApp
  if (!tg) return { firstName: null }
  tg.ready()
  tg.expand()
  tg.setHeaderColor?.('#13111c')
  tg.setBackgroundColor?.('#13111c')
  return { firstName: tg.initDataUnsafe?.user?.first_name ?? null }
}

export function haptic() {
  window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
}
