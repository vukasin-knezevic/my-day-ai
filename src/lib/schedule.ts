// Pure helpers: what is on a given day, and what needs attention.
import type { Activity, ActivityStatus, AppData, Category, ClassSlot, Subject } from '../types'
import { CATEGORY_META } from '../types'
import { addDaysStr, daysUntil, fromDateStr, timeToMin, weekdayOf, weekStartStr } from './dates'

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
  color?: string
}

function occursOn(a: Activity, date: string): boolean {
  if (date < a.date) return false
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
        title: `${s.name} (${slot.kind})`,
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
      .map((sl) => ({ start: sl.start, end: sl.end, title: `${s.name} (${sl.kind})` })),
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
    }))
  return [...acts, ...classOccurrences(data.subjects, date)].sort(
    (x, y) => timeToMin(x.start) - timeToMin(y.start),
  )
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

export function currentAndNext(occ: Occurrence[], nowMin: number) {
  const active = occ.filter((o) => o.status === 'planned' && !o.suggested)
  const current =
    active.find((o) => timeToMin(o.start) <= nowMin && nowMin < timeToMin(o.end)) ?? null
  const next = active.find((o) => timeToMin(o.start) > nowMin) ?? null
  return { current, next, minutesToNext: next ? timeToMin(next.start) - nowMin : null }
}

export interface Alert {
  id: string
  level: 'red' | 'amber'
  text: string
}

export function buildAlerts(data: AppData, today: string): Alert[] {
  const alerts: Alert[] = []
  const subjName = (id: string) => data.subjects.find((s) => s.id === id)?.name ?? 'Predmet'
  for (const a of data.assessments) {
    if (a.type === 'domaci' || a.type === 'lab') {
      const d = daysUntil(a.date, today)
      if (!a.done && d >= 0 && d <= 1)
        alerts.push({
          id: `due-${a.id}`,
          level: 'red',
          text: `📝 ${a.title} — rok ${d === 0 ? 'danas' : 'sutra'}`,
        })
      continue
    }
    if (a.registration === 'nije-prijavljen' && a.registrationDeadline) {
      const d = daysUntil(a.registrationDeadline, today)
      if (d >= 0 && d <= 7)
        alerts.push({
          id: `reg-${a.id}`,
          level: 'red',
          text: `🚨 Neprijavljen: ${a.title} (${subjName(a.subjectId)}) — rok za prijavu ${d === 0 ? 'danas' : d === 1 ? 'sutra' : `za ${d} dana`}`,
        })
      else if (d < 0 && daysUntil(a.date, today) >= 0)
        alerts.push({
          id: `late-${a.id}`,
          level: 'red',
          text: `🚨 Rok za prijavu prošao, a nisi prijavljen: ${a.title}`,
        })
    }
    const d = daysUntil(a.date, today)
    if (d >= 0 && d <= 1)
      alerts.push({
        id: `soon-${a.id}`,
        level: 'amber',
        text: `⏰ ${a.title} je ${d === 0 ? 'danas' : 'sutra'}`,
      })
  }
  const last = [...data.sleep]
    .filter((s) => s.wakeTime)
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  if (last && last.wakeTime && daysUntil(today, last.date) <= 1) {
    const hours =
      (fromDateStr(last.wakeTime).getTime() - fromDateStr(last.bedtime).getTime()) / 3600000
    if (hours > 0 && hours < 6)
      alerts.push({
        id: 'sleep',
        level: 'amber',
        text: `😴 Spavao si samo ${hours.toFixed(1)} h. Danas polako.`,
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
    .reduce((n, o) => n + timeToMin(o.end) - timeToMin(o.start), 0)
  const parts: string[] = []
  if (classes) parts.push(`${classes} ${classes === 1 ? 'čas' : 'časa'} na faksu`)
  if (workouts) parts.push(workouts === 1 ? 'trening' : `${workouts} treninga`)
  if (studyMin) parts.push(`${+(studyMin / 60).toFixed(1)} h učenja`)
  if (!parts.length)
    return studyAndWorkoutLabel ? 'Danas je slobodan dan. Iskoristi ga pametno. 🙂' : ''
  return 'Danas: ' + parts.join(', ')
}

export function categoryEmoji(c: Category) {
  return CATEGORY_META[c].emoji
}
export { addDaysStr }
