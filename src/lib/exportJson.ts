// Kept apart from dataIO.ts (which brings in the validation library) so the first download stays small.
import type { AppData } from '../types'
import { DATA_VERSION } from './defaults'

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
