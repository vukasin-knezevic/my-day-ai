// Week / month overview numbers. Pure functions.
import type { AppData, Category, ExpenseCategory } from '../types'
import { addDaysStr, monthOf, weekDates, durationMin } from './dates'
import { occurrencesOn } from './schedule'
import { avgSleep } from './life'
import { subjectPoints } from './grades'
import { computeStreaks } from './xp'
import { doneWorkouts } from './workout'

export type Period = 'week' | 'month'

export function periodDates(period: Period, today: string): string[] {
  if (period === 'week') return weekDates(today)
  const m = monthOf(today)
  const out: string[] = []
  for (let d = `${m}-01`; monthOf(d) === m; d = addDaysStr(d, 1)) out.push(d)
  return out
}

/** Hours per category: done or still planned items (not skipped, not suggestions). Classes count as study. */
export function hoursByCategory(data: AppData, dates: string[]): Record<Category, number> {
  const out: Record<Category, number> = {
    study: 0,
    workout: 0,
    sleep: 0,
    games: 0,
    food: 0,
    money: 0,
    habits: 0,
  }
  for (const d of dates)
    for (const o of occurrencesOn(data, d)) {
      if (o.suggested || o.status === 'skipped') continue
      out[o.category] += durationMin(o.start, o.end) / 60
    }
  for (const c of Object.keys(out) as Category[]) out[c] = Math.round(out[c] * 10) / 10
  return out
}

export interface Overview {
  dates: string[]
  hours: Record<Category, number>
  workouts: { done: number; goal: number }
  studyHours: { actual: number; goal: number }
  avgSleep: number | null
  spent: number
  spentByCategory: Record<ExpenseCategory, number>
  xp: number
  streaks: ReturnType<typeof computeStreaks>
  pointsBySubject: { name: string; earned: number; max: number }[]
}

export function overview(data: AppData, period: Period, today: string): Overview {
  const dates = periodDates(period, today)
  const first = dates[0]
  const last = dates[dates.length - 1]
  const inRange = (d: string) => d >= first && d <= last
  const hours = hoursByCategory(data, dates)
  const scale = dates.length / 7
  const filtered = data.expenses.filter((e) => inRange(e.date))
  const cat: Record<ExpenseCategory, number> = {
    hrana: 0,
    prevoz: 0,
    igre: 0,
    faks: 0,
    izlasci: 0,
    ostalo: 0,
  }
  for (const e of filtered) cat[e.category] += e.amount
  return {
    dates,
    hours,
    workouts: {
      done: doneWorkouts(data).filter((w) => inRange(w.date)).length,
      goal: Math.round(data.settings.workoutsPerWeek * scale),
    },
    studyHours: {
      actual: hours.study,
      goal: Math.round(data.settings.studyHoursPerDay * dates.length),
    },
    avgSleep: avgSleep(
      data.sleep.filter((s) => inRange(s.date)),
      last,
      dates.length,
    ),
    spent: filtered.reduce((n, e) => n + e.amount, 0),
    spentByCategory: cat,
    xp: data.progress.events.filter((e) => inRange(e.date)).reduce((n, e) => n + e.xp, 0),
    streaks: computeStreaks(data, today),
    pointsBySubject: data.subjects.map((s) => {
      const p = subjectPoints(s, data.assessments)
      return { name: s.name, earned: p.earned, max: p.maxTotal }
    }),
  }
}
