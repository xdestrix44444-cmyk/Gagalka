import { describe, expect, it } from 'vitest'
import { houseMeaning, planetMeaning } from './meanings'

describe('смысл при касании', () => {
  it('личная планета: знак и дом в одной фразе', () => {
    const t = planetMeaning({ key: 'mars', lon: 133, sign: 4, deg: 13, retro: true, house: 4 })
    expect(t).toMatch(/^Вы действуете и защищаете своё — ярко и от сердца/)
    expect(t).toContain('«дом, семья и корни»')
    expect(t).toContain('ретроградна')
  })

  it('высшая планета: знак поколения, а не личная черта', () => {
    expect(planetMeaning({ key: 'pluto', lon: 210, sign: 7, deg: 0, retro: false })).toContain('поколение')
  })

  it('пустой и переполненный дом', () => {
    expect(houseMeaning(5, [])).toContain('Планет здесь нет')
    const many = ['sun', 'moon', 'venus'].map((key) => ({ key, lon: 0, sign: 0, deg: 0, retro: false, house: 11 })) as never
    expect(houseMeaning(11, many)).toContain('много планет')
  })
})
