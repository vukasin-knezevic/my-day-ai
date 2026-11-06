import type { AppData } from '../types'
import { DATA_VERSION, normalizeData } from './defaults'
import { t } from '../i18n'

const ARRAY_KEYS = [
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
] as const

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
  for (const k of ARRAY_KEYS)
    if (k in obj && !Array.isArray(obj[k]))
      return { ok: false, message: t('dataio.notList', { key: k }) }
  if ('settings' in obj && (typeof obj.settings !== 'object' || obj.settings === null))
    return { ok: false, message: t('dataio.badSettings') }
  return { ok: true, data: normalizeData(obj as Partial<AppData>) }
}
