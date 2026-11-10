// Pure helpers: what is on a given day, and what needs attention.
import type { Activity, ActivityStatus, AppData, Category, ClassSlot, Subject } from '../types'
import {
  daysUntil,
  formatDuration,
  formatHours,
  timeToMin,
  weekdayOf,
  weekStartStr,
  durationMin,
} from './dates'
import { isExam, registrationDue } from './exams'
import { sleepHours } from './life'
import { t } from '../i18n'
import { slotKindLabel } from './labels'

export interface Occurrence {
  key: string
  title: string
  category: Category
  date: string
  start: string
  end: string
  status: ActivityStatus
  suggested: boolean
  /** 'activity' can be marked done / skipped; 'class' comes from the timetable */
  type: 'activity' | 'class'
  activityId?: string
  /** true when the activity repeats (can be removed for this day only) */
  recurring?: boolean
  color?: string
}

function occursOn(a: Activity, date: string): boolean {
  if (date < a.date) return false
  if (a.until !== undefined && date > a.until) return false
  if (a.excludedDates?.includes(date)) return false
  switch (a.recurrence) {
    case 'none':
      return date === a.date
    case 'daily':
      return true
    case 'weekdays':
      return weekdayOf(date) <= 5
    case 'weekly':
      return weekdayOf(date) === weekdayOf(a.date)
  }
}

function statusOn(a: Activity, date: string): ActivityStatus {
  if (a.recurrence === 'none') return a.status
  if (a.doneDates?.includes(date)) return 'done'
  if (a.skippedDates?.includes(date)) return 'skipped'
  return 'planned'
}

export function slotCounts(slot: ClassSlot, date: string): boolean {
  if (slot.attendance === 'idem') return true
  if (slot.attendance === 'ponekad') return !!slot.attendingWeeks?.includes(weekStartStr(date))
  return false // 'ne-idem' or not answered yet
}

export function classOccurrences(subjects: Subject[], date: string): Occurrence[] {
  const wd = weekdayOf(date)
  const out: Occurrence[] = []
  for (const s of subjects) {
    for (const slot of s.slots) {
      if (slot.day !== wd || !slotCounts(slot, date)) continue
      out.push({
        key: `class-${slot.id}-${date}`,
        title: `${s.name} (${slotKindLabel(slot.kind)})`,
        category: 'study',
        date,
        start: slot.start,
        end: slot.end,
        status: 'planned',
        suggested: false,
        type: 'class',
        color: s.color,
      })
    }
  }
  return out
}

/** Slots I skip ("ne idem") are free time the planner may use. */
export function freeSlots(
  subjects: Subject[],
  date: string,
): { start: string; end: string; title: string }[] {
  const wd = weekdayOf(date)
  return subjects.flatMap((s) =>
    s.slots
      .filter((sl) => sl.day === wd && sl.attendance === 'ne-idem')
      .map((sl) => ({
        start: sl.start,
        end: sl.end,
        title: `${s.name} (${slotKindLabel(sl.kind)})`,
      })),
  )
}

export function occurrencesOn(
  data: Pick<AppData, 'activities' | 'subjects'>,
  date: string,
): Occurrence[] {
  const acts: Occurrence[] = data.activities
    .filter((a) => occursOn(a, date))
    .map((a) => ({
      key: `act-${a.id}-${date}`,
      title: a.title,
      category: a.category,
      date,
      start: a.start,
      end: a.end,
      status: statusOn(a, date),
      suggested: !!a.suggested,
      type: 'activity' as const,
      activityId: a.id,
      recurring: a.recurrence !== 'none',
    }))
  return [...acts, ...classOccurrences(data.subjects, date)].sort(
    (x, y) => timeToMin(x.start) - timeToMin(y.start),
  )
}

/** The days on which an activity was done (a repeating one keeps a list). */
export function doneDates(a: Activity): string[] {
  return a.recurrence === 'none' ? (a.status === 'done' ? [a.date] : []) : (a.doneDates ?? [])
}

/** Marks one occurrence done/skipped (handles recurring activities). */
export function withStatus(a: Activity, date: string, status: ActivityStatus): Activity {
  if (a.recurrence === 'none') return { ...a, status }
  const done = (a.doneDates ?? []).filter((d) => d !== date)
  const skipped = (a.skippedDates ?? []).filter((d) => d !== date)
  if (status === 'done') done.push(date)
  if (status === 'skipped') skipped.push(date)
  return { ...a, doneDates: done, skippedDates: skipped }
}

/** True if the subject already has a slot with the same kind, day and time (no double entries). */
export function hasSlot(
  slots: ClassSlot[],
  s: Pick<ClassSlot, 'kind' | 'day' | 'start' | 'end'>,
): boolean {
  return slots.some(
    (x) => x.kind === s.kind && x.day === s.day && x.start === s.start && x.end === s.end,
  )
}

/** Removes a single occurrence of a recurring activity, keeping the series. */
export function withoutOccurrence(a: Activity, date: string): Activity {
  return { ...a, excludedDates: [...(a.excludedDates ?? []).filter((d) => d !== date), date] }
}

/**
 * Changes one day of an activity. A one-off is simply patched; a recurring one keeps
 * its series, loses that date, and gets a separate one-off copy for it.
 */
export function patchOccurrence(
  a: Activity,
  date: string,
  patch: Partial<Activity>,
): { updated: Activity; single: Omit<Activity, 'id'> | null } {
  if (a.recurrence === 'none') return { updated: { ...a, ...patch }, single: null }
  const single: Omit<Activity, 'id'> & Partial<Pick<Activity, 'id'>> = {
    ...a,
    ...patch,
    date,
    recurrence: 'none',
    status: 'planned',
  }
  delete single.id
  delete single.doneDates
  delete single.skippedDates
  delete single.excludedDates
  return { updated: withoutOccurrence(a, date), single }
}

/** When the user's day starts and ends (from the settings). The end may be after midnight. */
export interface DayBounds {
  wakeTime: string
  bedTime: string
}

/** Minutes after midnight until which the previous day still lasts (0 if bedtime is before midnight). */
function lateBed(day?: DayBounds): number {
  if (!day) return 0
  const bed = timeToMin(day.bedTime)
  return bed < timeToMin(day.wakeTime) ? bed : 0
}

/**
 * Where an occurrence sits in its day, in minutes from the midnight that starts its date.
 * - An end that is not after the start is on the next day: 22:00-01:00 is 1320-1500.
 * - For someone who goes to bed after midnight, a time before bedtime (00:15) is the end of the
 *   day, not its beginning: 1455.
 */
export function daySpan(
  o: Pick<Occurrence, 'start' | 'end'>,
  day?: DayBounds,
): { start: number; end: number } {
  let start = timeToMin(o.start)
  let end = timeToMin(o.end)
  if (start < lateBed(day)) {
    start += 1440
    end += 1440
  }
  if (end <= start) end += 1440
  return { start, end }
}

/** The occurrences of a day in the order they happen (after-midnight ones last). */
export function inDayOrder(occ: Occurrence[], day?: DayBounds): Occurrence[] {
  return [...occ].sort((a, b) => daySpan(a, day).start - daySpan(b, day).start)
}

/**
 * What is going on now and what comes next. `yesterday` are the occurrences of the day before:
 * the ones that run past midnight are still "now" in the small hours.
 */
export function currentAndNext(
  occ: Occurrence[],
  nowMin: number,
  opts: { day?: DayBounds; yesterday?: Occurrence[] } = {},
) {
  // after midnight but not yet in bed: today's early entries are happening now, not tomorrow night
  const tail = nowMin < lateBed(opts.day)
  const back = (o: Occurrence) => {
    const s = daySpan(o, opts.day)
    return { o, start: s.start - 1440, end: s.end - 1440 }
  }
  const spans = [
    ...occ.map((o) => {
      const s = daySpan(o, opts.day)
      return tail && s.start >= 1440 ? back(o) : { o, ...s }
    }),
    ...(opts.yesterday ?? []).map(back).filter((x) => x.end > 0),
  ]
    .filter((x) => x.o.status === 'planned' && !x.o.suggested)
    .sort((a, b) => a.start - b.start)
  const current = spans.find((x) => x.start <= nowMin && nowMin < x.end)?.o ?? null
  const upcoming = spans.find((x) => x.start > nowMin)
  return {
    current,
    next: upcoming?.o ?? null,
    minutesToNext: upcoming ? upcoming.start - nowMin : null,
  }
}

export interface Alert {
  id: string
  level: 'red' | 'amber'
  text: string
}

export function buildAlerts(data: AppData, today: string): Alert[] {
  const alerts: Alert[] = []
  const when = (d: number) => (d === 0 ? t('when.today') : t('when.tomorrow'))
  const subjName = (id: string) =>
    data.subjects.find((s) => s.id === id)?.name ?? t('subject.fallback')
  for (const a of data.assessments) {
    if (!isExam(a)) {
      const d = daysUntil(a.date, today)
      if (!a.done && d >= 0 && d <= 1)
        alerts.push({
          id: `due-${a.id}`,
          level: 'red',
          text: t('alert.due', { title: a.title, when: when(d) }),
        })
      continue
    }
    const due = registrationDue(a)
    if (due?.assumed) {
      // no deadline entered: from a week before the assumed one until the exam, "check it yourself"
      if (daysUntil(a.date, today) >= 0 && daysUntil(due.date, today) <= 7)
        alerts.push({
          id: `reg-${a.id}`,
          level: 'red',
          text: t('alert.unregisteredAssumed', { title: a.title, subject: subjName(a.subjectId) }),
        })
    } else if (due) {
      const d = daysUntil(due.date, today)
      if (d >= 0 && d <= 7)
        alerts.push({
          id: `reg-${a.id}`,
          level: 'red',
          text: t('alert.unregistered', {
            title: a.title,
            subject: subjName(a.subjectId),
            when: d <= 1 ? when(d) : t('when.inDays', { n: d }),
          }),
        })
      else if (d < 0 && daysUntil(a.date, today) >= 0)
        alerts.push({
          id: `late-${a.id}`,
          level: 'red',
          text: t('alert.regLate', { title: a.title }),
        })
    }
    const d = daysUntil(a.date, today)
    if (d >= 0 && d <= 1)
      alerts.push({
        id: `soon-${a.id}`,
        level: 'amber',
        text: t('alert.soon', { title: a.title, when: when(d) }),
      })
  }
  const last = [...data.sleep]
    .filter((s) => s.wakeTime)
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  if (last && daysUntil(today, last.date) <= 1) {
    const hours = sleepHours(last)
    if (hours !== null && hours < 6)
      alerts.push({
        id: 'sleep',
        level: 'amber',
        text: t('alert.sleep', { d: formatHours(hours) }),
      })
  }
  return alerts
}

export function daySummary(occ: Occurrence[], studyAndWorkoutLabel = true): string {
  const planned = occ.filter((o) => o.status !== 'skipped' && !o.suggested)
  const classes = planned.filter((o) => o.type === 'class').length
  const workouts = planned.filter((o) => o.category === 'workout').length
  const studyMin = planned
    .filter((o) => o.type === 'activity' && o.category === 'study')
    .reduce((n, o) => n + durationMin(o.start, o.end), 0)
  const parts: string[] = []
  if (classes) parts.push(t('day.classes', { n: classes }))
  if (workouts) parts.push(t('day.workouts', { n: workouts }))
  if (studyMin) parts.push(t('day.study', { d: formatDuration(studyMin) }))
  if (!parts.length) return studyAndWorkoutLabel ? t('day.free') : ''
  return t('day.prefix', { parts: parts.join(', ') })
}
