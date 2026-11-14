// Sleep from the watch -> sleep logs. Pure functions: no store, no plugin.
import type { SleepLog } from '../../types'
import type { SleepSession } from './types'

/** A session shorter than this (after merging) is a nap and is ignored. */
export const MIN_NIGHT_MIN = 30
/** Sessions closer than this are one night (a short wake-up in the middle). */
export const MERGE_GAP_MIN = 30
/** A "night" longer than this is not a night (a broken record). */
const MAX_NIGHT_H = 20

export interface Night {
  /** Stable id: built from the start of the first session, so a re-sync gives the same id */
  id: string
  /** The day you wake up */
  date: string
  bedtime: string
  wakeTime: string
  origin: string
}

const ms = (iso: string) => new Date(iso).getTime()

/** Stable id of a night from the start of its first session. */
export const nightId = (start: string) => `watch-${start.replace(/\D/g, '').slice(0, 12)}`

/** Merges adjacent sessions, drops naps, and assigns every night to the day of the wake-up. */
export function nightsFromSessions(sessions: SleepSession[]): Night[] {
  const sorted = [...sessions]
    .filter((s) => ms(s.end) > ms(s.start))
    .sort((a, b) => ms(a.start) - ms(b.start))
  const merged: { start: string; end: string; origin: string }[] = []
  for (const s of sorted) {
    const last = merged.at(-1)
    if (last && ms(s.start) - ms(last.end) <= MERGE_GAP_MIN * 60000) {
      if (ms(s.end) > ms(last.end)) last.end = s.end
    } else merged.push({ start: s.start, end: s.end, origin: s.origin })
  }
  return merged
    .filter((m) => {
      const min = (ms(m.end) - ms(m.start)) / 60000
      return min >= MIN_NIGHT_MIN && min <= MAX_NIGHT_H * 60
    })
    .map((m) => ({
      id: nightId(m.start),
      date: m.end.slice(0, 10),
      bedtime: m.start,
      wakeTime: m.end,
      origin: m.origin,
    }))
}

export interface SleepImportPlan {
  add: SleepLog[]
  update: { id: string; patch: Pick<SleepLog, 'bedtime' | 'wakeTime' | 'date'> }[]
}

/** Two time ranges overlap (a night with no wake-up written yet counts as 12 hours from bedtime). */
function overlaps(log: SleepLog, n: Night): boolean {
  const a = ms(log.bedtime)
  const b = log.wakeTime ? ms(log.wakeTime) : a + 12 * 3600000
  return a < ms(n.wakeTime) && b > ms(n.bedtime)
}

/**
 * What to do with the nights read from the watch:
 * - a manual entry for the same night always wins (same wake-up day, or overlapping times);
 * - the same night is never added twice (stable id); if the watch now reports it differently, it is updated;
 * - a night the user deleted (dismissed id) does not come back.
 */
export function planSleepImport(
  existing: SleepLog[],
  nights: Night[],
  dismissed: string[],
): SleepImportPlan {
  const plan: SleepImportPlan = { add: [], update: [] }
  const gone = new Set(dismissed)
  for (const n of nights) {
    const same = existing.find((l) => l.id === n.id)
    if (same) {
      if (same.source === 'watch' && (same.bedtime !== n.bedtime || same.wakeTime !== n.wakeTime))
        plan.update.push({
          id: same.id,
          patch: { bedtime: n.bedtime, wakeTime: n.wakeTime, date: n.date },
        })
      continue
    }
    if (gone.has(n.id)) continue
    const manual = existing.some(
      (l) => l.source === 'manual' && (l.date === n.date || overlaps(l, n)),
    )
    if (manual) continue
    // two watch sessions of one night must not both end up as logs
    if (existing.some((l) => l.source === 'watch' && l.date === n.date && overlaps(l, n))) continue
    plan.add.push({
      id: n.id,
      date: n.date,
      bedtime: n.bedtime,
      wakeTime: n.wakeTime,
      quality: null,
      source: 'watch',
    })
  }
  return plan
}
