import { useState } from 'react'
import { Button } from './ui'
import { selectData, useStore } from '../store'
import { buildIcsWithProgress, openCalendarFile, shareCalendar } from '../lib/ics'
import { currentEnv, isIos } from '../lib/ios'
import { useT } from '../i18n'

/**
 * "Add to calendar": hands the obligations to the phone's calendar. It is a one-time copy, so the
 * text under the button says that new obligations need another tap.
 * iPhone: the file is opened directly, so Safari offers "Add All"; sharing stays as the second way.
 */
export default function CalendarButton({ compact = false }: { compact?: boolean }) {
  const { t } = useT()
  const [progress, setProgress] = useState<number | null>(null)
  const [msg, setMsg] = useState('')
  const ios = isIos(currentEnv())

  async function run(how: 'open' | 'share') {
    setMsg('')
    setProgress(0)
    const text = await buildIcsWithProgress(selectData(useStore.getState()), (f) =>
      setProgress(f * 0.9),
    )
    const result = how === 'open' ? openCalendarFile(text) : await shareCalendar(text)
    setProgress(1)
    setMsg(result === 'cancelled' ? '' : t('set.calDone'))
    setTimeout(() => setProgress(null), 600)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="soft"
          disabled={progress !== null}
          onClick={() => void run(ios ? 'open' : 'share')}
        >
          {t('set.ics')}
        </Button>
        {ios && (
          <Button variant="ghost" disabled={progress !== null} onClick={() => void run('share')}>
            {t('cal.shareInstead')}
          </Button>
        )}
      </div>
      {progress !== null && (
        <div
          role="progressbar"
          aria-label={t('set.ics')}
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        >
          <div
            className="h-full bg-blue-600 transition-[width] duration-200"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}
      {msg && (
        <p role="status" className="text-sm">
          {msg}
        </p>
      )}
      <p className="text-xs text-slate-600 dark:text-slate-400">
        {t(compact ? 'cal.onceShort' : 'cal.once')}
      </p>
    </div>
  )
}
