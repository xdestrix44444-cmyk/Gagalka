export type Section = 'tarot' | 'natal' | 'matrix'

const TABS: { key: Section; name: string; icon: JSX.Element }[] = [
  {
    key: 'tarot',
    name: 'Таро',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="10" height="15" transform="rotate(-10 9 12)" />
        <rect x="10" y="4" width="10" height="15" />
      </svg>
    ),
  },
  {
    key: 'natal',
    name: 'Небо',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle className="dot" cx="12" cy="12" r="1.6" />
      </svg>
    ),
  },
  {
    key: 'matrix',
    name: 'Матрица',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2 L22 12 L12 22 L2 12 Z" />
        <rect x="8.5" y="8.5" width="7" height="7" />
        <circle className="dot" cx="12" cy="12" r="1.4" />
      </svg>
    ),
  },
]

/** Нижняя панель разделов: переход между таро, небом и матрицей без возврата в меню. */
export function TabBar({ active, onGo }: { active: Section | null; onGo: (s: Section) => void }) {
  return (
    <nav className="tabbar" aria-label="Разделы">
      {TABS.map((t) => (
        <button key={t.key} type="button" className={active === t.key ? 'tab on' : 'tab'} aria-current={active === t.key ? 'page' : undefined} onClick={() => active !== t.key && onGo(t.key)}>
          {t.icon}
          <span>{t.name}</span>
        </button>
      ))}
    </nav>
  )
}
