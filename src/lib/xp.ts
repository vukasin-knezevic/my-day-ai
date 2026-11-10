// XP, levels, streaks and the user-named reward time. Pure functions.
import type { Activity, AppData, Category, Progress } from '../types'
import { addDaysStr, durationMin } from './dates'
import { habitDone, sleepHours } from './life'
import { t } from '../i18n'

/** XP needed for each level; the names are translated (`level.0` ... `level.7`). */
export const LEVELS = [
  { xp: 0 },
  { xp: 100 },
  { xp: 300 },
  { xp: 600 },
  { xp: 1000 },
  { xp: 1600 },
  { xp: 2400 },
  { xp: 3500 },
] as const

const levelName = (i: number) => t(`level.${i}` as 'level.0')

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
    name: levelName(index),
    nextName: next ? levelName(index + 1) : null,
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

/** Reward minutes earned: rewardMinPerStudyHour for every hour of study. */
export function rewardForStudy(minutes: number, rewardMinPerStudyHour: number): number {
  return Math.floor(((minutes / 60) * rewardMinPerStudyHour) / 5) * 5
}

export interface AwardEvent {
  /** Unique id of the thing being rewarded: the same id never pays twice */
  id: string
  date: string
  reason: string
  xp: number
  category: Category
  rewardMin?: number
  /** ISO time of the event; the store fills it in */
  at?: string
}

export interface RewardInfo {
  name: string
  emoji: string
}
const DEFAULT_REWARD: RewardInfo = { name: 'Reward', emoji: '🎮' }

export function award(
  p: Progress,
  e: AwardEvent,
  reward: RewardInfo = DEFAULT_REWARD,
): { progress: Progress; messages: string[] } {
  if (p.awarded.includes(e.id) || (e.xp <= 0 && !e.rewardMin)) return { progress: p, messages: [] }
  const before = levelFor(p.xp)
  const progress: Progress = {
    ...p,
    xp: p.xp + e.xp,
    rewardEarnedMin: p.rewardEarnedMin + (e.rewardMin ?? 0),
    awarded: [...p.awarded, e.id],
    events: [
      ...p.events,
      {
        id: e.id,
        date: e.date,
        reason: e.reason,
        xp: e.xp,
        category: e.category,
        ...(e.rewardMin ? { rewardMin: e.rewardMin } : {}),
        ...(e.at ? { at: e.at } : {}),
      },
    ].slice(-500),
  }
  const after = levelFor(progress.xp)
  const messages: string[] = []
  if (e.xp > 0) messages.push(t('xp.gain', { xp: e.xp, reason: e.reason }))
  if (e.rewardMin)
    messages.push(t('xp.reward', { emoji: reward.emoji, n: e.rewardMin, name: reward.name }))
  if (after.index > before.index) messages.push(t('xp.levelUp', { name: after.name }))
  return { progress, messages }
}

/**
 * Takes back everything one award gave: XP, reward minutes, the id (so it can be earned again) and
 * the event. Unknown ids change nothing. XP never goes below 0 and the reward balance never below 0.
 */
export function revoke(p: Progress, id: string): Progress {
  return revokeWhere(p, (x) => x === id)
}

/** Same as `revoke` for every award whose id matches (e.g. all PR bonuses of one workout). */
export function revokeWhere(p: Progress, match: (id: string) => boolean): Progress {
  const gone = p.events.filter((e) => match(e.id))
  const stale = p.awarded.filter(match)
  if (!gone.length && !stale.length) return p
  const xp = gone.reduce((n, e) => n + e.xp, 0)
  const min = gone.reduce((n, e) => n + (e.rewardMin ?? 0), 0)
  return {
    ...p,
    xp: Math.max(0, p.xp - xp),
    rewardEarnedMin: Math.max(p.rewardSpentMin, p.rewardEarnedMin - min),
    awarded: p.awarded.filter((x) => !match(x)),
    events: p.events.filter((e) => !match(e.id)),
  }
}

/** The reward for marking an occurrence of an activity as done (null if it pays nothing). */
export function rewardForDone(
  a: { id: string; title: string; category: Category; start: string; end: string },
  date: string,
  rewardMinPerStudyHour: number,
): AwardEvent | null {
  const minutes = durationMin(a.start, a.end)
  const xp = xpForActivity(a.category, minutes)
  const rewardMin = a.category === 'study' ? rewardForStudy(minutes, rewardMinPerStudyHour) : 0
  if (xp <= 0 && !rewardMin) return null
  return { id: `act-${a.id}-${date}`, date, reason: a.title, xp, category: a.category, rewardMin }
}

/** Streak milestone messages for all streaks (e.g. "🔥 7 dana treninga zaredom!"). */
export function streakMessages(s: Streaks): string[] {
  const keys: (keyof Streaks)[] = ['study', 'workout', 'sleep', 'habits']
  return keys.filter((k) => isMilestone(s[k])).map((k) => t(`streak.${k}`, { n: s[k] }))
}

/** Spends reward time. Cannot spend more than the balance: then nothing changes. */
export function spendReward(p: Progress, minutes: number): Progress {
  const n = Math.max(0, minutes)
  if (n > rewardBalance(p)) return p
  return { ...p, rewardSpentMin: p.rewardSpentMin + n }
}
/** Earned minus spent; never below 0. */
export const rewardBalance = (p: Progress) => Math.max(0, p.rewardEarnedMin - p.rewardSpentMin)

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
