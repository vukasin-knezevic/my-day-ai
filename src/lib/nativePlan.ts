// What the Android app asks the system to show later (pure: no plugin). The system fires these even
// when the app is closed, so everything for the next two days is planned ahead and replanned whenever
// the app opens, syncs, or the data changes.
import type { AppData } from '../types'
import { addDaysStr, timeToMin, todayStr } from './dates'
import { dueReminders, LEAD, type Reminder } from './reminders'
import { occurrencesOn } from './schedule'
import { routineGoal } from './routine'
import { MAX_NOTIFICATIONS_PER_DAY, planStepReminders } from './health/steps'
import { t } from '../i18n'

export type Channel = 'reminders' | 'routine' | 'alarm'

export interface PlannedNotification {
  /** Stable string id (also the notification tag) */
  key: string
  channel: Channel
  at: Date
  title: string
  body: string
  /** Where a tap opens the app */
  route: string
  actions?: { action: string; title: string }[]
}

/** Notification ids must be 32-bit numbers: a stable hash of the key. */
export function numericId(key: string): number {
  let h = 5381
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) | 0
  return Math.abs(h) % 2147483000 || 1
}

const atMin = (day: string, min: number) => {
  const d = new Date(`${day}T00:00:00`)
  d.setMinutes(min)
  return d
}

function routeFor(r: Reminder): string {
  if (r.id.startsWith('routine-')) return '/'
  if (r.id.startsWith('bed-')) return '/health?tab=san'
  if (r.id.startsWith('ev-')) return '/'
  return '/study'
}

/**
 * Everything to schedule for today and tomorrow, in time order, after `now`.
 * At most 6 per day (the steps reminders are the first to go), nothing for a time already past.
 */
export function planNotifications(data: AppData, now: Date, days = 2): PlannedNotification[] {
  const out: PlannedNotification[] = []
  const seen = new Set<string>()
  const today = todayStr(now)
  const s = data.settings

  for (let i = 0; i < days; i++) {
    const day = addDaysStr(today, i)
    // the moments a reminder can fire: before an event, at 09:00 (deadlines), the routine goal, before bed
    const candidates = new Set<number>([
      9 * 60,
      timeToMin(routineGoal(s)),
      timeToMin(s.bedTime) - LEAD.bed,
    ])
    for (const o of occurrencesOn(data, day))
      if (!o.suggested && o.status === 'planned') candidates.add(timeToMin(o.start) - LEAD.event)
    for (const raw of candidates) {
      const min = ((raw % 1440) + 1440) % 1440
      const at = atMin(day, min)
      if (at <= now) continue
      for (const r of dueReminders(data, at, new Set())) {
        if (seen.has(r.id)) continue
        seen.add(r.id)
        out.push({
          key: r.id,
          channel: r.id.startsWith('routine-') ? 'routine' : 'reminders',
          at,
          title: r.title,
          body: r.body,
          route: routeFor(r),
          actions: r.actions,
        })
      }
    }
    if (s.wakeAlarm && s.onboarded) {
      const at = atMin(day, timeToMin(s.wakeTime))
      if (at > now)
        out.push({
          key: `alarm-${day}`,
          channel: 'alarm',
          at,
          title: t('alarm.title'),
          body: t('alarm.body'),
          route: '/alarm',
        })
    }
  }

  out.sort((a, b) => a.at.getTime() - b.at.getTime())

  // steps reminders: today's remaining and tomorrow's (the count is unknown ahead, so they are
  // cancelled/rescheduled whenever the app opens or syncs and the goal turns out reached)
  for (let i = 0; i < days; i++) {
    const day = addDaysStr(today, i)
    const others = out.filter((n) => todayStr(n.at) === day).length
    const steps = i === 0 ? (data.days[day]?.steps ?? 0) : 0
    const nowMin = i === 0 ? now.getHours() * 60 + now.getMinutes() : -1
    for (const r of planStepReminders({
      enabled: s.stepReminders && s.watchConnected,
      steps,
      goal: s.stepGoal,
      nowMin,
      bedTime: s.bedTime,
      wakeTime: s.wakeTime,
      otherToday: others,
    }))
      out.push({
        key: `${r.id}-${day}`,
        channel: 'reminders',
        at: atMin(day, timeToMin(r.time)),
        title: t('steps.remTitle'),
        body: t('steps.remBody', { goal: String(s.stepGoal) }),
        route: '/health?tab=koraci',
      })
  }

  // the daily cap, the earliest ones are kept
  const perDay = new Map<string, number>()
  return out
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .filter((n) => {
      const d = todayStr(n.at)
      const c = (perDay.get(d) ?? 0) + 1
      perDay.set(d, c)
      return c <= MAX_NOTIFICATIONS_PER_DAY
    })
}
