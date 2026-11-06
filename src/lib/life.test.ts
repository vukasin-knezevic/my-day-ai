import {
  avgSleep,
  budgetStatus,
  habitDone,
  habitStreak,
  sleepHours,
  spentByCategory,
  suggestBedtime,
} from './life'
import type { Expense, Habit, SleepLog } from '../types'

const sl = (date: string, bed: string, wake: string | null): SleepLog => ({
  id: date,
  date,
  bedtime: bed,
  wakeTime: wake,
  quality: null,
  source: 'manual',
})
const ex = (date: string, amount: number, category: Expense['category'] = 'hrana'): Expense => ({
  id: date + amount,
  date,
  amount,
  category,
  description: '',
})
const habit = (entries: Record<string, number>, goal = 1): Habit => ({
  id: 'h',
  name: 'Voda',
  emoji: '💧',
  goal,
  unit: 'L',
  entries,
})

describe('sleep', () => {
  it('hours across midnight', () => {
    expect(sleepHours(sl('2026-11-06', '2026-11-06T01:30:00', '2026-11-06T09:00:00'))).toBe(7.5)
    expect(sleepHours(sl('2026-11-06', '2026-11-05T23:30:00', '2026-11-06T07:30:00'))).toBe(8)
  })
  it('open log has no duration', () => {
    expect(sleepHours(sl('2026-11-06', '2026-11-06T01:30:00', null))).toBeNull()
  })
  it('7-day average ignores old and unfinished logs', () => {
    const logs = [
      sl('2026-11-06', '2026-11-05T23:00:00', '2026-11-06T07:00:00'), // 8
      sl('2026-11-05', '2026-11-05T01:00:00', '2026-11-05T07:00:00'), // 6
      sl('2026-10-01', '2026-10-01T01:00:00', '2026-10-01T02:00:00'), // old
      sl('2026-11-04', '2026-11-04T01:00:00', null),
    ]
    expect(avgSleep(logs, '2026-11-06')).toBe(7)
    expect(avgSleep([], '2026-11-06')).toBeNull()
  })
  it('suggested bedtime', () => {
    expect(suggestBedtime('10:15', 8)).toBe('01:15')
    expect(suggestBedtime('09:00', 8, 60)).toBe('00:00')
  })
})

describe('money', () => {
  const list = [
    ex('2026-11-01', 200),
    ex('2026-11-10', 300, 'prevoz'),
    ex('2026-10-30', 999),
    ex('2026-11-12', 100),
  ]
  it('sums by category for a month', () => {
    const s = spentByCategory(list, '2026-11')
    expect(s.hrana).toBe(300)
    expect(s.prevoz).toBe(300)
    expect(s.igre).toBe(0)
  })
  it('budget status: ok / warn at 80% / over', () => {
    const st = budgetStatus(list, { hrana: 1000, prevoz: 350, igre: 100 }, '2026-11')
    expect(st.find((x) => x.category === 'hrana')).toMatchObject({ pct: 30, level: 'ok' })
    expect(st.find((x) => x.category === 'prevoz')).toMatchObject({ pct: 86, level: 'warn' })
    expect(budgetStatus([ex('2026-11-01', 150, 'igre')], { igre: 100 }, '2026-11')[0].level).toBe(
      'over',
    )
  })
  it('categories without a budget are skipped', () => {
    expect(budgetStatus(list, {}, '2026-11')).toEqual([])
  })
  it('exactly 80% warns', () => {
    expect(budgetStatus([ex('2026-11-01', 80)], { hrana: 100 }, '2026-11')[0].level).toBe('warn')
  })
})

describe('habits', () => {
  it('done when the goal is reached', () => {
    const h = habit({ '2026-11-06': 1.5 }, 2)
    expect(habitDone(h, '2026-11-06')).toBe(false)
    expect(habitDone(habit({ '2026-11-06': 2 }, 2), '2026-11-06')).toBe(true)
  })
  it('streak counts consecutive days', () => {
    const h = habit({ '2026-11-04': 1, '2026-11-05': 1, '2026-11-06': 1 })
    expect(habitStreak(h, '2026-11-06')).toBe(3)
  })
  it('today not done does not break the streak', () => {
    expect(habitStreak(habit({ '2026-11-04': 1, '2026-11-05': 1 }), '2026-11-06')).toBe(2)
  })
  it('a gap breaks the streak', () => {
    expect(
      habitStreak(habit({ '2026-11-03': 1, '2026-11-05': 1, '2026-11-06': 1 }), '2026-11-06'),
    ).toBe(2)
    expect(habitStreak(habit({}), '2026-11-06')).toBe(0)
  })
})
