import type { AppData, Settings } from '../types'

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  wakeTime: '09:00',
  bedTime: '01:00',
  sleepGoalHours: 8,
  workoutsPerWeek: 4,
  studyHoursPerDay: 3,
  proteinGoal: 120,
  theme: 'system',
  language: '',
  currency: '',
  aiMode: 'manual',
  apiKey: '',
  modelFast: 'claude-haiku-5-5',
  modelStrong: 'claude-sonnet-5-5',
  reminders: false,
  rewardMinPerStudyHour: 30,
  rewardName: '',
  rewardEmoji: '🎮',
  onboarded: false,
}

export function emptyData(): AppData {
  return {
    subjects: [],
    assessments: [],
    activities: [],
    workouts: [],
    workoutPlan: null,
    workoutTemplates: [],
    sleep: [],
    meals: [],
    expenses: [],
    budget: {},
    habits: [],
    games: [],
    progress: { xp: 0, events: [], rewardEarnedMin: 0, rewardSpentMin: 0, awarded: [] },
    settings: { ...DEFAULT_SETTINGS },
    aiUsage: { month: '', inputTokens: 0, outputTokens: 0, calls: 0 },
  }
}

/** Version of the saved data format. 2 = the reward replaced the fixed "PS5 time". */
export const DATA_VERSION = 2

/**
 * Migration of older saved data / backups to the current format (pure, safe to run twice).
 * v1 -> v2: `ps5EarnedMin`, `ps5SpentMin` (progress) and `ps5MinPerStudyHour` (settings)
 * became `rewardEarnedMin`, `rewardSpentMin` and `rewardMinPerStudyHour`.
 */
export function migrateData(raw: unknown): Partial<AppData> {
  if (!raw || typeof raw !== 'object') return {}
  const r = { ...(raw as Record<string, unknown>) }
  const progress = { ...((r.progress as Record<string, unknown> | undefined) ?? {}) }
  const settings = { ...((r.settings as Record<string, unknown> | undefined) ?? {}) }
  const move = (o: Record<string, unknown>, from: string, to: string) => {
    if (from in o) {
      if (!(to in o)) o[to] = o[from]
      delete o[from]
    }
  }
  move(progress, 'ps5EarnedMin', 'rewardEarnedMin')
  move(progress, 'ps5SpentMin', 'rewardSpentMin')
  move(settings, 'ps5MinPerStudyHour', 'rewardMinPerStudyHour')
  if ('progress' in r || Object.keys(progress).length) r.progress = progress
  if ('settings' in r || Object.keys(settings).length) r.settings = settings
  return r as Partial<AppData>
}

/** Reward time spent can never exceed what was earned (older versions allowed a negative balance). */
function clampReward(p: AppData['progress']): AppData['progress'] {
  return p.rewardSpentMin > p.rewardEarnedMin ? { ...p, rewardSpentMin: p.rewardEarnedMin } : p
}

/** Fills in missing fields of (older / imported) data with defaults. */
export function normalizeData(input: Partial<AppData> | null | undefined): AppData {
  const base = emptyData()
  const r = migrateData(input)
  return {
    ...base,
    ...r,
    progress: clampReward({ ...base.progress, ...(r.progress ?? {}) }),
    settings: { ...base.settings, ...(r.settings ?? {}) },
    aiUsage: { ...base.aiUsage, ...(r.aiUsage ?? {}) },
    budget: r.budget ?? {},
  }
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}
