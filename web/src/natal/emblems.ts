// Пиксельные эмблемы знаков и планет (src/natal/emblems, готовятся командой npm run emblems из art-src/emblems).

import type { PlanetKey } from './chart'

const SIGN_FILES = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'] as const

const signs = import.meta.glob<string>('./emblems/signs/*.png', { eager: true, import: 'default' })
const planets = import.meta.glob<string>('./emblems/planets/*.png', { eager: true, import: 'default' })

/** Эмблема знака по номеру 0–11 (Овен … Рыбы). */
export const signEmblem = (sign: number): string => signs[`./emblems/signs/${SIGN_FILES[sign]}.png`]

export const planetEmblem = (key: PlanetKey): string => planets[`./emblems/planets/${key}.png`]
