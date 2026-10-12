// Страница ролика (reel.html). Данные (план, тексты, расписание) подкладывает скрипт записи
// в window.__REEL_DATA__; он же двигает время через window.__reelSeek и снимает кадры.
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import '@fontsource/press-start-2p/400.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/pt-serif/400-italic.css'
import './reel.css'
import { preloadCards } from '../sprites'
import { YearReel, type ReelData } from './YearReel'
import { renderTrack } from './audio'
import { TrailerReel, emblemImage, faceCanvas, type TrailerData } from './TrailerReel'
import { DEATH, DEVIL, TOWER } from './trailer'

declare global {
  interface Window {
    __REEL_DATA__?: ReelData | TrailerData
    __reelReady?: Promise<void>
    __reelSeek?: (ms: number) => Promise<void>
    /** Гул и эффекты ролика: WAV (2 канала) в base64. */
    __reelAudio?: () => Promise<string>
  }
}

const data = window.__REEL_DATA__
const root = createRoot(document.getElementById('root')!)

if (!data) {
  root.render(<p style={{ color: '#c2baaa', padding: 16 }}>Нет данных ролика: страницу открывает скрипт записи.</p>)
} else if ('kind' in data) {
  // трейлер: звук целиком собирает trailer_mix.py, странице нужно только показывать кадры
  const frame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
  const render = (t: number) => root.render(<TrailerReel data={data} t={t} />)
  window.__reelSeek = async (ms) => {
    flushSync(() => render(ms))
    await frame()
  }
  window.__reelReady = (async () => {
    render(0)
    await preloadCards([DEVIL, TOWER, DEATH], 15000)
    ;[DEVIL, TOWER, DEATH, -1].forEach(faceCanvas)
    await Promise.all(Array.from({ length: 12 }, (_, i) => emblemImage(i).decode().catch(() => undefined)))
    await document.fonts.ready
    await new Promise((r) => setTimeout(r, 800))
  })()
} else {
  const frame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
  const render = (t: number) => root.render(<YearReel data={data} t={t} />)
  window.__reelAudio = () => renderTrack(data.timeline)
  window.__reelSeek = async (ms) => {
    flushSync(() => render(ms))
    await frame()
  }
  window.__reelReady = (async () => {
    render(0)
    await preloadCards(data.plan.cards.map((c) => c.id), 15000)
    await document.fonts.ready
    // рисунки карт дорисовываются с повреждениями уже после загрузки
    await new Promise((r) => setTimeout(r, 600))
    // без скрипта записи (?play) ролик просто проигрывается в браузере
  })()
  if (new URLSearchParams(location.search).has('play')) {
    void window.__reelReady.then(() => {
      const t0 = performance.now()
      const tick = () => {
        render((performance.now() - t0) % data.timeline.total)
        requestAnimationFrame(tick)
      }
      tick()
    })
  }
}
