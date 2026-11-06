import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AppData, Settings } from './types'
import { emptyData, normalizeData, uid, DEFAULT_SETTINGS } from './lib/defaults'
import { idbStorage } from './lib/storage'
import { makeDemoData } from './lib/demo'
import { todayStr } from './lib/dates'
import { award as awardXp, spendReward as spendTime, type AwardEvent } from './lib/xp'
import { useToast } from './lib/toast'

/** Collections where every item has an `id`. */
export type CollectionKey =
  | 'subjects'
  | 'assessments'
  | 'activities'
  | 'workouts'
  | 'sleep'
  | 'meals'
  | 'expenses'
  | 'habits'
  | 'games'
  | 'workoutTemplates'

const COLLECTIONS: CollectionKey[] = [
  'subjects',
  'assessments',
  'activities',
  'workouts',
  'sleep',
  'meals',
  'expenses',
  'habits',
  'games',
]

type Item<K extends CollectionKey> = AppData[K][number]

interface Actions {
  hydrated: boolean
  setSettings: (patch: Partial<Settings>) => void
  add: <K extends CollectionKey>(key: K, item: Omit<Item<K>, 'id'> & { id?: string }) => string
  update: <K extends CollectionKey>(key: K, id: string, patch: Partial<Item<K>>) => void
  remove: (key: CollectionKey, id: string) => void
  patch: (patch: Partial<AppData>) => void
  loadDemo: () => void
  clearDemo: () => void
  hasDemo: () => boolean
  importAll: (data: Partial<AppData>) => void
  resetAll: () => void
  /** Gives XP (once per event id) and shows a toast with the result. */
  award: (e: AwardEvent) => void
  /** Records reward time I used (no judging). */
  spendReward: (min: number, game?: string) => void
}

export type Store = AppData & Actions

/** Only the data part (without functions) — used for export and persistence. */
export function selectData(s: Store): AppData {
  const data = { ...emptyData() }
  for (const k of Object.keys(data) as (keyof AppData)[]) {
    ;(data as Record<string, unknown>)[k] = s[k]
  }
  return data
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...emptyData(),
      hydrated: false,
      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      add: (key, item) => {
        const id = item.id ?? uid()
        set((s) => ({ [key]: [...(s[key] as unknown[]), { ...item, id }] }) as Partial<Store>)
        return id
      },
      update: (key, id, p) =>
        set(
          (s) =>
            ({
              [key]: (s[key] as { id: string }[]).map((x) => (x.id === id ? { ...x, ...p } : x)),
            }) as Partial<Store>,
        ),
      remove: (key, id) =>
        set(
          (s) =>
            ({ [key]: (s[key] as { id: string }[]).filter((x) => x.id !== id) }) as Partial<Store>,
        ),
      patch: (p) => set(p as Partial<Store>),
      loadDemo: () => {
        const demo = makeDemoData(todayStr())
        set((s) => {
          const next: Partial<Store> = {}
          for (const k of COLLECTIONS) {
            const add = (demo[k] ?? []) as unknown[]
            ;(next as Record<string, unknown>)[k] = [...(s[k] as unknown[]), ...add]
          }
          return next
        })
      },
      clearDemo: () =>
        set((s) => {
          const next: Partial<Store> = {}
          for (const k of COLLECTIONS) {
            ;(next as Record<string, unknown>)[k] = (s[k] as { demo?: boolean }[]).filter(
              (x) => !x.demo,
            )
          }
          // assessments of removed demo subjects are demo too, so nothing is left dangling
          return next
        }),
      hasDemo: () =>
        COLLECTIONS.some((k) => (get()[k] as { demo?: boolean }[]).some((x) => x.demo)),
      importAll: (data) => set({ ...normalizeData(data) }),
      resetAll: () => set({ ...emptyData(), settings: { ...DEFAULT_SETTINGS } }),
      award: (e) => {
        const { rewardName: name, rewardEmoji: emoji } = get().settings
        const r = awardXp(get().progress, e, { name, emoji })
        if (r.progress !== get().progress) set({ progress: r.progress })
        useToast.getState().push(r.messages)
      },
      spendReward: (min, game = get().settings.rewardName) => {
        set((s) => ({
          progress: spendTime(s.progress, min),
          games: [...s.games, { id: uid(), date: todayStr(), game, durationMin: min }],
        }))
      },
    }),
    {
      name: 'my-day-ai',
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => selectData(s as Store) as unknown as Store,
      merge: (persisted, current) => ({
        ...current,
        ...normalizeData(persisted as Partial<AppData>),
      }),
      onRehydrateStorage: () => () => {
        useStore.setState({ hydrated: true })
      },
    },
  ),
)
