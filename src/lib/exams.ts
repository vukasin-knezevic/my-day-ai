import type { Assessment, Subject } from '../types'
import { addDaysStr, daysUntil, monthOf, weekStartStr } from './dates'
import { t } from '../i18n'

export type Urgency = 'past' | 'red' | 'orange' | 'yellow' | 'green'

export function urgency(date: string, today: string): Urgency {
  const d = daysUntil(date, today)
  if (d < 0) return 'past'
  if (d <= 2) return 'red'
  if (d <= 7) return 'orange'
  if (d <= 14) return 'yellow'
  return 'green'
}

export const URGENCY_CLS: Record<Urgency, string> = {
  past: 'bg-slate-100 text-slate-500 dark:bg-slate-800',
  red: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
  green: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200',
}

export function countdownLabel(date: string, today: string): string {
  const d = daysUntil(date, today)
  if (d < 0) return t('countdown.past', { n: -d })
  if (d === 0) return t('when.today')
  if (d === 1) return t('when.tomorrow')
  return t('countdown.future', { n: d })
}

/** Exams that need registration (kolokvijum / ispit) of a month with their status - shown as "<month>: registrations". */
export function monthRegistrations(assessments: Assessment[], month: string) {
  return assessments
    .filter((a) => (a.type === 'kolokvijum' || a.type === 'ispit') && monthOf(a.date) === month)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function unregisteredIn(assessments: Assessment[], month: string): Assessment[] {
  return monthRegistrations(assessments, month).filter((a) => a.registration === 'nije-prijavljen')
}

/** Upcoming assessments sorted by date (past ones last). */
export function sortAssessments(list: Assessment[], today: string): Assessment[] {
  return [...list].sort((a, b) => {
    const pa = a.date < today ? 1 : 0
    const pb = b.date < today ? 1 : 0
    return pa - pb || (pa ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date))
  })
}

/** Monday of next week. "ponekad" slots are asked once per week (Sunday evening) for it. */
export function nextWeekStart(today: string): string {
  return addDaysStr(weekStartStr(today), 7)
}

export function slotsToAsk(subjects: Subject[], today: string) {
  const target = nextWeekStart(today)
  return subjects.flatMap((s) =>
    s.slots
      .filter((sl) => sl.attendance === 'ponekad' && sl.askedWeek !== target)
      .map((sl) => ({ subject: s, slot: sl })),
  )
}

export function unansweredSlots(subjects: Subject[]) {
  return subjects.flatMap((s) =>
    s.slots.filter((sl) => sl.attendance === null).map((slot) => ({ subject: s, slot })),
  )
}
