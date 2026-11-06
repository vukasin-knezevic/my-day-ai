import { useShallow } from 'zustand/react/shallow'
import { selectData, useStore } from '../store'
import { Button, Card } from './ui'
import { todayStr } from '../lib/dates'
import { computeStreaks, levelFor, ps5Balance } from '../lib/xp'

/** Level, XP bar, streaks and PS5 time balance. Never scolds for playing. */
export default function ProgressCard() {
  const data = useStore(useShallow(selectData))
  const spendPs5 = useStore((s) => s.spendPs5)
  const p = data.progress
  const lvl = levelFor(p.xp)
  const streaks = computeStreaks(data, todayStr())
  const balance = ps5Balance(p)
  const pct = lvl.size ? (lvl.into / lvl.size) * 100 : 100
  return (
    <Card className="mb-4">
      <div className="flex items-baseline justify-between">
        <p className="font-semibold">
          Nivo {lvl.index + 1}: {lvl.name}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">{p.xp} XP</p>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        role="progressbar"
        aria-label="Napredak do sledećeg nivoa"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full bg-blue-600" style={{ width: `${pct}%` }} />
      </div>
      {lvl.nextName && (
        <p className="mt-1 text-xs text-slate-500">
          Još {lvl.size! - lvl.into} XP do nivoa „{lvl.nextName}"
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
          🎮 PS5 vreme: zarađeno <strong>{p.ps5EarnedMin}</strong> min · potrošeno{' '}
          <strong>{p.ps5SpentMin}</strong> min · stanje <strong>{balance}</strong> min
        </span>
        <span className="ml-auto flex gap-1">
          <Button variant="soft" onClick={() => spendPs5(30)}>
            Igrao 30 min
          </Button>
          <Button variant="soft" onClick={() => spendPs5(60)}>
            Igrao 60 min
          </Button>
        </span>
      </div>
    </Card>
  )
}
