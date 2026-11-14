// Steps: the goal, the ring, the reminder plan. Pure functions.

export const STEP_GOAL_DEFAULT = 10000
export const STEP_GOAL_MIN = 1000
export const STEP_GOAL_MAX = 50000
/** Local times of the steps reminders (only while the goal is not reached). */
export const STEP_REMINDER_TIMES = ['12:00', '16:00', '20:00'] as const
/** Cap on notifications per day (the app already promises not to send more). */
export const MAX_NOTIFICATIONS_PER_DAY = 6

export const clampGoal = (n: number) =>
  Math.min(
    STEP_GOAL_MAX,
    Math.max(STEP_GOAL_MIN, Math.round(Number.isFinite(n) ? n : STEP_GOAL_DEFAULT)),
  )

export const goalReached = (steps: number, goal: number) => steps >= goal

/** 0..1 for the ring (a goal of 0 never divides). */
export const ringFraction = (steps: number, goal: number) =>
  goal > 0 ? Math.min(1, Math.max(0, steps / goal)) : 0

export const stepsAwardId = (date: string) => `steps-${date}`

export interface PlannedReminder {
  id: string
  /** 'HH:mm' */
  time: string
}

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))

/**
 * The steps reminders still to come today. None when they are off or the goal is reached; none
 * after bedtime (bedtime may be after midnight: then "after bedtime" is not a limit before it).
 * `otherToday` = how many other notifications are already planned for today (the daily cap).
 */
export function planStepReminders(input: {
  enabled: boolean
  steps: number
  goal: number
  nowMin: number
  bedTime: string
  wakeTime: string
  otherToday: number
}): PlannedReminder[] {
  if (!input.enabled || goalReached(input.steps, input.goal)) return []
  const bed = toMin(input.bedTime)
  const wake = toMin(input.wakeTime)
  const room = Math.max(0, MAX_NOTIFICATIONS_PER_DAY - input.otherToday)
  return STEP_REMINDER_TIMES.filter((t) => {
    const m = toMin(t)
    if (m <= input.nowMin) return false
    // bedtime after midnight (00:00-06:00) is the end of "tonight": a reminder at 20:00 is fine
    // bedtime in the evening: nothing at or after it
    if (bed > wake && m >= bed) return false
    return true
  })
    .slice(0, room)
    .map((time) => ({ id: `steps-${time}`, time }))
}
