import type { AppData, Meal, Weekday, Workout, WorkoutPlan } from '../types'
import { t } from '../i18n'
import { addDaysStr, weekStartStr } from './dates'
import { doneDates } from './schedule'

const norm = (s: string) => s.trim().toLowerCase()

export function maxWeight(w: Workout, exercise: string): number {
  return Math.max(
    0,
    ...w.exercises
      .filter((e) => norm(e.name) === norm(exercise))
      .flatMap((e) => e.sets.map((s) => s.weight)),
  )
}

/** Best weight ever lifted per exercise (lowercase key). */
/** Workouts that really happened (exercises planned for a scheduled workout are not history yet). */
export const logged = (workouts: Workout[]): Workout[] => workouts.filter((w) => !w.planned)

/**
 * How long a workout will take, judged by its sets: about 3 minutes a set plus warming up.
 * Nothing entered = an hour.
 */
export function estimateMinutes(exercises: { sets: number | unknown[] }[]): number {
  const sets = exercises.reduce((n, e) => n + (Array.isArray(e.sets) ? e.sets.length : e.sets), 0)
  if (sets === 0) return 60
  return Math.max(20, Math.round((sets * 3 + 10) / 5) * 5)
}

/** One workout that was done, whatever screen it was marked on. */
export interface DoneWorkout {
  key: string
  date: string
}

/**
 * THE source for "workouts done": the weekly counter, the streak, the planner and the overview all
 * read this. A scheduled workout counts through its activity; exercises logged for it are the same
 * workout, not a second one. A log without a scheduled workout (older data) counts by itself.
 */
export function doneWorkouts(data: Pick<AppData, 'activities' | 'workouts'>): DoneWorkout[] {
  const out: DoneWorkout[] = []
  const scheduled = new Set<string>()
  for (const a of data.activities) {
    if (a.category !== 'workout') continue
    scheduled.add(a.id)
    for (const date of doneDates(a)) out.push({ key: `act-${a.id}-${date}`, date })
  }
  for (const w of logged(data.workouts)) {
    if (w.activityId && scheduled.has(w.activityId)) continue
    out.push({ key: `workout-${w.id}`, date: w.date })
  }
  return out
}

/** How many workouts were done in the week of the given date. */
export function workoutsDoneInWeek(
  data: Pick<AppData, 'activities' | 'workouts'>,
  dateInWeek: string,
): number {
  const [start, end] = [weekStartStr(dateInWeek), addDaysStr(weekStartStr(dateInWeek), 6)]
  return doneWorkouts(data).filter((w) => w.date >= start && w.date <= end).length
}

export function personalRecords(workouts: Workout[]): Record<string, number> {
  const rec: Record<string, number> = {}
  for (const w of workouts)
    for (const e of w.exercises) {
      const m = Math.max(0, ...e.sets.map((s) => s.weight))
      const k = norm(e.name)
      if (m > (rec[k] ?? 0)) rec[k] = m
    }
  return rec
}

export interface NewRecord {
  name: string
  weight: number
  before: number
}

/** Exercises in `workout` that beat all earlier workouts (weight > 0 and strictly higher). */
export function newRecords(workout: Pick<Workout, 'exercises'>, previous: Workout[]): NewRecord[] {
  const prev = personalRecords(previous)
  const out: NewRecord[] = []
  for (const e of workout.exercises) {
    const weight = Math.max(0, ...e.sets.map((s) => s.weight))
    const before = prev[norm(e.name)] ?? 0
    // first time doing an exercise is not a "record"; there must be something to beat
    if (
      weight > 0 &&
      before > 0 &&
      weight > before &&
      !out.some((o) => norm(o.name) === norm(e.name))
    )
      out.push({ name: e.name, weight, before })
  }
  return out
}

export function exerciseNames(workouts: Workout[]): string[] {
  const names = new Map<string, string>()
  for (const w of workouts) for (const e of w.exercises) names.set(norm(e.name), e.name)
  return [...names.values()].sort((a, b) => a.localeCompare(b))
}

/** Max weight per workout date for one exercise (for the chart). */
export function exerciseHistory(
  workouts: Workout[],
  exercise: string,
): { date: string; weight: number }[] {
  return workouts
    .filter((w) => w.exercises.some((e) => norm(e.name) === norm(exercise)))
    .map((w) => ({ date: w.date, weight: maxWeight(w, exercise) }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function workoutsInWeek(workouts: Workout[], dateInWeek: string): Workout[] {
  const start = weekStartStr(dateInWeek)
  const end = addDaysStr(start, 6)
  return workouts.filter((w) => w.date >= start && w.date <= end)
}

export function totalVolume(w: Workout): number {
  return w.exercises.reduce((n, e) => n + e.sets.reduce((m, s) => m + s.reps * s.weight, 0), 0)
}

export function proteinOn(meals: Meal[], date: string): number {
  return meals.filter((m) => m.date === date).reduce((n, m) => n + m.protein, 0)
}

type ExKey = Parameters<typeof t>[0]
type SplitDay = { day: Weekday; title: ExKey; ex: [ExKey, number, string][] }
const SPLIT_DEFS: { name: ExKey; days: SplitDay[] }[] = [
  {
    name: 'split.full3',
    days: ([1, 3, 5] as Weekday[]).map((day) => ({
      day,
      title: 'split.full' as ExKey,
      ex: [
        ['ex.squat', 3, '8'],
        ['ex.bench', 3, '8'],
        ['ex.row', 3, '8'],
        ['ex.ohp', 3, '10'],
        ['ex.plank', 3, '45 s'],
      ] as [ExKey, number, string][],
    })),
  },
  {
    name: 'split.ul4',
    days: [
      {
        day: 1,
        title: 'split.upper',
        ex: [
          ['ex.bench', 4, '6-8'],
          ['ex.row', 4, '8'],
          ['ex.ohp', 3, '10'],
          ['ex.triceps', 3, '12'],
        ],
      },
      {
        day: 2,
        title: 'split.lower',
        ex: [
          ['ex.squat', 4, '6-8'],
          ['ex.rdl', 3, '8'],
          ['ex.lunges', 3, '10'],
          ['ex.calves', 4, '15'],
        ],
      },
      {
        day: 4,
        title: 'split.upper',
        ex: [
          ['ex.incline', 4, '8'],
          ['ex.pullups', 4, '6-10'],
          ['ex.lateral', 3, '15'],
          ['ex.biceps', 3, '12'],
        ],
      },
      {
        day: 5,
        title: 'split.lower',
        ex: [
          ['ex.deadlift', 3, '5'],
          ['ex.legpress', 3, '12'],
          ['ex.hamstring', 3, '12'],
          ['ex.plank', 3, '45 s'],
        ],
      },
    ],
  },
  {
    name: 'split.ppl5',
    days: [
      {
        day: 1,
        title: 'split.push',
        ex: [
          ['ex.bench', 4, '6-8'],
          ['ex.ohp', 3, '8-10'],
          ['ex.incline', 3, '10'],
          ['ex.tricepsMachine', 3, '12'],
        ],
      },
      {
        day: 2,
        title: 'split.pull',
        ex: [
          ['ex.pullups', 4, '6-10'],
          ['ex.row', 4, '8'],
          ['ex.facepull', 3, '15'],
          ['ex.biceps', 3, '12'],
        ],
      },
      {
        day: 3,
        title: 'split.legs',
        ex: [
          ['ex.squat', 4, '6-8'],
          ['ex.rdl', 3, '8'],
          ['ex.legpress', 3, '12'],
          ['ex.calves', 4, '15'],
        ],
      },
      {
        day: 5,
        title: 'split.push',
        ex: [
          ['ex.ohp', 4, '6-8'],
          ['ex.bench', 3, '10'],
          ['ex.lateral', 4, '15'],
          ['ex.tricepsMachine', 3, '12'],
        ],
      },
      {
        day: 6,
        title: 'split.pullLegs',
        ex: [
          ['ex.deadlift', 3, '5'],
          ['ex.pullups', 3, '8'],
          ['ex.lunges', 3, '10'],
          ['ex.biceps', 3, '12'],
        ],
      },
    ],
  },
]

/** Ready-made splits in the current language (built on demand, so they follow the language). */
export function getSplits(): WorkoutPlan[] {
  return SPLIT_DEFS.map((d) => ({
    name: t(d.name),
    source: 'template',
    days: d.days.map((day) => ({
      day: day.day,
      title: t(day.title),
      exercises: day.ex.map(([name, sets, reps]) => ({ name: t(name), sets, reps })),
    })),
  }))
}
