// Reads steps and sleep from a HealthSource and writes them into the store.
// A failure returns a typed error and writes nothing: stored data is never overwritten by a bad read.
import { useStore } from '../../store'
import { addDaysStr, todayStr } from '../dates'
import { XP } from '../xp'
import { t } from '../../i18n'
import { nightsFromSessions, planSleepImport } from './sleepImport'
import { goalReached, stepsAwardId } from './steps'
import type { HealthError, HealthSource } from './types'

/** Sync on resume at most this often (a manual "Sync now" always runs). */
export const SYNC_MIN_INTERVAL_MIN = 15
/** How many days back steps and sleep are read. */
export const SYNC_DAYS = 7

export function syncDue(lastSync: string, now: Date, force = false): boolean {
  if (force || !lastSync) return true
  const last = new Date(lastSync).getTime()
  return !Number.isFinite(last) || now.getTime() - last >= SYNC_MIN_INTERVAL_MIN * 60000
}

export interface SyncOutcome {
  ok: boolean
  error?: HealthError
  addedNights: number
  /** Steps of today after the sync (null when it could not be read) */
  stepsToday: number | null
  /** The sync did not run (too soon / not connected) */
  skipped?: boolean
}

const localIso = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export async function syncHealth(
  source: HealthSource,
  opts: { force?: boolean; now?: Date } = {},
): Promise<SyncOutcome> {
  const now = opts.now ?? new Date()
  const st = useStore.getState()
  const { watchConnected, watchSource, watchLastSync } = st.settings
  const none: SyncOutcome = { ok: true, addedNights: 0, stepsToday: null }
  if (!watchConnected) return { ...none, skipped: true }
  if (!syncDue(watchLastSync, now, opts.force)) return { ...none, skipped: true }
  const origin = watchSource || undefined
  const today = todayStr(now)

  // 1. read everything first; nothing is written if any read fails
  const days = Array.from({ length: SYNC_DAYS }, (_, i) => addDaysStr(today, i - (SYNC_DAYS - 1)))
  const steps: Record<string, number> = {}
  for (const d of days) {
    const r = await source.getDailySteps(d, origin)
    if (!r.ok) return { ...none, ok: false, error: r.error }
    steps[d] = Math.max(0, Math.round(r.value))
  }
  const from = localIso(new Date(`${days[0]}T00:00:00`))
  const sleep = await source.getSleepSessions(from, localIso(now), origin)
  if (!sleep.ok) return { ...none, ok: false, error: sleep.error }

  // 2. write
  for (const d of days) {
    const old = useStore.getState().days[d]?.steps
    if (old !== steps[d]) useStore.getState().setDay(d, { steps: steps[d] })
  }
  const goal = useStore.getState().settings.stepGoal
  for (const d of [addDaysStr(today, -1), today]) {
    if (goalReached(steps[d] ?? 0, goal))
      useStore.getState().award({
        id: stepsAwardId(d),
        date: d,
        reason: t('steps.xp', { goal: String(goal) }),
        xp: XP.stepsGoal,
        category: 'workout',
      })
  }
  const s = useStore.getState()
  const plan = planSleepImport(
    s.sleep,
    nightsFromSessions(sleep.value),
    s.settings.dismissedSleepIds,
  )
  for (const l of plan.add) s.add('sleep', l)
  for (const u of plan.update) s.update('sleep', u.id, u.patch)
  s.setSettings({ watchLastSync: now.toISOString() })
  return { ok: true, addedNights: plan.add.length, stepsToday: steps[today] ?? 0 }
}

/**
 * Deletes a sleep entry. A night that came from the watch is remembered as dismissed, so the next
 * sync does not bring it back. (After an "Undo" the log exists again; the sync only updates it.)
 */
export function removeSleepLog(id: string): void {
  const st = useStore.getState()
  const log = st.sleep.find((l) => l.id === id)
  st.remove('sleep', id)
  if (log?.source !== 'watch') return
  const ids = st.settings.dismissedSleepIds
  if (!ids.includes(id)) st.setSettings({ dismissedSleepIds: [...ids, id] })
}
