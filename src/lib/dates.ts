import {
  addDays,
  format,
  getISODay,
  parseISO,
  startOfWeek,
  differenceInCalendarDays,
} from 'date-fns'
import { srLatn } from 'date-fns/locale'
import type { Weekday } from '../types'

export const LOCALE = srLatn
const WEEK = { weekStartsOn: 1 as const, locale: LOCALE }

export const DATE_FMT = 'yyyy-MM-dd'

export function toDateStr(d: Date): string {
  return format(d, DATE_FMT)
}
export function fromDateStr(s: string): Date {
  return parseISO(s)
}
export function todayStr(now: Date = new Date()): string {
  return toDateStr(now)
}
export function addDaysStr(s: string, n: number): string {
  return toDateStr(addDays(fromDateStr(s), n))
}
/** ISO weekday: Monday = 1 ... Sunday = 7 */
export function weekdayOf(s: string): Weekday {
  return getISODay(fromDateStr(s)) as Weekday
}
/** Monday of the week containing the date */
export function weekStartStr(s: string): string {
  return toDateStr(startOfWeek(fromDateStr(s), WEEK))
}
export function weekDates(s: string): string[] {
  const start = weekStartStr(s)
  return Array.from({ length: 7 }, (_, i) => addDaysStr(start, i))
}
export function daysUntil(target: string, from: string): number {
  return differenceInCalendarDays(fromDateStr(target), fromDateStr(from))
}
export function monthOf(s: string): string {
  return s.slice(0, 7)
}

export const WEEKDAY_NAMES: Record<Weekday, string> = {
  1: 'Ponedeljak',
  2: 'Utorak',
  3: 'Sreda',
  4: 'Četvrtak',
  5: 'Petak',
  6: 'Subota',
  7: 'Nedelja',
}
export const WEEKDAY_SHORT: Record<Weekday, string> = {
  1: 'Pon',
  2: 'Uto',
  3: 'Sre',
  4: 'Čet',
  5: 'Pet',
  6: 'Sub',
  7: 'Ned',
}

export function formatLong(s: string): string {
  const text = format(fromDateStr(s), 'EEEE, d. MMMM', { locale: LOCALE })
  return text.charAt(0).toUpperCase() + text.slice(1) // "Petak, 6. novembar"
}
export function formatShort(s: string): string {
  return format(fromDateStr(s), 'd. MMM', { locale: LOCALE })
}

// ---- time helpers ('HH:mm') ----
export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}
export function minToTime(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
export function nowMinutes(now: Date = new Date()): number {
  return now.getHours() * 60 + now.getMinutes()
}
