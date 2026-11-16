import { useMemo } from 'react'
import type { AppData } from '../types'
import { Button, Card } from './ui'
import { CATEGORY_META } from '../types'
import { formatDuration, formatTimeOfDay, timeToMin } from '../lib/dates'
import { activeDays, mainStreak } from '../lib/streak'
import type { Occurrence } from '../lib/schedule'
import { useT } from '../i18n'

/**
 * The top of Today: what is going on now (or next) with a calm countdown, the day's progress ring and
 * the streak. Only the Focus card has the frosted-glass look (a solid colour where the browser has no
 * backdrop blur). Nothing here pushes: no red, no "you lost it", no timers beyond the next item.
 */
export default function TodayHero({
  current,
  next,
  minutesToNext,
  nowMin,
  today,
  occ,
  data,
  onAdd,
}: {
  current: Occurrence | null
  next: Occurrence | null
  minutesToNext: number | null
  nowMin: number
  today: string
  occ: Occurrence[]
  data: AppData
  onAdd: () => void
}) {
  const { t } = useT()
  const streak = useMemo(() => mainStreak(activeDays(data), today), [data, today])
  // done / planned: what can be ticked today (activities, not the timetable); skipped and suggested are not "planned"
  const plannable = occ.filter(
    (o) => o.type === 'activity' && !o.suggested && o.status !== 'skipped',
  )
  const done = plannable.filter((o) => o.status === 'done').length
  const total = plannable.length
  const left = current ? (timeToMin(current.end) - nowMin + 1440) % 1440 : null

  return (
    <section aria-label={t('today.nowNext')} className="mb-4 grid grid-cols-2 gap-3">
      <div className="focus-bg col-span-2 rounded-2xl p-2">
        <div className="glass-panel rounded-xl p-4" data-testid="focus-now">
          <p className="text-xs font-semibold tracking-wide text-blue-900 uppercase dark:text-blue-200">
            {t('today.nowLabel')}
          </p>
          {current ? (
            <>
              <p className="user-text mt-1 text-xl font-bold">
                {CATEGORY_META[current.category].emoji} {current.title}
              </p>
              <p className="text-sm text-slate-800 dark:text-slate-200">
                {t('today.until', { end: formatTimeOfDay(current.end) })}
                {left !== null && (
                  <>
                    {' · '}
                    <span data-testid="focus-countdown" className="font-semibold tabular-nums">
                      {t('focus.left', { d: formatDuration(left) })}
                    </span>
                  </>
                )}
              </p>
            </>
          ) : next ? (
            <>
              <p className="mt-1 text-slate-800 dark:text-slate-200">{t('today.nothing')}</p>
              <p className="mt-1 text-sm">
                <span data-testid="focus-countdown" className="font-semibold tabular-nums">
                  {t('focus.startsIn', { d: formatDuration(minutesToNext ?? 0) })}
                </span>
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-slate-800 dark:text-slate-200">{t('today.nothing')}</p>
              <p className="text-sm text-slate-800 dark:text-slate-200">{t('focus.empty')}</p>
              <Button variant="soft" className="mt-2" onClick={onAdd}>
                {t('focus.add')}
              </Button>
            </>
          )}
          {next && (
            <p className="mt-2 border-t border-slate-300/60 pt-2 text-sm dark:border-slate-600/50">
              <span className="text-xs font-semibold tracking-wide text-slate-700 uppercase dark:text-slate-300">
                {t('today.nextLabel')}
              </span>
              <br />
              <span className="user-text">
                {CATEGORY_META[next.category].emoji} {next.title} · {formatTimeOfDay(next.start)}{' '}
                <span className="text-slate-700 dark:text-slate-300">
                  ({t('today.in', { d: formatDuration(minutesToNext!) })})
                </span>
              </span>
            </p>
          )}
        </div>
      </div>

      <Card className="flex items-center gap-3 p-3" data-testid="day-ring">
        <DayRing done={done} total={total} />
        <div className="min-w-0 text-sm">
          <p className="font-semibold">{t('ring.dayTitle')}</p>
          <p className="text-slate-600 dark:text-slate-400">
            {total ? t('ring.dayCount', { done, total }) : t('ring.dayNone')}
          </p>
        </div>
      </Card>

      <Card className="p-3" data-testid="streak-card">
        <p className="text-sm font-semibold">
          🔥 {streak.current > 0 ? t('streak.days', { n: streak.current }) : t('streak.fresh')}
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {streak.savers > 0 ? `❄️ ${t('streak.saves', { n: streak.savers })} · ` : ''}
          {t('streak.saveNote')}
        </p>
      </Card>
    </section>
  )
}

/** done / planned as a ring: same look as the week and steps rings. */
export function DayRing({ done, total }: { done: number; total: number }) {
  const { t } = useT()
  const R = 26
  const C = 2 * Math.PI * R
  const f = total ? Math.min(1, done / total) : 0
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      role="img"
      aria-label={t('ring.dayAria', { done, total })}
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
        className="stroke-blue-600 transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none dark:stroke-blue-400"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - f)}
        transform="rotate(-90 32 32)"
      />
      <text x="32" y="36" textAnchor="middle" className="fill-current text-[11px] font-bold">
        {total ? `${done}/${total}` : '–'}
      </text>
    </svg>
  )
}
