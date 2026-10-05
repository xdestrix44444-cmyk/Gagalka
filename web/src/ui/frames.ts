// Пиксельные рамки и орнаменты интерфейса. Рисуются как SVG из клеток и подключаются
// в CSS через переменные (--frame-rust, --frame-bone, --divider, --gem): border-image и фоны.

const COLORS = { R: '#b5543c', B: '#d9d2c3', D: '#4a3a33', T: '#3fb3a3' } as const
type C = keyof typeof COLORS

const svg = (w: number, h: number, cells: [number, number, string][]) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}' shape-rendering='crispEdges'>${cells
      .map(([x, y, c]) => `<rect x='${x}' y='${y}' width='1' height='1' fill='${c}'/>`)
      .join('')}</svg>`,
  )}")`

/** Угол рамки 4×4 (левый верхний); остальные углы — его отражения. */
const CORNER = ['.B..', 'BRRR', '.RB.', '.R.D']

/** Рамка 12×12 для border-image со срезом 4: угловой орнамент, линия и тонкая внутренняя линия. */
function frame(main: C, dot: C): string {
  const cells: [number, number, string][] = []
  const local = (v: number) => (v < 4 ? v : v > 7 ? 11 - v : null)
  const color = (ch: string) => (ch === 'R' ? COLORS[main] : ch === 'B' ? COLORS[dot] : ch === 'D' ? COLORS.D : null)
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < 12; x++) {
      const cx = local(x)
      const cy = local(y)
      let ch = '.'
      if (cx !== null && cy !== null) ch = CORNER[cy][cx]
      else if (cy !== null) ch = cy === 1 ? 'R' : cy === 3 ? 'D' : '.'
      else if (cx !== null) ch = cx === 1 ? 'R' : cx === 3 ? 'D' : '.'
      const c = color(ch)
      if (c) cells.push([x, y, c])
    }
  return svg(12, 12, cells)
}

/** Центральный мотив разделителя ❦: ромб с точками, 15×5. */
function divider(): string {
  const rows = ['.......B.......', '......R.R......', 'B.BB.RRBRR.BB.B', '......R.R......', '.......B.......']
  const cells: [number, number, string][] = []
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch !== '.') cells.push([x, y, COLORS[ch as C]])
    }),
  )
  return svg(15, 5, cells)
}

/** Маленький ромб для заголовков, 5×5, с бирюзовой сердцевиной. */
function gem(): string {
  const rows = ['..R..', '.RTR.', 'RTBTR', '.RTR.', '..R..']
  const cells: [number, number, string][] = []
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch !== '.') cells.push([x, y, COLORS[ch as C]])
    }),
  )
  return svg(5, 5, cells)
}

export function installFrames() {
  const s = document.documentElement.style
  s.setProperty('--frame-rust', frame('R', 'B'))
  s.setProperty('--frame-bone', frame('B', 'T'))
  s.setProperty('--frame-teal', frame('T', 'B'))
  s.setProperty('--divider', divider())
  s.setProperty('--gem', gem())
}
