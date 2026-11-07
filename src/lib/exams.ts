import type { Assessment, Subject } from '../types'
import { addDaysStr, daysUntil, monthOf, weekStartStr } from './dates'
import { t } from '../i18n'
import { isExamType } from './kinds'
import { assessmentLabel } from './labels'

/** Exams need registration and study; every other kind (homework, lab...) only has a due date. */
export const isExam = (a: Pick<Assessment, 'type'>) => isExamType(a.type)

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
    .filter((a) => isExam(a) && monthOf(a.date) === month)
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

/**
 * Title made by the app for an exam or midterm: "Kolokvijum 1 · Matematika 1", "Ispit · Fizika 1".
 * The number counts the obligations of that kind the subject already has (an exam is numbered only
 * from the second one on).
 */
export function autoTitle(
  type: string,
  subject: Pick<Subject, 'id' | 'name'>,
  existing: Pick<Assessment, 'subjectId' | 'type'>[],
): string {
  const n = existing.filter((a) => a.subjectId === subject.id && a.type === type).length + 1
  const label = assessmentLabel(type)
  const numbered = type === 'kolokvijum' || n > 1
  return `${label}${numbered ? ` ${n}` : ''} · ${subject.name}`
}

/**
 * Study hours the planner assumes when the student did not set them: more for an exam than a midterm,
 * for harder subjects (difficulty 1-5) and for more ECTS credits. Rounded to half an hour.
 */
export function estimateStudyHours(type: string, difficulty: number, espb: number): number {
  const base = type === 'ispit' ? 10 : type === 'kolokvijum' ? 5 : 2
  const byDifficulty = [0.6, 0.8, 1, 1.3, 1.6][Math.min(5, Math.max(1, Math.round(difficulty))) - 1]
  const byEspb = Math.min(1.8, Math.max(0.6, espb / 6))
  return Math.round(base * byDifficulty * byEspb * 2) / 2
}

/** Hours to plan for an obligation: the set ones, otherwise the estimate. */
export function studyHoursOf(
  a: Pick<Assessment, 'type' | 'difficulty' | 'studyHours'>,
  subject?: Pick<Subject, 'espb'>,
): number {
  return a.studyHours ?? estimateStudyHours(a.type, a.difficulty, subject?.espb ?? 6)
}
