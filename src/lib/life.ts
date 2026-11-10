// Pure logic for sleep, money and habits.
import type { Budget, Expense, ExpenseCategory, Habit, SleepLog } from '../types'
import { EXPENSE_CATEGORIES } from '../types'
import { addDaysStr, minToTime, monthOf, timeToMin } from './dates'
import { formatNumber } from '../i18n'

/* ---------- sleep ---------- */
export function sleepHours(log: SleepLog): number | null {
  if (!log.wakeTime) return null
  const h = (new Date(log.wakeTime).getTime() - new Date(log.bedtime).getTime()) / 3600000
  return h > 0 && h < 24 ? Math.round(h * 10) / 10 : null
}

/** How long after going to bed a wake-up still belongs to that night. */
const NIGHT_MAX_HOURS = 24

/**
 * The night that is still "open" at the given moment: the latest bedtime without a wake-up, no more
 * than a day old. An older one is a forgotten "woke up": it must not swallow tonight's sleep.
 */
export function openSleep(logs: SleepLog[], atIso: string): SleepLog | undefined {
  const at = new Date(atIso).getTime()
  return logs
    .filter((l) => {
      if (l.wakeTime !== null) return false
      const h = (at - new Date(l.bedtime).getTime()) / 3600000
      return h >= 0 && h < NIGHT_MAX_HOURS
    })
    .sort((a, b) => b.bedtime.localeCompare(a.bedtime))[0]
}

/** Can these two moments be one night of sleep? */
export function validNight(bedIso: string, wakeIso: string): boolean {
  const h = (new Date(wakeIso).getTime() - new Date(bedIso).getTime()) / 3600000
  return h > 0 && h < NIGHT_MAX_HOURS
}

/** Average sleep over the last `days` days (by wake-up date), or null if no data. */
export function avgSleep(logs: SleepLog[], today: string, days = 7): number | null {
  const from = addDaysStr(today, -(days - 1))
  const hs = logs
    .filter((l) => l.date >= from && l.date <= today)
    .map(sleepHours)
    .filter((h): h is number => h !== null)
  return hs.length ? Math.round((hs.reduce((a, b) => a + b, 0) / hs.length) * 10) / 10 : null
}

/** Suggested bedtime: first obligation tomorrow − time to get ready/travel − sleep goal. */
export function suggestBedtime(firstStart: string, goalHours: number, prepMin = 60): string {
  return minToTime(timeToMin(firstStart) - prepMin - goalHours * 60)
}

/* ---------- money ---------- */
export function spentByCategory(
  expenses: Expense[],
  month: string,
): Record<ExpenseCategory, number> {
  const out = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, 0])) as Record<
    ExpenseCategory,
    number
  >
  for (const e of expenses) if (monthOf(e.date) === month) out[e.category] += e.amount
  return out
}

export interface BudgetStatus {
  category: ExpenseCategory
  spent: number
  limit: number
  pct: number
  level: 'ok' | 'warn' | 'over'
}

export function budgetStatus(expenses: Expense[], budget: Budget, month: string): BudgetStatus[] {
  const spent = spentByCategory(expenses, month)
  return EXPENSE_CATEGORIES.filter((c) => (budget[c] ?? 0) > 0).map((category) => {
    const limit = budget[category]!
    const pct = Math.round((spent[category] / limit) * 100)
    return {
      category,
      spent: spent[category],
      limit,
      pct,
      level: pct > 100 ? 'over' : pct >= 80 ? 'warn' : 'ok',
    }
  })
}

/** 1 234 RSD / 1,234 RSD: number format of the current language + the user's currency. */
export const fmtMoney = (n: number, currency = 'RSD') =>
  `${formatNumber(Math.round(n))} ${currency}`

/* ---------- habits ---------- */
export function habitDone(h: Habit, date: string): boolean {
  return (h.entries[date] ?? 0) >= h.goal
}

/** Consecutive days with the goal reached. Today not done yet doesn't break the streak. */
export function habitStreak(h: Habit, today: string): number {
  let d = habitDone(h, today) ? today : addDaysStr(today, -1)
  let n = 0
  while (habitDone(h, d)) {
    n++
    d = addDaysStr(d, -1)
  }
  return n
}
