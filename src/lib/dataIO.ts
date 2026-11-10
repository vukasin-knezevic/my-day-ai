import { z } from 'zod'
import type { AppData } from '../types'
import { normalizeData } from './defaults'
import { t } from '../i18n'

const id = z.string().min(1)
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}/)
const time = z.string().regex(/^\d{2}:\d{2}$/)

/**
 * What the screens rely on in every saved item. Unknown fields stay, and a backup that passes
 * cannot crash the app later, because a missing `start` would only show up while rendering.
 */
const ITEM_SCHEMAS = {
  subjects: z.looseObject({
    id,
    name: z.string(),
    slots: z.array(z.looseObject({ id, day: z.number(), start: time, end: time })),
  }),
  assessments: z.looseObject({ id, subjectId: z.string(), title: z.string(), date: day }),
  activities: z.looseObject({ id, title: z.string(), date: day, start: time, end: time }),
  workouts: z.looseObject({ id, date: day, exercises: z.array(z.looseObject({})) }),
  sleep: z.looseObject({ id, date: day, bedtime: z.string() }),
  meals: z.looseObject({ id, date: day, protein: z.number() }),
  expenses: z.looseObject({ id, date: day, amount: z.number() }),
  habits: z.looseObject({ id, name: z.string(), goal: z.number(), entries: z.looseObject({}) }),
  games: z.looseObject({ id, date: day }),
  workoutTemplates: z.looseObject({ id, name: z.string(), exercises: z.array(z.looseObject({})) }),
}
const ARRAY_KEYS = Object.keys(ITEM_SCHEMAS) as (keyof typeof ITEM_SCHEMAS)[]

/**
 * `progress` and `settings` are read by every screen. Every field may be missing (older backups;
 * defaults fill it in), but a field that is there must have the right type.
 */
const num = z.number().finite()
const OBJECT_SCHEMAS = {
  progress: z.looseObject({
    xp: num.optional(),
    events: z
      .array(z.looseObject({ id, date: day, reason: z.string(), xp: num, category: z.string() }))
      .optional(),
    rewardEarnedMin: num.optional(),
    rewardSpentMin: num.optional(),
    awarded: z.array(z.string()).optional(),
  }),
  settings: z.looseObject({
    name: z.string().optional(),
    addressName: z.string().optional(),
    gender: z.enum(['m', 'f']).optional(),
    wakeTime: time.optional(),
    bedTime: time.optional(),
    sleepGoalHours: num.optional(),
    workoutsPerWeek: num.optional(),
    studyHoursPerDay: num.optional(),
    proteinGoal: num.optional(),
    theme: z.enum(['system', 'light', 'dark']).optional(),
    timeFormat: z.enum(['24h', '12h']).optional(),
    autoUpdate: z.boolean().optional(),
    iosHintDismissed: z.boolean().optional(),
    customAssessmentKinds: z.array(z.string()).optional(),
    customSlotKinds: z.array(z.string()).optional(),
    language: z.string().optional(),
    currency: z.string().optional(),
    aiMode: z.enum(['api', 'manual']).optional(),
    apiKey: z.string().optional(),
    modelFast: z.string().optional(),
    modelStrong: z.string().optional(),
    reminders: z.boolean().optional(),
    rewardMinPerStudyHour: num.optional(),
    rewardName: z.string().optional(),
    rewardEmoji: z.string().optional(),
    onboarded: z.boolean().optional(),
    lastBackupAt: z.string().optional(),
    backupReminder: z.boolean().optional(),
    backupNudgeAt: z.string().optional(),
  }),
}

export { exportJson } from './exportJson'

export type ImportResult = { ok: true; data: AppData } | { ok: false; message: string }

/** Accepts a backup made by exportJson (or just the raw data object). */
export function importJson(text: string): ImportResult {
  if (!text.trim()) return { ok: false, message: t('dataio.empty') }
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (e) {
    return { ok: false, message: t('dataio.badJson', { detail: (e as Error).message }) }
  }
  const obj = (
    raw && typeof raw === 'object' && 'data' in raw ? (raw as { data: unknown }).data : raw
  ) as Record<string, unknown> | null
  if (!obj || typeof obj !== 'object' || Array.isArray(obj))
    return { ok: false, message: t('dataio.structure') }
  const known = [...ARRAY_KEYS, 'settings', 'progress', 'budget', 'workoutPlan']
  if (!known.some((k) => k in obj)) return { ok: false, message: t('dataio.unknown') }
  for (const k of ARRAY_KEYS) {
    if (!(k in obj)) continue
    const list = obj[k]
    if (!Array.isArray(list)) return { ok: false, message: t('dataio.notList', { key: k }) }
    const bad = list.findIndex((item) => !ITEM_SCHEMAS[k].safeParse(item).success)
    if (bad !== -1) return { ok: false, message: t('dataio.badItem', { key: k, n: bad + 1 }) }
  }
  if ('settings' in obj && (typeof obj.settings !== 'object' || obj.settings === null))
    return { ok: false, message: t('dataio.badSettings') }
  for (const k of ['progress', 'settings'] as const) {
    if (!(k in obj)) continue
    const r = OBJECT_SCHEMAS[k].safeParse(obj[k])
    if (!r.success) {
      const path = [k, ...r.error.issues[0].path.map(String)].join('.')
      return { ok: false, message: t('dataio.badField', { key: path }) }
    }
  }
  return { ok: true, data: normalizeData(obj as Partial<AppData>) }
}
