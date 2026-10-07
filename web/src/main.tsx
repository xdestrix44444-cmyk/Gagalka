import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
// шрифты встроены в приложение: без запросов к Google и без зависимости от сети в Telegram
import '@fontsource/press-start-2p/400.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/600.css'
import '@fontsource/pt-serif/400.css'
import '@fontsource/pt-serif/400-italic.css'
import '@fontsource/pt-serif/700.css'
import './styles.css'
import { applySettings } from './settings'
import { installFrames } from './ui/frames'
import { installUiSounds, preloadSounds } from './sound'
import { updateBeforeStart } from './update'

// запись модема качается сразу, пока идёт экран входа: к входу в меню она уже готова
preloadSounds()

void updateBeforeStart().then((reloading) => {
  if (reloading) return
  installFrames()
  applySettings()
  installUiSounds()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
