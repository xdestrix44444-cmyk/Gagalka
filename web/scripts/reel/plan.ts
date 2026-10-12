// Вытягивает карты для ролика и сохраняет план: npx tsx scripts/reel/plan.ts rak 2026-10-11 [папка]
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { planReel } from '../../src/reel/plan'

const [slug, date = new Date().toISOString().slice(0, 10), outRoot = 'reels'] = process.argv.slice(2)
if (!slug) {
  console.error('Использование: tsx scripts/reel/plan.ts <знак> [YYYY-MM-DD] [папка]')
  process.exit(1)
}
const plan = planReel(slug, date)
const dir = join(outRoot, `${slug}-${date}`)
mkdirSync(dir, { recursive: true })
writeFileSync(join(dir, 'plan.json'), JSON.stringify(plan, null, 2))
for (const c of plan.cards) console.log(`${c.numeral} ${c.name} — ${c.integrity}% (${c.state})`)
console.log(`→ ${join(dir, 'plan.json')}`)
