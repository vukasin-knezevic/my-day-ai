import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AppData, Settings } from './types'
import { emptyData, normalizeData, uid, DEFAULT_SETTINGS } from './lib/defaults'
import { idbStorage } from './lib/storage'
import { makeDemoData } from './lib/demo'
import { monthOf, setTimeFormat, todayStr } from './lib/dates'
import {
  award as awardXp,
  revokeWhere,
  rewardBalance,
  spendReward as spendTime,
  type AwardEvent,
} from './lib/xp'
import { useToast } from './lib/toast'
import { rewardNameOf } from './lib/labels'
import { addUsage } from './lib/ai/usage'
import { resolveLanguage, setGender, setLanguage } from './i18n'

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

/** Which award ids belong to an item of a collection (so deleting the item takes the XP back). */
const REWARD_IDS: Partial<Record<CollectionKey, (id: string) => (awardId: string) => boolean>> = {
  workouts: (id) => (a) => a === `workout-${id}` || a.startsWith(`pr-${id}-`),
  habits: (id) => (a) => a.startsWith(`habit-${id}-`),
  activities: (id) => (a) => a.startsWith(`act-${id}-`),
  assessments: (id) => (a) => a === `reg-${id}`,
}

type Item<K extends CollectionKey> = AppData[K][number]

interface Actions {
  hydrated: boolean
  setSettings: (patch: Partial<Settings>) => void
  add: <K extends CollectionKey>(key: K, item: Omit<Item<K>, 'id'> & { id?: string }) => string
  update: <K extends CollectionKey>(key: K, id: string, patch: Partial<Item<K>>) => void
  remove: (key: CollectionKey, id: string) => void
  /** Deletes a subject together with its exams, so the planner does not keep counting them. */
  removeSubject: (id: string) => void
  patch: (patch: Partial<AppData>) => void
  loadDemo: () => void
  clearDemo: () => void
  hasDemo: () => boolean
  importAll: (data: Partial<AppData>) => void
  resetAll: () => void
  /** Gives XP (once per event id) and shows a toast with the result. */
  award: (e: AwardEvent) => void
  /** Takes back XP and reward minutes of one award id (exact) or of every id with the given prefix. */
  revoke: (id: string, opts?: { prefix?: boolean }) => void
  /** Records reward time I used (no judging). */
  spendReward: (min: number, game?: string) => string | null
  /** Takes back a recorded use of reward time (the "Undo" after a click). */
  unspendReward: (gameId: string) => void
  /** Adds one API call to this month's usage. */
  trackAiUsage: (inputTokens: number, outputTokens: number) => void
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
      remove: (key, id) => {
        set(
          (s) =>
            ({ [key]: (s[key] as { id: string }[]).filter((x) => x.id !== id) }) as Partial<Store>,
        )
        // deleting something takes back what it paid out
        const p = get().progress
        const next = revokeWhere(p, (x) => (REWARD_IDS[key]?.(id) ?? (() => false))(x))
        if (next !== p) set({ progress: next })
      },
      removeSubject: (id) => {
        const gone = get()
          .assessments.filter((a) => a.subjectId === id)
          .map((a) => a.id)
        set((s) => ({
          subjects: s.subjects.filter((x) => x.id !== id),
          assessments: s.assessments.filter((a) => a.subjectId !== id),
        }))
        // the registrations of the removed assessments paid XP: take it back too
        const p = get().progress
        const next = revokeWhere(p, (x) => gone.some((a) => x === `reg-${a}`))
        if (next !== p) set({ progress: next })
      },
      patch: (p) => set(p as Partial<Store>),
      loadDemo: () => {
        if (get().hasDemo()) return
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
          // what the user added to a demo subject goes with it, so nothing is left dangling
          const goneSubjects = new Set(s.subjects.filter((x) => x.demo).map((x) => x.id))
          next.assessments = next.assessments?.filter((a) => !goneSubjects.has(a.subjectId))
          // the XP / reward minutes the demo items paid out go with them
          const gone = COLLECTIONS.flatMap((k) =>
            (s[k] as { id: string; demo?: boolean }[])
              .filter((x) => x.demo)
              .map((x) => REWARD_IDS[k]?.(x.id))
              .filter((m) => m !== undefined),
          )
          // assessments removed together with their demo subject
          const goneAssessments = s.assessments.filter((a) => goneSubjects.has(a.subjectId))
          const progress = revokeWhere(
            s.progress,
            (id) => gone.some((m) => m(id)) || goneAssessments.some((a) => id === `reg-${a.id}`),
          )
          if (progress !== s.progress) next.progress = progress
          return next
        }),
      hasDemo: () =>
        COLLECTIONS.some((k) => (get()[k] as { demo?: boolean }[]).some((x) => x.demo)),
      importAll: (data) => set({ ...normalizeData(data) }),
      resetAll: () => set({ ...emptyData(), settings: { ...DEFAULT_SETTINGS } }),
      award: (e) => {
        const settings = get().settings
        const r = awardXp(
          get().progress,
          { at: new Date().toISOString(), ...e },
          {
            name: rewardNameOf(settings),
            emoji: settings.rewardEmoji,
          },
        )
        if (r.progress !== get().progress) set({ progress: r.progress })
        useToast.getState().push(r.messages)
      },
      revoke: (id, opts) => {
        const p = get().progress
        const next = revokeWhere(p, (x) => (opts?.prefix ? x.startsWith(id) : x === id))
        if (next !== p) set({ progress: next })
      },
      spendReward: (min, game = rewardNameOf(get().settings)) => {
        if (min <= 0 || min > rewardBalance(get().progress)) return null
        const id = uid()
        set((s) => ({
          progress: spendTime(s.progress, min),
          games: [...s.games, { id, date: todayStr(), game, durationMin: min }],
        }))
        return id
      },
      unspendReward: (gameId) => {
        const g = get().games.find((x) => x.id === gameId)
        if (!g) return
        set((s) => ({
          games: s.games.filter((x) => x.id !== gameId),
          progress: {
            ...s.progress,
            rewardSpentMin: Math.max(0, s.progress.rewardSpentMin - g.durationMin),
          },
        }))
      },
      trackAiUsage: (input, output) =>
        set((s) => ({ aiUsage: addUsage(s.aiUsage, monthOf(todayStr()), input, output) })),
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

// Keep the UI language in sync with the saved setting ('' = automatic, from the browser).
const syncLanguage = (s: Pick<AppData, 'settings'>) => {
  setLanguage(resolveLanguage(s.settings.language))
  setGender(s.settings.gender === 'f' ? 'f' : 'm')
}
syncLanguage(useStore.getState())
useStore.subscribe(syncLanguage)

// Times are shown as 24h or 12h, as set in the settings.
const syncTimeFormat = (s: Pick<AppData, 'settings'>) => setTimeFormat(s.settings.timeFormat)
syncTimeFormat(useStore.getState())
useStore.subscribe(syncTimeFormat)
