import {
  addDays,
  format,
  getISODay,
  parseISO,
  startOfWeek,
  differenceInCalendarDays,
} from 'date-fns'
import { getLocaleModule, t } from '../i18n'
import type { Weekday } from '../types'

const WEEK = { weekStartsOn: 1 as const }
/** date-fns locale of the selected language (month and weekday names, formats). */
const locale = () => getLocaleModule().dateLocale

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

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
// 2024-01-01 was a Monday: a fixed reference week for weekday names
const refDay = (d: Weekday) => fromDateStr(`2024-01-0${d}`)

/** "Petak" / "Friday" / "Петак" — weekday name in the selected language. */
export function weekdayName(d: Weekday): string {
  return capitalize(format(refDay(d), 'EEEE', { locale: locale() }))
}
/** Month name (1-12) in the selected language, capitalised. */
export function monthName(month: number): string {
  return capitalize(format(new Date(2024, month - 1, 1), 'LLLL', { locale: locale() }))
}

export function formatLong(s: string): string {
  // "Petak, 6. novembar" / "Friday, November 6th" (the pattern comes from the locale file)
  return capitalize(format(fromDateStr(s), t('date.long'), { locale: locale() }))
}
export function formatShort(s: string): string {
  return format(fromDateStr(s), t('date.short'), { locale: locale() })
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
