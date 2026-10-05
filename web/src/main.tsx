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
import { installFrames } from './ui/frames'

installFrames()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
