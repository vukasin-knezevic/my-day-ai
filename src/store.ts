import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AppData, DayRecord, Settings } from './types'
import { emptyData, normalizeData, uid, DEFAULT_SETTINGS } from './lib/defaults'
import { allowWrites, idbStorage } from './lib/storage'
import { makeDemoData } from './lib/demo'
import { monthOf, setTimeFormat, todayStr } from './lib/dates'
import {
  award as awardXp,
  revokeWhere,
  levelFor,
  rewardBalance,
  spendReward as spendTime,
  type AwardEvent,
} from './lib/xp'
import { useToast } from './lib/toast'
import { SURPRISE_PER_DAY, SURPRISE_PREFIX, surpriseFor, surpriseId } from './lib/surprise'
import { celebrate, cue, setEffectPrefs } from './lib/effects'
import { rewardNameOf } from './lib/labels'
import { addUsage } from './lib/ai/usage'
import { resolveLanguage, setGender, setLanguage, t } from './i18n'

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

/** A surprise belongs to the award that started it: taking that award back takes the surprise back too. */
const withSurprise =
  (match: (awardId: string) => boolean) =>
  (x: string): boolean =>
    match(x) || (x.startsWith(SURPRISE_PREFIX) && match(x.slice(SURPRISE_PREFIX.length)))

type Item<K extends CollectionKey> = AppData[K][number]

interface Actions {
  hydrated: boolean
  /** The saved data could not be read: the app shows "try again" and writes nothing (see lib/storage.ts). */
  hydrationError: boolean
  setSettings: (patch: Partial<Settings>) => void
  add: <K extends CollectionKey>(key: K, item: Omit<Item<K>, 'id'> & { id?: string }) => string
  update: <K extends CollectionKey>(key: K, id: string, patch: Partial<Item<K>>) => void
  remove: (key: CollectionKey, id: string) => void
  /** Deletes a subject together with its exams, so the planner does not keep counting them. */
  removeSubject: (id: string) => void
  patch: (patch: Partial<AppData>) => void
  /** Changes what is remembered about one day (the morning routine, the challenge, the evening...). */
  setDay: (date: string, patch: Partial<DayRecord>) => void
  loadDemo: () => void
  clearDemo: () => void
  hasDemo: () => boolean
  importAll: (data: Partial<AppData>) => void
  resetAll: () => void
  /** Gives XP (once per event id) and shows a toast with the result. */
  award: (e: AwardEvent) => void
  /** Rolls the surprise of an award (see lib/surprise.ts); returns the message to show, if any. */
  rollSurprise: (awardId: string, date: string) => string[]
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
      hydrationError: false,
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
        const next = revokeWhere(
          p,
          withSurprise((x) => (REWARD_IDS[key]?.(id) ?? (() => false))(x)),
        )
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
        const next = revokeWhere(
          p,
          withSurprise((x) => gone.some((a) => x === `reg-${a}`)),
        )
        if (next !== p) set({ progress: next })
      },
      patch: (p) => set(p as Partial<Store>),
      setDay: (date, p) => set((s) => ({ days: { ...s.days, [date]: { ...s.days[date], ...p } } })),
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
            withSurprise(
              (id) => gone.some((m) => m(id)) || goneAssessments.some((a) => id === `reg-${a.id}`),
            ),
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
        const changed = r.progress !== get().progress
        const levelUp = changed && levelFor(r.progress.xp).index > levelFor(get().progress.xp).index
        if (changed) set({ progress: r.progress })
        const messages = changed ? [...r.messages, ...get().rollSurprise(e.id, e.date)] : r.messages
        useToast.getState().push(messages)
        if (changed) {
          if (levelUp) celebrate('level')
          else cue('tick')
        }
      },
      rollSurprise: (awardId, date) => {
        const sur = surpriseFor(awardId)
        const seen = get().days[date]?.surprised ?? []
        if (!sur) return []
        // At most two a day. A thing that already had its roll (done, undone, done again) gets the
        // same surprise back, never a new try.
        const again = seen.includes(awardId)
        if (!again && seen.length >= SURPRISE_PER_DAY) return []
        if (!again) get().setDay(date, { surprised: [...seen, awardId] })
        const at = new Date().toISOString()
        const base = { id: surpriseId(awardId), date, category: 'habits' as const, at }
        const badge = sur.kind === 'badge' ? t(`badge.s${sur.amount}` as 'badge.s0') : ''
        const ev =
          sur.kind === 'xp'
            ? { ...base, reason: t('surprise.label'), xp: sur.amount }
            : sur.kind === 'reward'
              ? { ...base, reason: t('surprise.label'), xp: 0, rewardMin: sur.amount }
              : { ...base, reason: badge, xp: 1 }
        const r = awardXp(get().progress, ev)
        if (r.progress === get().progress) return []
        set({ progress: r.progress })
        cue('surprise')
        if (sur.kind === 'xp') return [t('surprise.xp', { n: sur.amount })]
        if (sur.kind === 'reward')
          return [t('surprise.reward', { n: sur.amount, name: rewardNameOf(get().settings) })]
        return [t('surprise.badge', { name: badge })]
      },
      revoke: (id, opts) => {
        const p = get().progress
        const next = revokeWhere(
          p,
          withSurprise((x) => (opts?.prefix ? x.startsWith(id) : x === id)),
        )
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
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.error('Saved data could not be read', error)
          useStore.setState({ hydrationError: true })
          return
        }
        allowWrites()
        useStore.setState({ hydrated: true, hydrationError: false })
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
const syncEffects = (s: Pick<AppData, 'settings'>) =>
  setEffectPrefs({
    sound: s.settings.sound,
    vibration: s.settings.vibration,
    animations: s.settings.animations,
  })
syncEffects(useStore.getState())
useStore.subscribe(syncEffects)

const syncTimeFormat = (s: Pick<AppData, 'settings'>) => setTimeFormat(s.settings.timeFormat)
syncTimeFormat(useStore.getState())
useStore.subscribe(syncTimeFormat)
