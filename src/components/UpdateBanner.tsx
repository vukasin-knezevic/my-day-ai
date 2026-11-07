import { useUpdate } from '../lib/updates'
import { useStore } from '../store'
import { useT } from '../i18n'
import { Button } from './ui'

/** Small message on top: "New update" with a 0-100% bar and, at the end, "Restart the app". */
export default function UpdateBanner() {
  const { t } = useT()
  const { phase, progress, restart } = useUpdate()
  const auto = useStore((s) => s.settings.autoUpdate)
  if (phase === 'idle') return null
  const pct = Math.round(progress)
  return (
    <div
      role="status"
      className="anim-pop mb-4 rounded-2xl border border-blue-300 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-950"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">🔄 {t('update.title')}</p>
        {phase === 'ready' ? (
          <Button onClick={restart}>{t('update.restart')}</Button>
        ) : (
          <span className="tabular-nums">{pct}%</span>
        )}
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-200 dark:bg-blue-900"
        role="progressbar"
        aria-label={t('update.title')}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-blue-600 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
        {phase === 'downloading'
          ? t('update.downloading')
          : auto
            ? t('update.readyAuto')
            : t('update.readyManual')}
      </p>
    </div>
  )
}
