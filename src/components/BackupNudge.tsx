import { useEffect } from 'react'
import { selectData, useStore } from '../store'
import {
  backupDue,
  backupStamp,
  hasUserData,
  lastBackupLabel,
  laterStamp,
  shareBackup,
} from '../lib/backup'
import { todayStr } from '../lib/dates'
import { useToast } from '../lib/toast'
import { useT } from '../i18n'
import { Button } from './ui'

/** Once a week: "time for a backup". One tap saves it; "Later" asks again in a week. Can be turned off in settings. */
export default function BackupNudge({ today = todayStr() }: { today?: string }) {
  const { t } = useT()
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const hasData = useStore((s) => hasUserData(selectData(s)))
  const started = Boolean(settings.lastBackupAt || settings.backupNudgeAt)

  // the week is counted from the first day there is something to lose
  useEffect(() => {
    if (hasData && !started) setSettings({ backupNudgeAt: today })
  }, [hasData, started, today, setSettings])

  if (!backupDue(settings, hasData, today)) return null

  async function save() {
    const result = await shareBackup(selectData(useStore.getState()))
    if (result === 'cancelled') return
    setSettings(backupStamp())
    useToast.getState().push([t('backup.saved')])
  }

  return (
    <section
      aria-label={t('backup.save')}
      className="anim-pop mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950"
    >
      <p>{t('backup.nudge', { when: lastBackupLabel(settings.lastBackupAt) })}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button onClick={() => void save()}>{t('backup.save')}</Button>
        <Button variant="soft" onClick={() => setSettings(laterStamp())}>
          {t('backup.later')}
        </Button>
      </div>
    </section>
  )
}
