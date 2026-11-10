import { useShallow } from 'zustand/react/shallow'
import { selectData, useStore } from '../store'
import { Card } from './ui'
import { addressName } from '../lib/address'
import { routineStreak, routineView } from '../lib/routine'
import { toggleRoutineStep } from '../lib/routineFlow'
import { useT } from '../i18n'

/** The morning routine card on the Today screen: ticks, a small animation and XP. No blame, ever. */
export default function MorningRoutine({ now, today }: { now: Date; today: string }) {
  const { t } = useT()
  const data = useStore(useShallow(selectData))
  const view = routineView(data, now, today)
  if (view.mode === 'off') return null
  const streak = routineStreak(data, today)
  const name = addressName(data.settings)
  const shown =
    view.mode === 'rescue'
      ? view.indexes.map((i) => ({ i, step: view.steps[i] }))
      : view.steps.map((step, i) => ({ i, step }))
  const doneCount = shown.filter((x) => view.done.includes(x.i)).length

  return (
    <Card
      className="mb-4 border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
      data-testid="routine"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">
          {view.mode === 'rescue' ? t('routine.rescueTitle') : `☀️ ${t('routine.title')}`}
        </h2>
        {streak > 0 && <span className="text-sm">🔥 {t('streak.days', { n: streak })}</span>}
      </div>
      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
        {view.mode === 'rescue'
          ? t('routine.rescueText')
          : view.complete
            ? t('routine.complete')
            : name
              ? t('routine.hello', { name, n: view.steps.length })
              : t('routine.helloNoName', { n: view.steps.length })}
      </p>
      <ul className="mt-2 space-y-1">
        {shown.map(({ i, step }) => {
          const on = view.done.includes(i)
          return (
            <li key={i}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggleRoutineStep(i, today, new Date())}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left text-sm hover:bg-amber-100 dark:hover:bg-amber-900"
              >
                <span
                  aria-hidden
                  className={`flex size-6 items-center justify-center rounded-md border-2 ${
                    on
                      ? 'anim-check border-green-600 bg-green-600 text-white'
                      : 'border-slate-400 dark:border-slate-500'
                  }`}
                >
                  {on ? '✓' : ''}
                </span>
                <span className={`user-text ${on ? 'line-through opacity-60' : ''}`}>
                  {step.emoji} {step.text}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
        {t('routine.progress', { done: doneCount, total: shown.length })}
      </p>
    </Card>
  )
}
