import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { selectData, useStore } from '../store'
import { Card } from './ui'
import { activeDays, activeInWeek, mainStreak } from '../lib/streak'
import { useT } from '../i18n'

/** The ring of the week (active days 0-7) with the main streak, its saves and the best streak. */
export default function WeekRing({ today }: { today: string }) {
  const { t } = useT()
  const data = useStore(useShallow(selectData))
  const days = useMemo(() => activeDays(data), [data])
  const streak = mainStreak(days, today)
  const n = activeInWeek(days, today)
  const R = 26
  const C = 2 * Math.PI * R
  return (
    <Card className="mb-4 flex items-center gap-4">
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        role="img"
        aria-label={t('ring.aria', { n })}
        className="shrink-0"
      >
        <circle
          cx="32"
          cy="32"
          r={R}
          fill="none"
          strokeWidth="7"
          className="stroke-slate-200 dark:stroke-slate-800"
        />
        <circle
          cx="32"
          cy="32"
          r={R}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          className="stroke-blue-600 transition-[stroke-dashoffset] duration-500"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - n / 7)}
          transform="rotate(-90 32 32)"
        />
        <text x="32" y="37" textAnchor="middle" className="fill-current text-sm font-bold">
          {n}/7
        </text>
      </svg>
      <div className="text-sm">
        <p className="font-semibold">🔥 {t('streak.days', { n: streak.current })}</p>
        <p className="text-slate-600 dark:text-slate-400">
          {t('ring.week', { n })}
          {streak.savers > 0 ? ` · ❄️ ${t('streak.saves', { n: streak.savers })}` : ''}
          {streak.best > streak.current ? ` · ${t('streak.best', { n: streak.best })}` : ''}
        </p>
      </div>
    </Card>
  )
}
