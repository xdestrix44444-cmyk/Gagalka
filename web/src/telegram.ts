interface TelegramWebApp {
  ready(): void
  expand(): void
  setHeaderColor?(color: string): void
  setBackgroundColor?(color: string): void
  initDataUnsafe?: { user?: { first_name?: string } }
  HapticFeedback?: {
    impactOccurred(style: 'light' | 'medium' | 'heavy'): void
    notificationOccurred?(type: 'error' | 'success' | 'warning'): void
  }
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
  tg.setHeaderColor?.('#060608')
  tg.setBackgroundColor?.('#060608')
  return { firstName: tg.initDataUnsafe?.user?.first_name ?? null }
}

export function haptic(kind: 'light' | 'error' = 'light') {
  const h = window.Telegram?.WebApp?.HapticFeedback
  if (kind === 'error') h?.notificationOccurred?.('error')
  else h?.impactOccurred('light')
}
