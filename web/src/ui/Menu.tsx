import { useState } from 'react'
import backImg from '../art/img/back.jpg'
import { PLANETS, SIGN_GLYPHS } from '../natal/chart'
import { play } from '../sound'

export type Door = 'tarot' | 'natal'

/** Сколько длится «провал» в выбранную дверь, мс; совпадает с .door.dive в styles.css. */
const DIVE_MS = 650

/** Меню входа: две двери — таро и натальная карта. Выбранная дверь затягивает экран внутрь. */
export function Menu({ greeting, onEnter }: { greeting: string; onEnter: (d: Door) => void }) {
  const [diving, setDiving] = useState<Door | null>(null)

  const enter = (d: Door) => {
    if (diving) return
    play('flip')
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return onEnter(d)
    setDiving(d)
    setTimeout(() => onEnter(d), DIVE_MS)
  }

  return (
    <section className={diving ? 'screen menu diving' : 'screen menu'}>
      <p className="greet">
        <span className="prompt">&gt;</span> {greeting}
      </p>
      <div className="logo" aria-label="Нить, нейро-таро">
        <span className="logo-word" data-text="НИТЬ" aria-hidden="true">
          НИТЬ
        </span>
        <span className="logo-sub" aria-hidden="true">
          нейро-таро
        </span>
      </div>
      <p className="lede">Выберите, за какую нить потянуть.</p>

      {/* нить: спускается от названия и расходится к двум дверям */}
      <svg className="thread" viewBox="0 0 200 40" preserveAspectRatio="none" aria-hidden="true">
        <path d="M100 0 V14 Q100 22 50 26 V40" />
        <path d="M100 0 V14 Q100 22 150 26 V40" />
      </svg>

      <div className="doors">
        <button type="button" className={`door tarot${diving === 'tarot' ? ' dive' : ''}`} onClick={() => enter('tarot')} onPointerEnter={() => play('type')}>
          <span className="door-art fan" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`fan-card f${i}`} style={{ backgroundImage: `url(${backImg})` }} />
            ))}
          </span>
          <span className="door-name">Таро<br />&nbsp;</span>
          <span className="door-sub">карта дня · расклады · дневник</span>
        </button>

        <button type="button" className={`door natal${diving === 'natal' ? ' dive' : ''}`} onClick={() => enter('natal')} onPointerEnter={() => play('type')}>
          <span className="door-art" aria-hidden="true">
            <svg className="mini-wheel" viewBox="0 0 120 120">
              <g className="mw-ring">
                <circle cx="60" cy="60" r="56" />
                <circle cx="60" cy="60" r="44" />
                {SIGN_GLYPHS.map((g, i) => {
                  const t = ((i * 30 + 15) * Math.PI) / 180
                  return (
                    <g key={i}>
                      <line x1={60 + 44 * Math.cos((i * 30 * Math.PI) / 180)} y1={60 - 44 * Math.sin((i * 30 * Math.PI) / 180)} x2={60 + 56 * Math.cos((i * 30 * Math.PI) / 180)} y2={60 - 56 * Math.sin((i * 30 * Math.PI) / 180)} />
                      <text x={60 + 50 * Math.cos(t)} y={60 - 50 * Math.sin(t)}>
                        {g}
                      </text>
                    </g>
                  )
                })}
              </g>
              <g className="mw-planets">
                {PLANETS.slice(0, 7).map((p, i) => {
                  const t = ((i * 97 + 20) * Math.PI) / 180
                  return (
                    <text key={p.key} x={60 + 32 * Math.cos(t)} y={60 - 32 * Math.sin(t)} style={{ animationDelay: `${i * 0.4}s` }}>
                      {p.glyph + '︎'}
                    </text>
                  )
                })}
              </g>
              <path className="mw-aspect" d="M30 52 L86 40 L70 88 Z" />
              <circle className="mw-core" cx="60" cy="60" r="2.5" />
            </svg>
          </span>
          <span className="door-name">Натальная<br />карта</span>
          <span className="door-sub">небо в момент рождения</span>
        </button>
      </div>
    </section>
  )
}
