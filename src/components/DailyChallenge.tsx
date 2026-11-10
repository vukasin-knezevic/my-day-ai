import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { selectData, useStore } from '../store'
import { Button, Card } from './ui'
import { CHALLENGE_XP, challengeFor } from '../lib/challenge'
import { useT } from '../i18n'

/** One small challenge a day, chosen from the user's own data. +15 XP, once. */
export default function DailyChallenge({ today }: { today: string }) {
  const { t } = useT()
  const data = useStore(useShallow(selectData))
  const setDay = useStore((s) => s.setDay)
  const award = useStore((s) => s.award)
  const c = challengeFor(data, today)
  const recorded = data.days[today]?.challengeDone === true
  const skips = data.days[today]?.challengeSkips ?? 0

  const finish = () => {
    setDay(today, { challengeDone: true })
    award({
      id: `challenge-${today}`,
      date: today,
      reason: t('chal.title'),
      xp: CHALLENGE_XP,
      category: 'habits',
    })
  }
  // remember today's choice, so it does not change when the data does
  const kept = data.days[today]?.challengeId
  useEffect(() => {
    if (kept !== c.id) setDay(today, { challengeId: c.id })
  }, [kept, c.id, setDay, today])
  // done by itself (a registration ticked, a habit reached...): record it once and pay
  useEffect(() => {
    if (c.done && !recorded) finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.done, recorded])

  return (
    <Card className="mb-4" data-testid="challenge">
      <p className="text-xs font-semibold tracking-wide text-slate-600 uppercase dark:text-slate-400">
        🎯 {t('chal.title')}
      </p>
      <p className="user-text mt-1 font-medium">{c.text}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        {c.done ? (
          <span className="anim-pop font-medium text-green-700 dark:text-green-400">
            ✓ {t('chal.done', { n: CHALLENGE_XP })}
          </span>
        ) : (
          <>
            <span className="text-slate-600 dark:text-slate-400">+{CHALLENGE_XP} XP</span>
            {!c.auto && (
              <Button variant="soft" onClick={finish}>
                {t('chal.markDone')}
              </Button>
            )}
            {skips === 0 && (
              <Button
                variant="ghost"
                onClick={() => setDay(today, { challengeSkips: 1, challengeId: undefined })}
              >
                {t('chal.another')}
              </Button>
            )}
          </>
        )}
      </div>
    </Card>
  )
}
