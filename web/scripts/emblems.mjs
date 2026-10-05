// Эмблемы знаков и планет: убрать фон заливкой от краёв, уменьшить до 128×128, сохранить PNG с прозрачностью.
// Запуск: npm run emblems (из art-src/emblems/{signs,planets} в src/natal/emblems/{signs,planets}).
// Фон определяется по углам: тёмный и светлый (белый) убираются одинаково, внутренние тёмные места сохраняются.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join, basename, extname } from 'node:path'
import jpeg from 'jpeg-js'
import { PNG } from 'pngjs'

const [src = '../art-src/emblems', out = 'src/natal/emblems', size = '128'] = process.argv.slice(2)
const N = Number(size)

function decode(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return jpeg.decode(buf, { useTArray: true })
  return PNG.sync.read(buf)
}

for (const dir of readdirSync(src, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  for (const file of readdirSync(join(src, dir.name)).filter((f) => /\.(png|jpe?g)$/i.test(f))) {
    const img = decode(readFileSync(join(src, dir.name, file)))
    const { width: w, height: h, data } = img
    const px = (x, y) => (y * w + x) * 4
    // цвет фона: среднее по углам
    let br = 0, bg = 0, bb = 0, n = 0
    for (const [cx, cy] of [[0, 0], [w - 24, 0], [0, h - 24], [w - 24, h - 24]])
      for (let y = cy; y < cy + 24; y++) for (let x = cx; x < cx + 24; x++) { const i = px(x, y); br += data[i]; bg += data[i + 1]; bb += data[i + 2]; n++ }
    br /= n; bg /= n; bb /= n
    const light = br + bg + bb > 380
    const tol = light ? 70 : 34
    const isBg = (i) => Math.abs(data[i] - br) + Math.abs(data[i + 1] - bg) + Math.abs(data[i + 2] - bb) < tol * 3 * (light ? 1 : 0.9)
    // заливка от всех краёв: фоном считается только то, что связано с краем
    const bgMask = new Uint8Array(w * h)
    const stack = []
    for (let x = 0; x < w; x++) stack.push(x, 0, x, h - 1)
    for (let y = 0; y < h; y++) stack.push(0, y, w - 1, y)
    while (stack.length) {
      const y = stack.pop(), x = stack.pop()
      if (x < 0 || y < 0 || x >= w || y >= h) continue
      const k = y * w + x
      if (bgMask[k] || !isBg(k * 4)) continue
      bgMask[k] = 1
      stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1)
    }
    // уменьшение блоками: цвет — среднее непрозрачных, прозрачность — доля фона
    const o = new PNG({ width: N, height: N })
    const s = w / N
    for (let Y = 0; Y < N; Y++)
      for (let X = 0; X < N; X++) {
        let r = 0, g = 0, b = 0, solid = 0, all = 0
        for (let y = Math.floor(Y * s); y < Math.floor((Y + 1) * s); y++)
          for (let x = Math.floor(X * s); x < Math.floor((X + 1) * s); x++) {
            all++
            const k = y * w + x
            if (bgMask[k]) continue
            const i = k * 4
            r += data[i]; g += data[i + 1]; b += data[i + 2]; solid++
          }
        const j = (Y * N + X) * 4
        const a = solid / all
        if (a < 0.5) { o.data[j + 3] = 0; continue }
        o.data[j] = r / solid; o.data[j + 1] = g / solid; o.data[j + 2] = b / solid; o.data[j + 3] = 255
      }
    const name = basename(file, extname(file)).toLowerCase()
    mkdirSync(join(out, dir.name), { recursive: true })
    writeFileSync(join(out, dir.name, `${name}.png`), PNG.sync.write(o))
    console.log(`${dir.name.trim()}/${file} → ${name}.png  фон ${light ? 'светлый' : 'тёмный'} rgb(${br | 0},${bg | 0},${bb | 0})`)
  }
}
