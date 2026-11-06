import type { Meal, Workout, WorkoutPlan } from '../types'
import { addDaysStr, weekStartStr } from './dates'

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

/** Exercises in `workout` that beat all earlier workouts (weight > 0 and strictly higher). */
export function newRecords(
  workout: Pick<Workout, 'exercises'>,
  previous: Workout[],
): { name: string; weight: number; before: number }[] {
  const prev = personalRecords(previous)
  const out: { name: string; weight: number; before: number }[] = []
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

export const SPLITS: WorkoutPlan[] = [
  {
    name: '3× Full body',
    source: 'template',
    days: [1, 3, 5].map((day) => ({
      day: day as 1 | 3 | 5,
      title: 'Full body',
      exercises: [
        { name: 'Čučanj', sets: 3, reps: '8' },
        { name: 'Bench press', sets: 3, reps: '8' },
        { name: 'Veslanje šipkom', sets: 3, reps: '8' },
        { name: 'Overhead press', sets: 3, reps: '10' },
        { name: 'Plank', sets: 3, reps: '45 s' },
      ],
    })),
  },
  {
    name: '4× Gornji / donji',
    source: 'template',
    days: [
      {
        day: 1,
        title: 'Gornji deo',
        exercises: [
          { name: 'Bench press', sets: 4, reps: '6-8' },
          { name: 'Veslanje šipkom', sets: 4, reps: '8' },
          { name: 'Overhead press', sets: 3, reps: '10' },
          { name: 'Zadnja loža ruku', sets: 3, reps: '12' },
        ],
      },
      {
        day: 2,
        title: 'Donji deo',
        exercises: [
          { name: 'Čučanj', sets: 4, reps: '6-8' },
          { name: 'Rumunsko mrtvo dizanje', sets: 3, reps: '8' },
          { name: 'Iskoraci', sets: 3, reps: '10' },
          { name: 'Listovi', sets: 4, reps: '15' },
        ],
      },
      {
        day: 4,
        title: 'Gornji deo',
        exercises: [
          { name: 'Kosi bench', sets: 4, reps: '8' },
          { name: 'Zgibovi', sets: 4, reps: '6-10' },
          { name: 'Bočno dizanje', sets: 3, reps: '15' },
          { name: 'Biceps pregib', sets: 3, reps: '12' },
        ],
      },
      {
        day: 5,
        title: 'Donji deo',
        exercises: [
          { name: 'Mrtvo dizanje', sets: 3, reps: '5' },
          { name: 'Leg press', sets: 3, reps: '12' },
          { name: 'Zadnja loža', sets: 3, reps: '12' },
          { name: 'Plank', sets: 3, reps: '45 s' },
        ],
      },
    ],
  },
  {
    name: '5× Push / Pull / Noge',
    source: 'template',
    days: [
      {
        day: 1,
        title: 'Push',
        exercises: [
          { name: 'Bench press', sets: 4, reps: '6-8' },
          { name: 'Overhead press', sets: 3, reps: '8-10' },
          { name: 'Kosi bench', sets: 3, reps: '10' },
          { name: 'Triceps sprava', sets: 3, reps: '12' },
        ],
      },
      {
        day: 2,
        title: 'Pull',
        exercises: [
          { name: 'Zgibovi', sets: 4, reps: '6-10' },
          { name: 'Veslanje šipkom', sets: 4, reps: '8' },
          { name: 'Face pull', sets: 3, reps: '15' },
          { name: 'Biceps pregib', sets: 3, reps: '12' },
        ],
      },
      {
        day: 3,
        title: 'Noge',
        exercises: [
          { name: 'Čučanj', sets: 4, reps: '6-8' },
          { name: 'Rumunsko mrtvo dizanje', sets: 3, reps: '8' },
          { name: 'Leg press', sets: 3, reps: '12' },
          { name: 'Listovi', sets: 4, reps: '15' },
        ],
      },
      {
        day: 5,
        title: 'Push',
        exercises: [
          { name: 'Overhead press', sets: 4, reps: '6-8' },
          { name: 'Bench press', sets: 3, reps: '10' },
          { name: 'Bočno dizanje', sets: 4, reps: '15' },
          { name: 'Triceps sprava', sets: 3, reps: '12' },
        ],
      },
      {
        day: 6,
        title: 'Pull + noge',
        exercises: [
          { name: 'Mrtvo dizanje', sets: 3, reps: '5' },
          { name: 'Zgibovi', sets: 3, reps: '8' },
          { name: 'Iskoraci', sets: 3, reps: '10' },
          { name: 'Biceps pregib', sets: 3, reps: '12' },
        ],
      },
    ],
  },
]
