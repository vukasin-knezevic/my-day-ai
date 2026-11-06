import {
  LEVELS,
  award,
  computeStreaks,
  isMilestone,
  levelFor,
  ps5Balance,
  ps5ForStudy,
  spendPs5,
  streakOf,
  xpForActivity,
} from './xp'
import { emptyData } from './defaults'
import type { Progress } from '../types'

const empty = (): Progress => emptyData().progress

describe('xpForActivity', () => {
  it('study: 10 XP per 30 min', () => {
    expect(xpForActivity('study', 30)).toBe(10)
    expect(xpForActivity('study', 29)).toBe(0)
    expect(xpForActivity('study', 120)).toBe(40)
    expect(xpForActivity('study', 100)).toBe(30)
  })
  it('workout 30, habits 5, games 0', () => {
    expect(xpForActivity('workout', 60)).toBe(30)
    expect(xpForActivity('habits', 10)).toBe(5)
    expect(xpForActivity('games', 120)).toBe(0)
  })
})

describe('levels', () => {
  it('starts as Brucoš', () => {
    expect(levelFor(0)).toMatchObject({ name: 'Brucoš', nextName: 'Student', into: 0, size: 100 })
  })
  it('boundaries', () => {
    expect(levelFor(99).name).toBe('Brucoš')
    expect(levelFor(100).name).toBe('Student')
    expect(levelFor(150)).toMatchObject({ into: 50, size: 200 })
  })
  it('max level has no next', () => {
    const last = LEVELS[LEVELS.length - 1]
    expect(levelFor(last.xp + 9999)).toMatchObject({ name: 'Inženjer', nextName: null, size: null })
  })
})

describe('award', () => {
  const ev = { id: 'a1', date: '2026-11-06', reason: 'Učenje', xp: 40, category: 'study' as const }
  it('adds XP and PS5 minutes', () => {
    const { progress, messages } = award(empty(), { ...ev, ps5Min: 60 })
    expect(progress.xp).toBe(40)
    expect(progress.ps5EarnedMin).toBe(60)
    expect(messages.join(' ')).toContain('+40 XP')
  })
  it('never pays the same id twice', () => {
    const once = award(empty(), ev).progress
    const twice = award(once, ev)
    expect(twice.progress.xp).toBe(40)
    expect(twice.messages).toEqual([])
  })
  it('level-up message', () => {
    const { messages } = award({ ...empty(), xp: 90 }, ev)
    expect(messages.some((m) => m.includes('Novi nivo: Student'))).toBe(true)
  })
  it('zero-xp events without PS5 are ignored', () => {
    expect(award(empty(), { ...ev, xp: 0 }).progress.awarded).toEqual([])
  })
})

describe('PS5 time', () => {
  it('earns per study hour (default 30 min/h)', () => {
    expect(ps5ForStudy(60, 30)).toBe(30)
    expect(ps5ForStudy(120, 30)).toBe(60)
    expect(ps5ForStudy(90, 30)).toBe(45)
    expect(ps5ForStudy(60, 20)).toBe(20)
  })
  it('balance = earned − spent, never grows from negative spend', () => {
    let p = award(empty(), {
      id: 'x',
      date: 'd',
      reason: 'r',
      xp: 10,
      category: 'study',
      ps5Min: 60,
    }).progress
    p = spendPs5(p, 45)
    expect(ps5Balance(p)).toBe(15)
    expect(ps5Balance(spendPs5(p, -100))).toBe(15)
  })
  it('can go negative (no scolding) — shown as is', () => {
    expect(ps5Balance(spendPs5(empty(), 30))).toBe(-30)
  })
})

describe('streaks', () => {
  it('streakOf counts consecutive days', () => {
    expect(streakOf(['2026-11-04', '2026-11-05', '2026-11-06'], '2026-11-06')).toBe(3)
  })
  it('today missing does not break it; a gap does', () => {
    expect(streakOf(['2026-11-04', '2026-11-05'], '2026-11-06')).toBe(2)
    expect(streakOf(['2026-11-03', '2026-11-05'], '2026-11-06')).toBe(1)
    expect(streakOf([], '2026-11-06')).toBe(0)
  })
  it('milestones', () => {
    expect(isMilestone(7)).toBe(true)
    expect(isMilestone(8)).toBe(false)
  })
  it('computeStreaks from data', () => {
    const d = emptyData()
    d.workouts = [5, 6].map((n) => ({
      id: String(n),
      date: `2026-11-0${n}`,
      type: 't',
      durationMin: 1,
      exercises: [],
      feeling: 3 as const,
    }))
    d.activities = [
      {
        id: 'a',
        title: 's',
        category: 'study',
        date: '2026-11-06',
        start: '10:00',
        end: '11:00',
        recurrence: 'none',
        status: 'done',
        source: 'me',
      },
      {
        id: 'b',
        title: 's',
        category: 'study',
        date: '2026-11-01',
        start: '10:00',
        end: '11:00',
        recurrence: 'daily',
        status: 'planned',
        source: 'me',
        doneDates: ['2026-11-05', '2026-11-06'],
      },
    ]
    d.sleep = [
      {
        id: 's',
        date: '2026-11-06',
        bedtime: '2026-11-05T23:00:00',
        wakeTime: '2026-11-06T07:30:00',
        quality: 4,
        source: 'manual',
      },
    ]
    d.habits = [
      {
        id: 'h',
        name: 'x',
        emoji: 'x',
        goal: 1,
        unit: '',
        entries: { '2026-11-06': 1, '2026-11-05': 1, '2026-11-04': 0 },
      },
    ]
    expect(computeStreaks(d, '2026-11-06')).toEqual({ study: 2, workout: 2, sleep: 1, habits: 2 })
  })
})
