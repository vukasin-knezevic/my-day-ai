import { z } from 'zod'
import type { AppData } from '../types'
import { DATA_VERSION, normalizeData } from './defaults'
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

/** JSON backup of everything. The API key is NOT included unless asked (so a backup can be shared safely). */
export function exportJson(data: AppData, includeKey = false): string {
  const out = {
    app: 'my-day-ai',
    version: DATA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      ...data,
      settings: { ...data.settings, apiKey: includeKey ? data.settings.apiKey : '' },
    },
  }
  return JSON.stringify(out, null, 2)
}

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
  return { ok: true, data: normalizeData(obj as Partial<AppData>) }
}
