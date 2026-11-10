// The main streak: a day counts when at least one thing was done. Every 7 days in a row earns a
// "save" (up to 2 kept); a missed day spends one by itself. Without a save the streak starts again.
import type { AppData } from '../types'
import { addDaysStr, weekDates } from './dates'
import { habitDone } from './life'
import { doneDates } from './schedule'
import { doneWorkouts } from './workout'

export const STREAK_SAVE_EVERY = 7
export const MAX_SAVES = 2

/** Every day on which something was done. */
export function activeDays(data: AppData): Set<string> {
  const days = new Set<string>()
  for (const e of data.progress.events) days.add(e.date)
  for (const a of data.activities) for (const d of doneDates(a)) days.add(d)
  for (const w of doneWorkouts(data)) days.add(w.date)
  for (const h of data.habits)
    for (const d of Object.keys(h.entries)) if (habitDone(h, d)) days.add(d)
  for (const [d, r] of Object.entries(data.days)) {
    if (r.routine?.length || r.closed || r.challengeDone) days.add(d)
  }
  return days
}

export interface MainStreak {
  /** Days in a row now (a day not done yet today does not break it) */
  current: number
  best: number
  /** Saves in reserve */
  savers: number
  /** How many saves were spent so far, and on which days */
  spent: number
  spentDays: string[]
}

export function mainStreak(days: ReadonlySet<string>, today: string): MainStreak {
  const first = [...days].filter((d) => d <= today).sort()[0]
  const out: MainStreak = { current: 0, best: 0, savers: 0, spent: 0, spentDays: [] }
  if (!first) return out
  let run = 0
  for (let d = first; d <= today; d = addDaysStr(d, 1)) {
    if (days.has(d)) {
      run++
      out.best = Math.max(out.best, run)
      if (run % STREAK_SAVE_EVERY === 0) out.savers = Math.min(MAX_SAVES, out.savers + 1)
    } else if (d !== today) {
      if (out.savers > 0) {
        out.savers--
        out.spent++
        out.spentDays.push(d)
      } else run = 0
    }
  }
  out.current = run
  return out
}

/** Active days of the week the given day is in (0-7), for the weekly ring. */
export function activeInWeek(days: ReadonlySet<string>, date: string): number {
  return weekDates(date).filter((d) => days.has(d)).length
}
