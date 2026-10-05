// Люди, для которых строятся натальные карты: своя карта и карты близких. Хранятся только в этом браузере.

import { CITIES, type City } from './cities'

export interface Person {
  id: string
  name: string
  /** Дата рождения, ГГГГ-ММ-ДД. */
  date: string
  /** Время рождения ЧЧ:ММ; null — неизвестно (тогда без Асцендента и домов). */
  time: string | null
  city: string
  region: string
  self: boolean
}

const KEY = 'nit.people.v1'

export function loadPeople(): Person[] {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? (JSON.parse(raw) as Person[]) : []
    return list.sort((a, b) => Number(b.self) - Number(a.self))
  } catch {
    return []
  }
}

function save(list: Person[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // хранилище недоступно: карта посчитается, но не сохранится
  }
}

export function savePerson(p: Omit<Person, 'id'> & { id?: string }): Person {
  const list = loadPeople()
  const full: Person = { ...p, id: p.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }
  // своя карта одна: новая «своя» снимает отметку с прежней
  const rest = list.filter((x) => x.id !== full.id).map((x) => (full.self ? { ...x, self: false } : x))
  save([full, ...rest])
  return full
}

export function deletePerson(id: string) {
  save(loadPeople().filter((p) => p.id !== id))
}

export function cityOf(p: Person): City | undefined {
  return CITIES.find((c) => c.name === p.city && c.region === p.region)
}
