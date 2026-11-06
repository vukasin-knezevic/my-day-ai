// XP, levels, streaks and PS5 time as a reward. Pure functions.
import type { Activity, AppData, Category, Progress } from '../types'
import { addDaysStr, timeToMin } from './dates'
import { habitDone, sleepHours } from './life'

export const LEVELS = [
  { name: 'Brucoš', xp: 0 },
  { name: 'Student', xp: 100 },
  { name: 'Vredni student', xp: 300 },
  { name: 'Kolokvijant', xp: 600 },
  { name: 'Ispitni borac', xp: 1000 },
  { name: 'Veteran amfiteatra', xp: 1600 },
  { name: 'Mentor', xp: 2400 },
  { name: 'Inženjer', xp: 3500 },
] as const

export interface LevelInfo {
  index: number
  name: string
  nextName: string | null
  /** XP inside this level and the size of this level (null at max level) */
  into: number
  size: number | null
}

export function levelFor(xp: number): LevelInfo {
  let index = 0
  LEVELS.forEach((l, i) => {
    if (xp >= l.xp) index = i
  })
  const next = LEVELS[index + 1]
  return {
    index,
    name: LEVELS[index].name,
    nextName: next?.name ?? null,
    into: xp - LEVELS[index].xp,
    size: next ? next.xp - LEVELS[index].xp : null,
  }
}

/* ---- XP rules ---- */
export const XP = {
  workout: 30,
  registration: 20,
  habit: 5,
  personalRecord: 15,
  otherActivity: 5,
} as const

/** Study: 10 XP per 30 min. Workout 30. Habits/food/sleep 5. Games/money 0. */
export function xpForActivity(category: Category, minutes: number): number {
  switch (category) {
    case 'study':
      return Math.floor(minutes / 30) * 10
    case 'workout':
      return XP.workout
    case 'habits':
    case 'food':
    case 'sleep':
      return XP.otherActivity
    default:
      return 0
  }
}

/** PS5 minutes earned: ps5MinPerStudyHour for every hour of study. */
export function ps5ForStudy(minutes: number, ps5MinPerStudyHour: number): number {
  return Math.floor(((minutes / 60) * ps5MinPerStudyHour) / 5) * 5
}

export interface AwardEvent {
  /** Unique id of the thing being rewarded: the same id never pays twice */
  id: string
  date: string
  reason: string
  xp: number
  category: Category
  ps5Min?: number
}

export function award(p: Progress, e: AwardEvent): { progress: Progress; messages: string[] } {
  if (p.awarded.includes(e.id) || (e.xp <= 0 && !e.ps5Min)) return { progress: p, messages: [] }
  const before = levelFor(p.xp)
  const progress: Progress = {
    ...p,
    xp: p.xp + e.xp,
    ps5EarnedMin: p.ps5EarnedMin + (e.ps5Min ?? 0),
    awarded: [...p.awarded, e.id],
    events: [
      ...p.events,
      { id: e.id, date: e.date, reason: e.reason, xp: e.xp, category: e.category },
    ].slice(-500),
  }
  const after = levelFor(progress.xp)
  const messages: string[] = []
  if (e.xp > 0) messages.push(`+${e.xp} XP · ${e.reason}`)
  if (e.ps5Min) messages.push(`🎮 +${e.ps5Min} min PS5`)
  if (after.index > before.index) messages.push(`🎉 Novi nivo: ${after.name}!`)
  return { progress, messages }
}

/** The reward for marking an occurrence of an activity as done (null if it pays nothing). */
export function rewardForDone(
  a: { id: string; title: string; category: Category; start: string; end: string },
  date: string,
  ps5MinPerStudyHour: number,
): AwardEvent | null {
  const minutes = timeToMin(a.end) - timeToMin(a.start)
  const xp = xpForActivity(a.category, minutes)
  const ps5Min = a.category === 'study' ? ps5ForStudy(minutes, ps5MinPerStudyHour) : 0
  if (xp <= 0 && !ps5Min) return null
  return { id: `act-${a.id}-${date}`, date, reason: a.title, xp, category: a.category, ps5Min }
}

/** Streak milestone messages for all streaks (e.g. "🔥 7 dana treninga zaredom!"). */
export function streakMessages(s: Streaks): string[] {
  const names: [keyof Streaks, string][] = [
    ['study', 'učenja'],
    ['workout', 'treninga'],
    ['sleep', 'dobrog sna'],
    ['habits', 'navika'],
  ]
  return names.filter(([k]) => isMilestone(s[k])).map(([k, n]) => `🔥 ${s[k]} dana ${n} zaredom!`)
}

export function spendPs5(p: Progress, minutes: number): Progress {
  return { ...p, ps5SpentMin: p.ps5SpentMin + Math.max(0, minutes) }
}
export const ps5Balance = (p: Progress) => p.ps5EarnedMin - p.ps5SpentMin

/* ---- streaks ---- */
/** Consecutive days ending today (or yesterday, if today is not done yet). */
export function streakOf(days: Iterable<string>, today: string): number {
  const set = new Set(days)
  let d = set.has(today) ? today : addDaysStr(today, -1)
  let n = 0
  while (set.has(d)) {
    n++
    d = addDaysStr(d, -1)
  }
  return n
}

export const MILESTONES = [3, 7, 14, 30, 60, 100]
export const isMilestone = (n: number) => MILESTONES.includes(n)

function doneDates(a: Activity): string[] {
  return a.recurrence === 'none' ? (a.status === 'done' ? [a.date] : []) : (a.doneDates ?? [])
}

export interface Streaks {
  study: number
  workout: number
  sleep: number
  habits: number
}

export function computeStreaks(data: AppData, today: string, minSleepHours = 7): Streaks {
  const studyDays = data.activities.filter((a) => a.category === 'study').flatMap(doneDates)
  const workoutDays = [
    ...data.workouts.map((w) => w.date),
    ...data.activities.filter((a) => a.category === 'workout').flatMap(doneDates),
  ]
  const sleepDays = data.sleep
    .filter((s) => (sleepHours(s) ?? 0) >= minSleepHours)
    .map((s) => s.date)
  const habitDays = new Set<string>()
  if (data.habits.length) {
    const all = new Set(data.habits.flatMap((h) => Object.keys(h.entries)))
    for (const d of all) if (data.habits.every((h) => habitDone(h, d))) habitDays.add(d)
  }
  return {
    study: streakOf(studyDays, today),
    workout: streakOf(workoutDays, today),
    sleep: streakOf(sleepDays, today),
    habits: streakOf(habitDays, today),
  }
}
