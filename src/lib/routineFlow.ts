// Ticking the steps of the morning routine (the part that changes the data).
import { timeToMin } from './dates'
import { t } from '../i18n'
import { useStore } from '../store'
import { ROUTINE_BONUS_WITHIN, ROUTINE_XP, routineGoal, routineSteps, tickedOn } from './routine'

const stepId = (date: string, i: number) => `routine-${date}-${i}`

/** Ticks or unticks one step; completing the routine pays a bonus, unticking takes it all back. */
export function toggleRoutineStep(index: number, date: string, now: Date = new Date()) {
  const st = useStore.getState()
  const steps = routineSteps(st.settings)
  const before = tickedOn(st, date)
  const on = !before.includes(index)
  const next = on ? [...before, index] : before.filter((i) => i !== index)
  st.setDay(date, { routine: next })
  if (!on) {
    st.revoke(stepId(date, index))
    // the bonuses belong to a finished routine only
    if (!steps.every((_, i) => next.includes(i))) {
      st.revoke(`routine-${date}-all`)
      st.revoke(`routine-${date}-early`)
    }
    return
  }
  st.award({
    id: stepId(date, index),
    date,
    reason: `${steps[index]?.emoji ?? ''} ${steps[index]?.text ?? ''}`.trim(),
    xp: ROUTINE_XP.step,
    category: 'habits',
  })
  if (steps.every((_, i) => next.includes(i))) {
    st.award({
      id: `routine-${date}-all`,
      date,
      reason: t('routine.title'),
      xp: ROUTINE_XP.all,
      category: 'habits',
    })
    const nowMin = now.getHours() * 60 + now.getMinutes()
    const goal = timeToMin(routineGoal(st.settings))
    if (nowMin <= goal + ROUTINE_BONUS_WITHIN)
      st.award({
        id: `routine-${date}-early`,
        date,
        reason: t('routine.early'),
        xp: ROUTINE_XP.early,
        category: 'habits',
      })
  }
}
