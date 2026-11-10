// Badges and personal records. Everything is worked out from the data (nothing extra is saved), so a
// badge can never get out of step with what the user really did.
import type { AppData } from '../types'
import { durationMin, monthOf } from './dates'
import { monthRegistrations } from './exams'
import { doneDates } from './schedule'
import { activeDays, mainStreak } from './streak'
import { personalRecords, logged } from './workout'
import { SURPRISE_PREFIX } from './surprise'
import type { BaseKey } from '../i18n'

export interface Badge {
  id: string
  icon: string
  name: BaseKey
  desc: BaseKey
  earned: boolean
  /** "12 / 50" while it is not earned yet */
  progress?: { have: number; need: number }
}

export const STUDY_HOURS_GOAL = 50

export function studyHoursDone(data: AppData): number {
  let min = 0
  for (const a of data.activities)
    if (a.category === 'study') min += doneDates(a).length * durationMin(a.start, a.end)
  return min / 60
}

export function badges(data: AppData, today: string): Badge[] {
  const days = activeDays(data)
  const streak = mainStreak(days, today)
  const month = monthOf(today)
  const regs = monthRegistrations(data.assessments, month)
  const hours = studyHoursDone(data)
  const prs = data.progress.events.some((e) => e.id.startsWith('pr-'))
  const out: Badge[] = [
    {
      id: 'week1',
      icon: '🌱',
      name: 'ach.week1',
      desc: 'ach.week1.desc',
      earned: days.size >= 7,
      progress: { have: Math.min(days.size, 7), need: 7 },
    },
    ...[7, 30, 100].map((n) => ({
      id: `streak${n}`,
      icon: n === 7 ? '🔥' : n === 30 ? '🏅' : '👑',
      name: `ach.streak${n}` as BaseKey,
      desc: `ach.streak${n}.desc` as BaseKey,
      earned: streak.best >= n,
      progress: { have: Math.min(streak.best, n), need: n },
    })),
    {
      id: 'pr',
      icon: '💪',
      name: 'ach.pr' as BaseKey,
      desc: 'ach.pr.desc' as BaseKey,
      earned: prs,
    },
    {
      id: 'onTime',
      icon: '📝',
      name: 'ach.onTime' as BaseKey,
      desc: 'ach.onTime.desc' as BaseKey,
      earned: regs.length > 0 && regs.every((a) => a.registration !== 'nije-prijavljen'),
    },
    {
      id: 'study50',
      icon: '📚',
      name: 'ach.study50' as BaseKey,
      desc: 'ach.study50.desc' as BaseKey,
      earned: hours >= STUDY_HOURS_GOAL,
      progress: { have: Math.floor(Math.min(hours, STUDY_HOURS_GOAL)), need: STUDY_HOURS_GOAL },
    },
  ]
  return out
}

/** Badges won as surprises (they are paid as XP events of 1 XP with the badge name). */
export function surpriseBadges(data: AppData): string[] {
  return data.progress.events
    .filter((e) => e.id.startsWith(SURPRISE_PREFIX) && e.xp === 1 && e.rewardMin === undefined)
    .map((e) => e.reason)
}

export interface Record1 {
  exercise: string
  kg: number
}

/** The heaviest weight per exercise, heaviest first. */
export function records(data: AppData, limit = 10): Record1[] {
  return Object.entries(personalRecords(logged(data.workouts)))
    .map(([exercise, kg]) => ({ exercise, kg }))
    .filter((r) => r.kg > 0)
    .sort((a, b) => b.kg - a.kg)
    .slice(0, limit)
}
