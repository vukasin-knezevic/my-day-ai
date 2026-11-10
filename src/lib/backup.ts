// Backups: the data lives only on this device, so the app remembers when a copy was last taken
// and gently reminds once a week.
import type { AppData, Settings } from '../types'
import { daysUntil, formatLong, todayStr } from './dates'
import { exportJson } from './dataIO'
import { downloadText, shareOrDownload, type ShareResult } from './files'
import { t } from '../i18n'

export const BACKUP_FILE = 'my-day-ai-backup.json'
export const BACKUP_EVERY_DAYS = 7

type BackupSettings = Pick<Settings, 'lastBackupAt' | 'backupReminder' | 'backupNudgeAt'>

/** Is there anything worth backing up? (An empty app does not nag.) */
export function hasUserData(d: AppData): boolean {
  const lists: { demo?: boolean }[][] = [
    d.subjects,
    d.assessments,
    d.activities,
    d.workouts,
    d.sleep,
    d.meals,
    d.expenses,
    d.habits,
  ]
  // the demo examples are not the user's data
  return lists.some((list) => list.some((x) => !x.demo))
}

/** Show the weekly reminder: it is on, there is data, and a week passed since the last backup or "Later". */
export function backupDue(s: BackupSettings, hasData: boolean, today: string): boolean {
  if (!s.backupReminder || !hasData) return false
  const since = [dayOf(s.lastBackupAt), s.backupNudgeAt].filter(Boolean).sort().at(-1)
  // nothing to count from yet: the clock starts today (see BackupNudge)
  if (!since) return false
  return daysUntil(today, since) >= BACKUP_EVERY_DAYS
}

/** "5. novembar" or "never". */
export function lastBackupLabel(lastBackupAt: string): string {
  return lastBackupAt ? formatLong(dayOf(lastBackupAt)) : t('data.never')
}

/** The local day of a saved ISO time ('' stays ''). */
function dayOf(iso: string): string {
  return iso ? todayStr(new Date(iso)) : ''
}

export const backupStamp = (now: Date = new Date()): Pick<Settings, 'lastBackupAt'> => ({
  lastBackupAt: now.toISOString(),
})

export const laterStamp = (now: Date = new Date()): Pick<Settings, 'backupNudgeAt'> => ({
  backupNudgeAt: todayStr(now),
})

/** Downloads the backup file. */
export function downloadBackup(data: AppData) {
  downloadText(BACKUP_FILE, exportJson(data), 'application/json')
}

/** Hands the backup to the share sheet (Files, Drive, mail); downloads it where that is not possible. */
export function shareBackup(data: AppData): Promise<ShareResult> {
  return shareOrDownload(BACKUP_FILE, exportJson(data), 'application/json')
}
