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
  aiMode: 'manual',
  apiKey: '',
  modelFast: 'claude-haiku-5-5',
  modelStrong: 'claude-sonnet-5-5',
  reminders: false,
  ps5MinPerStudyHour: 30,
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
    progress: { xp: 0, events: [], ps5EarnedMin: 0, ps5SpentMin: 0, awarded: [] },
    settings: { ...DEFAULT_SETTINGS },
    aiUsage: { month: '', inputTokens: 0, outputTokens: 0, calls: 0 },
  }
}

/** Fills in missing fields of (older / imported) data with defaults. */
export function normalizeData(raw: Partial<AppData> | null | undefined): AppData {
  const base = emptyData()
  const r = raw ?? {}
  return {
    ...base,
    ...r,
    progress: { ...base.progress, ...(r.progress ?? {}) },
    settings: { ...base.settings, ...(r.settings ?? {}) },
    aiUsage: { ...base.aiUsage, ...(r.aiUsage ?? {}) },
    budget: r.budget ?? {},
  }
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}
