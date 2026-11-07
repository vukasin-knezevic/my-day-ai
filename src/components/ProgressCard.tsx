import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { selectData, useStore } from '../store'
import { Button, Card } from './ui'
import { formatDateNumeric, formatTimeOfDay, todayStr } from '../lib/dates'
import Sheet from './Sheet'
import { useT } from '../i18n'
import { rewardNameOf } from '../lib/labels'
import Rich from '../i18n/Rich'
import { computeStreaks, levelFor, rewardBalance } from '../lib/xp'

/** Level, XP bar, streaks and the reward time balance. Never scolds for playing. */
export default function ProgressCard() {
  const { t } = useT()
  const data = useStore(useShallow(selectData))
  const spendReward = useStore((s) => s.spendReward)
  const unspendReward = useStore((s) => s.unspendReward)
  const [history, setHistory] = useState(false)
  const [undo, setUndo] = useState<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(
    null,
  )
  const p = data.progress
  const lvl = levelFor(p.xp)
  const streaks = computeStreaks(data, todayStr())
  const balance = rewardBalance(p)
  const pct = lvl.size ? (lvl.into / lvl.size) * 100 : 100
  return (
    <Card className="mb-4">
      <div className="flex items-baseline justify-between">
        <p className="font-semibold">{t('progress.level', { n: lvl.index + 1, name: lvl.name })}</p>
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setHistory(true)}
          className="rounded-lg px-2 py-1 text-sm text-blue-700 underline-offset-2 hover:underline dark:text-blue-300"
        >
          {p.xp} XP
        </button>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        role="progressbar"
        aria-label={t('progress.aria')}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full bg-blue-600" style={{ width: `${pct}%` }} />
      </div>
      {lvl.nextName && (
        <p className="mt-1 text-xs text-slate-500">
          {t('progress.toNext', { xp: lvl.size! - lvl.into, name: lvl.nextName })}
        </p>
      )}
      <p className="mt-2 flex flex-wrap gap-x-4 text-sm">
        <span>📚 {streaks.study}🔥</span>
        <span>🏋️ {streaks.workout}🔥</span>
        <span>😴 {streaks.sleep}🔥</span>
        <span>✅ {streaks.habits}🔥</span>
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
        <span>
          <Rich
            text={t('progress.reward', {
              emoji: data.settings.rewardEmoji,
              name: rewardNameOf(data.settings),
              earned: p.rewardEarnedMin,
              spent: p.rewardSpentMin,
              bal: balance,
            })}
          />
        </span>
        <span className="ml-auto flex gap-1">
          {undo ? (
            <Button
              variant="soft"
              onClick={() => {
                clearTimeout(undo.timer)
                unspendReward(undo.id)
                setUndo(null)
              }}
            >
              {t('progress.undo')}
            </Button>
          ) : (
            [30, 60].map((n) => (
              <Button
                key={n}
                variant="soft"
                disabled={balance < n}
                onClick={() => {
                  const id = spendReward(n)
                  if (id) setUndo({ id, timer: setTimeout(() => setUndo(null), 6000) })
                }}
              >
                {t('progress.use', { n })}
              </Button>
            ))
          )}
        </span>
      </div>
      <Sheet open={history} onClose={() => setHistory(false)} title={t('xp.history')}>
        {p.events.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-600 dark:text-slate-400">
            {t('xp.historyEmpty')}
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
            {[...p.events].reverse().map((e, i) => (
              <li key={`${e.id}-${i}`} className="flex items-start justify-between gap-3 py-2">
                <span>
                  <span className="user-text block">{e.reason}</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {formatDateNumeric(e.date)}
                    {e.at ? ` ${formatTimeOfDay(clock(e.at))}` : ''}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {e.xp > 0 ? `+${e.xp}` : e.xp} XP
                </span>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </Card>
  )
}

/** Local "HH:mm" of an ISO time. */
function clock(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
