// One shared "Deleted · Undo" for every delete in the app. A delete runs at once; for a few seconds
// the bar at the bottom can bring back exactly what went away: the items and the XP they had paid.
import { create } from 'zustand'
import type { AppData } from '../types'
import { selectData, useStore, type CollectionKey } from '../store'

export const UNDO_MS = 6000

const LISTS: CollectionKey[] = [
  'subjects',
  'assessments',
  'activities',
  'workouts',
  'sleep',
  'meals',
  'expenses',
  'habits',
  'games',
  'workoutTemplates',
]

type AnyItem = { id: string }
type XpEvent = AppData['progress']['events'][number]

/** What one delete took away. */
export interface Removal {
  /** Removed items per list, each with the place it had. */
  items: Partial<Record<CollectionKey, { index: number; item: AnyItem }[]>>
  /** XP events that were taken back with them. */
  events: XpEvent[]
  /** Award ids that were freed (so the same thing could pay again). */
  awarded: string[]
}

export function removedBetween(before: AppData, after: AppData): Removal {
  const items: Removal['items'] = {}
  for (const k of LISTS) {
    const left = new Set((after[k] as AnyItem[]).map((x) => x.id))
    const gone = (before[k] as AnyItem[])
      .map((item, index) => ({ index, item }))
      .filter((x) => !left.has(x.item.id))
    if (gone.length) items[k] = gone
  }
  const eventsLeft = new Set(after.progress.events.map((e) => e.id))
  const awardedLeft = new Set(after.progress.awarded)
  return {
    items,
    events: before.progress.events.filter((e) => !eventsLeft.has(e.id)),
    awarded: before.progress.awarded.filter((id) => !awardedLeft.has(id)),
  }
}

export const isEmptyRemoval = (r: Removal) =>
  Object.keys(r.items).length === 0 && r.events.length === 0 && r.awarded.length === 0

/** Puts back what `removal` took, on top of the data as it is now (later changes are kept). */
export function restoreRemoval(now: AppData, removal: Removal): Partial<AppData> {
  const patch: Partial<AppData> = {}
  for (const [k, gone] of Object.entries(removal.items) as [
    CollectionKey,
    Removal['items'][CollectionKey],
  ][]) {
    const list = [...(now[k] as AnyItem[])]
    const present = new Set(list.map((x) => x.id))
    for (const { index, item } of gone ?? []) {
      if (present.has(item.id)) continue
      list.splice(Math.min(index, list.length), 0, item)
    }
    ;(patch as Record<string, unknown>)[k] = list
  }
  const p = now.progress
  const have = new Set(p.events.map((e) => e.id))
  const events = removal.events.filter((e) => !have.has(e.id))
  const awarded = removal.awarded.filter((id) => !p.awarded.includes(id))
  if (events.length || awarded.length) {
    patch.progress = {
      ...p,
      xp: p.xp + events.reduce((n, e) => n + e.xp, 0),
      rewardEarnedMin: p.rewardEarnedMin + events.reduce((n, e) => n + (e.rewardMin ?? 0), 0),
      events: [...p.events, ...events],
      awarded: [...p.awarded, ...awarded],
    }
  }
  return patch
}

interface UndoState {
  /** The last delete that can still be undone. */
  pending: { id: number; removal: Removal } | null
  offer: (removal: Removal) => void
  undo: () => void
  dismiss: () => void
}

let timer: ReturnType<typeof setTimeout> | undefined
let seq = 0

export const useUndo = create<UndoState>()((set, get) => ({
  pending: null,
  offer: (removal) => {
    if (isEmptyRemoval(removal)) return
    clearTimeout(timer)
    set({ pending: { id: ++seq, removal } })
    timer = setTimeout(() => set({ pending: null }), UNDO_MS)
  },
  undo: () => {
    const p = get().pending
    if (!p) return
    clearTimeout(timer)
    useStore.getState().patch(restoreRemoval(selectData(useStore.getState()), p.removal))
    set({ pending: null })
  },
  dismiss: () => {
    clearTimeout(timer)
    set({ pending: null })
  },
}))

/** Runs a delete and offers "Undo" for whatever it removed. */
export function deleteWithUndo(run: () => void) {
  const before = selectData(useStore.getState())
  run()
  useUndo.getState().offer(removedBetween(before, selectData(useStore.getState())))
}
