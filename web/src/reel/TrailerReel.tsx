// Трейлер «Камеры»: стол гадалки через старые камеры наблюдения. Кадр вычисляется из времени t (мс).
// Живая камера (плывёт и дрожит), эмблемы гаснут на нотах шкатулки, ускоряющийся монтаж
// переключений, тишина и резкий Дьявол крупным планом.
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { drawCardBack, drawCardFace } from '../sprites'
import { signEmblem } from '../natal/emblems'
import { easeInOut, easeOut, lerp, rnd, span, typed } from './YearReel'
import { DEATH, DEVIL, LAST_EMBLEM, TOWER, type Shot, type TrailerTimeline } from './trailer'

export interface TrailerData {
  kind: 'trailer'
  timeline: TrailerTimeline
}

/** Круг эмблем в координатах кадра 360×640. */
const RING = { cx: 180, cy: 309, r: 133, size: 64 }

const emblemAt = (i: number) => {
  const a = (i / 12) * Math.PI * 2 - Math.PI / 2
  return { x: RING.cx + Math.cos(a) * RING.r, y: RING.cy + Math.sin(a) * RING.r }
}

/** Снег помех на весь кадр. */
function Snow({ frame, alpha }: { frame: number; alpha: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const r = rnd(frame * 7717 + 3)
    const img = ctx.createImageData(c.width, c.height)
    for (let y = 0; y < c.height; y++) {
      const row = 0.75 + r() * 0.5 // строки шума разной яркости, как у телевизора
      for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4
        const v = Math.min(255, r() * 255 * row)
        img.data[i] = v * 0.92
        img.data[i + 1] = v
        img.data[i + 2] = v * 0.96
        img.data[i + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
  }, [frame])
  if (alpha <= 0.001) return null
  return <canvas ref={ref} className="snow" width={180} height={320} style={{ opacity: alpha }} />
}

/** Цифровой зум с пикселизацией: кусок источника растягивается на весь кадр крупными «кирпичами». */
function PixelZoom({ source, rect, block, blur = 0 }: { source: CanvasImageSource | null; rect: [number, number, number, number]; block: number; blur?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx || !source) return
    const [sx, sy, sw, sh] = rect
    ctx.clearRect(0, 0, c.width, c.height)
    if (block <= 1.5) {
      ctx.imageSmoothingEnabled = true
      ctx.drawImage(source, sx, sy, sw, sh, 0, 0, c.width, c.height)
      return
    }
    const w = Math.max(6, Math.round(c.width / block))
    const h = Math.max(10, Math.round(c.height / block))
    const tmp = document.createElement('canvas')
    tmp.width = w
    tmp.height = h
    tmp.getContext('2d')!.drawImage(source, sx, sy, sw, sh, 0, 0, w, h)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(tmp, 0, 0, c.width, c.height)
  }, [source, ...rect, block])
  return <canvas ref={ref} className="pz" width={540} height={960} style={{ filter: blur ? `blur(${blur}px)` : undefined }} />
}

/** Лица карт и рубашка на отдельных холстах — источники для зумов и монтажа. */
const faces = new Map<number, HTMLCanvasElement>()
export function faceCanvas(id: number) {
  let c = faces.get(id)
  if (!c) {
    c = document.createElement('canvas')
    if (id < 0) drawCardBack(c)
    else drawCardFace(c, id, 100)
    faces.set(id, c)
  }
  return c
}
const BACK = -1
const emblemImgs = new Map<number, HTMLImageElement>()
export function emblemImage(i: number) {
  let img = emblemImgs.get(i)
  if (!img) {
    img = new Image()
    img.src = signEmblem(i)
    emblemImgs.set(i, img)
  }
  return img
}

function Ring({ light }: { light: (i: number) => number }) {
  return (
    <div className="t-ring">
      {Array.from({ length: 12 }, (_, i) => {
        const { x, y } = emblemAt(i)
        const o = light(i)
        return (
          <img
            key={i}
            className="t-emblem"
            src={signEmblem(i)}
            alt=""
            style={{ left: x - RING.size / 2, top: y - RING.size / 2, width: RING.size, height: RING.size, opacity: o, filter: o > 0.9 ? 'drop-shadow(0 0 8px #bfeee6)' : undefined }}
          />
        )
      })}
    </div>
  )
}

/** Рывок зума: на рывке картинка рассыпается на крупные пиксели и за 0,2 с «дорисовывается». */
function snapBlock(t: number, snaps: number[], rest: number) {
  const last = [...snaps].reverse().find((s) => t >= s)
  if (last === undefined) return rest
  return lerp(22, rest, easeOut(span(t, last, last + 220)))
}

/** Кадр 9:16 вокруг точки источника шириной w. */
const frameRect = (cx: number, cy: number, w: number): [number, number, number, number] => [cx - w / 2, cy - (w * (640 / 360)) / 2, w, w * (640 / 360)]

/** Кадр быстрого монтажа: то, что мелькает на очередном канале. */
function ShotView({ shot, t }: { shot: Shot; t: number }) {
  const local = t - shot.at
  const src = (id: number) => faceCanvas(id)
  const size = (id: number) => ({ W: src(id).width || 640, H: src(id).height || 960 })
  switch (shot.kind) {
    case 'eye':
    case 'eye2': {
      // глаз на рубашке: во втором заходе — ближе
      const { W, H } = size(BACK)
      const w = (shot.kind === 'eye' ? 0.9 : 0.5) * W * (1 - local / 6000)
      return <PixelZoom source={src(BACK)} rect={frameRect(W * 0.5, H * 0.5, w)} block={local < 60 ? 8 : 1} />
    }
    case 'tower':
    case 'death': {
      const id = shot.kind === 'tower' ? TOWER : DEATH
      const { W, H } = size(id)
      return <PixelZoom source={src(id)} rect={frameRect(W * 0.5, H * 0.42, W * 0.95)} block={local < 50 ? 10 : 1} blur={0.6} />
    }
    case 'line':
      return <div className="t-term">{typed('> он смотрит', t, shot.at, 30)}</div>
    case 'ring':
      return <Ring light={(i) => (i === LAST_EMBLEM ? 1 : 0.06)} />
    default:
      return null
  }
}

export function TrailerReel({ data, t }: { data: TrailerData; t: number }) {
  const tl = data.timeline
  const frame = Math.floor(t / (1000 / 30))
  const r = rnd(frame * 131 + 7)

  // переход: какой сейчас идёт и насколько; белый шум мягко нарастает и уходит
  const sw = tl.switches.find((s) => t >= s.from && t < s.to)
  const sp = sw ? span(t, sw.from, sw.to) : 0
  let snowA = sw ? 0.88 * Math.sin(Math.PI * sp) ** 0.8 : 0
  const mid = (w: { from: number; to: number }) => (w.from + w.to) / 2
  const [s1, s2] = tl.switches

  // живая камера: медленно плывёт, как на кронштейне, и чуть дрожит
  const drift = `translate(${Math.sin(t / 2300) * 6 + (r() - 0.5) * 0.8}px, ${Math.sin(t / 3100) * 5}px) rotate(${Math.sin(t / 4200) * 0.4}deg)`

  let scene: ReactNode = null
  let ch = 1
  let blackout = false
  const cam: CSSProperties = { transform: drift }
  let zoomLabel = ''

  if (t < tl.ringZoom.from) {
    // канал 01: круг эмблем; на быстрых нотах шкатулки гаснут по две, мерцать остаётся одна
    const dims = Array.from({ length: 12 }, (_, i) => i).filter((i) => i !== LAST_EMBLEM)
    const z = lerp(1, 1.06, easeInOut(span(t, tl.on, tl.ringZoom.from)))
    cam.transform = `${drift} scale(${z})`
    scene = (
      <Ring
        light={(i) => {
          if (i === LAST_EMBLEM) return t < tl.dimNotes[0] ? 0.5 : 0.75 + 0.25 * Math.sin(t / 120)
          const note = tl.dimNotes[Math.floor(dims.indexOf(i) / 2)]
          if (t < note) return 0.45 + 0.08 * Math.sin(t / 400 + i)
          return t < note + 80 ? 1 : 0.06
        }}
      />
    )
  } else if (t < mid(s1)) {
    // зум к последней эмблеме: размыто, чья — не понять
    const zoom = t >= tl.ringZoom.snaps[1] ? 3 : 1.8
    const k = 128 / RING.size
    const w = 360 / zoom
    const h = 640 / zoom
    scene = <PixelZoom source={emblemImage(LAST_EMBLEM)} rect={[(RING.size / 2 - w / 2) * k, (RING.size / 2 - h / 2) * k, w * k, h * k]} block={snapBlock(t, tl.ringZoom.snaps, 5)} blur={2.2 + Math.sin(t / 300)} />
    zoomLabel = `ZOOM ×${zoom}`
  } else if (t < tl.montage.shots[0].at) {
    ch = 2
  } else if (t < tl.lost.from) {
    // монтаж: каналы щёлкают сами, всё быстрее; на каждой смене — пара кадров снега
    const shot = [...tl.montage.shots].reverse().find((s) => t >= s.at)!
    ch = shot.ch
    scene = shot.kind === 'snow' ? null : <ShotView shot={shot} t={t} />
    const since = t - shot.at
    snowA = Math.max(snowA, shot.kind === 'snow' ? 0.85 : since < 70 ? 0.7 : 0)
    if (since < 70) cam.translate = `${Math.round((r() - 0.5) * 24)}px ${Math.round((r() - 0.5) * 30)}px`
  } else if (t < tl.black.from) {
    ch = 0
  } else if (t < tl.black.to) {
    blackout = true
  } else if (t < mid(s2)) {
    // резко: Дьявол ×2, между рывками — непрерывный медленный наезд; рывок ×4 к лицу
    ch = 0
    const big = t >= tl.devil.snaps[1]
    const src = faceCanvas(DEVIL)
    const W = src.width || 640
    const H = src.height || 960
    const push = big ? span(t, tl.devil.snaps[1], tl.devil.to) : span(t, tl.devil.from, tl.devil.snaps[1])
    const rect = big ? frameRect(W * 0.5, H * 0.36, W * lerp(0.62, 0.5, push)) : frameRect(W * 0.5, H * 0.48, W * lerp(1.25, 1.0, push))
    scene = (
      <>
        <PixelZoom source={src} rect={rect} block={snapBlock(t, tl.devil.snaps, 1)} blur={Math.max(0, 1.6 * Math.sin(t / 650) ** 2)} />
        {/* рамка слежения ползёт по лицу */}
        {t > tl.devil.from + 600 && (
          <div className="t-track" style={{ left: 120 + Math.sin(t / 900) * 30, top: big ? 150 + Math.sin(t / 700) * 20 : 210 + Math.sin(t / 800) * 25 }}>
            <span>TRACK</span>
          </div>
        )}
      </>
    )
    zoomLabel = `ZOOM ×${big ? 4 : 2}`
  } else if (t < tl.title.from) {
    ch = 3
    const line = typed('> следующий запрос: ', t, tl.term.from + 300, 14)
    scene = (
      <div className="t-term">
        {line}
        <span style={{ opacity: Math.floor(t / 450) % 2 ? 0 : 1 }}>▌</span>
      </div>
    )
  }

  // как ломается картинка на переходе
  if (sw) {
    const amp = Math.sin(Math.PI * sp)
    if (sw.style === 'roll' || sw.style === 'vroll') cam.translate = `0 ${Math.round(-easeInOut(sp) * 640 * (sw.style === 'roll' ? 1 : 2)) % 640}px`
    if (sw.style === 'tear') cam.translate = `${Math.round((r() - 0.5) * 40 * amp)}px 0`
    if (sw.style === 'dissolve') cam.opacity = 1 - amp * 0.85
    cam.filter = `blur(${amp * 1.5}px)`
  }
  // нет сигнала: снег сгущается до самой тишины
  const inLost = t >= tl.lost.from && t < tl.black.from
  if (inLost) snowA = Math.max(snowA, lerp(0.55, 0.85, span(t, tl.lost.from, tl.black.from)))
  const inTitle = t >= tl.title.from
  const showCam = !inTitle && !blackout

  // кинескоп: разгорается из точки и гаснет в точку
  let sx = 1
  let sy = 1
  let bright = 1
  if (t < tl.on) {
    const p = span(t, 0, tl.on)
    sx = lerp(0.01, 1, easeOut(span(p, 0.1, 0.5)))
    sy = lerp(0.004, 1, easeOut(span(p, 0.45, 0.9)))
    bright = lerp(2.6, 1, span(p, 0.4, 1))
  }
  if (t >= tl.off.from) {
    const p = span(t, tl.off.from, tl.off.to)
    sy = lerp(1, 0.005, easeInOut(span(p, 0, 0.55)))
    sx = lerp(1, 0.01, easeInOut(span(p, 0.55, 0.9)))
    bright = lerp(1, 3, p)
  }
  const dark = t >= tl.off.to - 40

  // время записи: камера пишет уже больше трёх часов
  const rec = 3 * 3600 + 14 * 60 + 7 + Math.floor(t / 1000)
  const hh = String(Math.floor(rec / 3600)).padStart(2, '0')
  const mm = String(Math.floor((rec % 3600) / 60)).padStart(2, '0')
  const ss = String(rec % 60).padStart(2, '0')
  const chLabel = sw && sp > 0.5 ? sw.ch : ch
  // Дьявол появляется из черноты рывком
  const jolt = t >= tl.devil.from && t < tl.devil.from + 220 ? (frame % 2 ? 3 : -3) : 0

  // титр: буквы по одной, цвет расслаивается и сходится
  const title = typed('НИТЬ.EXE', t, tl.title.from + 300, 7)
  const split = inTitle ? lerp(5, 1, span(t, tl.title.from + 300, tl.title.from + 1800)) : 0

  return (
    <div className="reel trailer">
      <div className="screen" style={{ transform: `scale(${sx}, ${sy})`, filter: `brightness(${bright})`, opacity: dark ? 0 : 1, translate: `${jolt}px 0` }}>
        {showCam && (
          <>
            <div className="t-cam" style={cam}>
              {scene}
            </div>
            <Snow frame={frame} alpha={snowA} />
            {inLost && (
              <div className="t-nosignal" style={{ translate: `${Math.round((r() - 0.5) * 14)}px 0` }}>
                НЕТ СИГНАЛА
              </div>
            )}
            {/* катящаяся полоса развёртки */}
            <div className="t-roll" style={{ top: ((t / 14) % 760) - 120 }} />
            {sw && sp > 0.35 && sp < 0.75 && <div className="px t-ch">CH {String(sw.ch).padStart(2, '0')}</div>}
            <div className="t-osd">
              <span>КАНАЛ {chLabel ? String(chLabel).padStart(2, '0') : '▓▓'}</span>
              <span className="rec" style={{ opacity: Math.floor(t / 600) % 2 ? 0.25 : 1 }}>● REC</span>
            </div>
            <div className="t-stamp">
              {hh}:{mm}:{ss}
            </div>
            {zoomLabel && <div className="t-zoom">{zoomLabel}</div>}
          </>
        )}
        {inTitle && (
          <div className="px t-title" style={{ textShadow: `${split}px 0 rgba(181,84,60,.85), -${split}px 0 rgba(63,179,163,.85)` }}>
            {title}
          </div>
        )}
      </div>
      {t >= tl.off.from + 0.9 * (tl.off.to - tl.off.from) && t < tl.off.to && <div className="dot" />}
      <div className="crt t-vignette" />
    </div>
  )
}
