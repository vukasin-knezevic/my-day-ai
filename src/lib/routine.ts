// The morning routine: a few small steps every morning. Pure logic; the store actions are at the end.
import type { AppData, RoutineStep, Settings } from '../types'
import { addDaysStr } from './dates'
import { t } from '../i18n'

/** After this time of day the routine card turns into "Save the day". */
export const ROUTINE_UNTIL = 11 * 60
/** Finishing within this many minutes after the wake-up goal earns the bonus. */
export const ROUTINE_BONUS_WITHIN = 60
export const ROUTINE_XP = { step: 2, all: 10, early: 5 } as const

export function defaultSteps(): RoutineStep[] {
  return [
    { emoji: '🛏️', text: t('routine.step.bed') },
    { emoji: '🤸', text: t('routine.step.stretch') },
    { emoji: '💧', text: t('routine.step.water') },
    { emoji: '🚿', text: t('routine.step.wash') },
  ]
}

/** The user's steps (3-5), or the default ones. */
export function routineSteps(s: Pick<Settings, 'routineSteps'>): RoutineStep[] {
  const own = s.routineSteps.filter((x) => x.text.trim())
  return own.length ? own.slice(0, 5) : defaultSteps()
}

export const routineGoal = (s: Pick<Settings, 'routineGoal' | 'wakeTime'>) =>
  s.routineGoal || s.wakeTime

export type RoutineView =
  | { mode: 'off' }
  | { mode: 'full'; steps: RoutineStep[]; done: number[]; complete: boolean }
  | { mode: 'rescue'; steps: RoutineStep[]; indexes: number[]; done: number[]; complete: boolean }

export const tickedOn = (data: Pick<AppData, 'days'>, date: string) =>
  data.days[date]?.routine ?? []

/** What the routine card shows now: the full list in the morning, a two-step "save the day" later. */
export function routineView(data: AppData, now: Date, today: string): RoutineView {
  const s = data.settings
  if (!s.routineOn || !s.onboarded) return { mode: 'off' }
  const steps = routineSteps(s)
  const done = tickedOn(data, today)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  if (nowMin < ROUTINE_UNTIL) {
    return { mode: 'full', steps, done, complete: steps.every((_, i) => done.includes(i)) }
  }
  const indexes = [0, 1].filter((i) => i < steps.length)
  const complete = steps.every((_, i) => done.includes(i))
  // late, and everything is done: nothing to offer
  if (complete) return { mode: 'off' }
  return { mode: 'rescue', steps, indexes, done, complete: indexes.every((i) => done.includes(i)) }
}

/** Days in a row (ending today, or yesterday if today is not done yet) with every step ticked. */
export function routineStreak(data: AppData, today: string): number {
  const n = routineSteps(data.settings).length
  const full = (d: string) => {
    const done = tickedOn(data, d)
    return Array.from({ length: n }, (_, i) => i).every((i) => done.includes(i))
  }
  let d = full(today) ? today : addDaysStr(today, -1)
  let count = 0
  while (full(d)) {
    count++
    d = addDaysStr(d, -1)
  }
  return count
}
