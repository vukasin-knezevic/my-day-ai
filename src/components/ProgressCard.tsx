import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { selectData, useStore } from '../store'
import { Button, Card } from './ui'
import { todayStr } from '../lib/dates'
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
        <p className="text-sm text-slate-600 dark:text-slate-400">{p.xp} XP</p>
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
    </Card>
  )
}
