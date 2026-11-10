// A workout is ONE thing. Scheduling it makes an activity (so it shows on the Today screen and gets
// a reminder); the exercises are a log tied to that activity. Marking it done, from either screen,
// goes through here, so it pays XP once and every counter reads the same source (lib/workout.ts).
import { selectData, useStore } from '../store'
import type { Activity, Weekday, Workout, WorkoutExercise, WorkoutPlan } from '../types'
import { addDaysStr, durationMin, minToTime, timeToMin, todayStr, weekdayOf } from './dates'
import { withStatus } from './schedule'
import { estimateMinutes, logged, newRecords, type NewRecord } from './workout'
import { rewardForDone, XP } from './xp'
import { t } from '../i18n'

const state = () => useStore.getState()

/** The exercise log of one occurrence of a scheduled workout (planned or done). */
export function logFor(workouts: Workout[], activityId: string, date: string): Workout | undefined {
  return workouts.find((w) => w.activityId === activityId && w.date === date)
}

/** A new workout: an activity on that day and time, plus the exercises planned for it (if any). */
export function scheduleWorkout(input: {
  title: string
  date: string
  start: string
  exercises: WorkoutExercise[]
}): { activityId: string; workoutId: string | null } {
  const st = state()
  const minutes = estimateMinutes(input.exercises)
  const title = input.title.trim() || t('plan.workoutTitle')
  const activityId = st.add('activities', {
    title,
    category: 'workout',
    date: input.date,
    start: input.start,
    end: minToTime(timeToMin(input.start) + minutes),
    recurrence: 'none',
    status: 'planned',
    source: 'me',
  })
  const workoutId = input.exercises.length
    ? st.add('workouts', {
        date: input.date,
        type: title,
        durationMin: minutes,
        exercises: input.exercises,
        feeling: null,
        activityId,
        planned: true,
      })
    : null
  return { activityId, workoutId }
}

/**
 * The workout is done: the activity is marked, the exercises are saved as its log, XP is paid once
 * (the same award id the Today screen uses) and personal records are found.
 */
export function finishWorkout(input: {
  activityId: string
  date: string
  exercises: WorkoutExercise[]
  durationMin: number
  feeling?: Workout['feeling']
}): { workoutId: string | null; records: NewRecord[] } {
  const st = state()
  const a = st.activities.find((x) => x.id === input.activityId)
  if (!a) return { workoutId: null, records: [] }
  const existing = logFor(st.workouts, a.id, input.date)
  const records = newRecords(
    { exercises: input.exercises },
    logged(st.workouts).filter((w) => w.id !== existing?.id),
  )

  // a one-off workout shows how long it really took
  const timing =
    a.recurrence === 'none'
      ? { end: minToTime(timeToMin(a.start) + Math.max(5, input.durationMin)) }
      : {}
  st.update('activities', a.id, { ...withStatus(a, input.date, 'done'), ...timing })

  let workoutId = existing?.id ?? null
  const log = {
    date: input.date,
    type: a.title,
    durationMin: input.durationMin,
    exercises: input.exercises,
    planned: false,
    ...(input.feeling !== undefined ? { feeling: input.feeling } : {}),
  }
  if (existing) st.update('workouts', existing.id, log)
  else if (input.exercises.length)
    workoutId = st.add('workouts', { feeling: null, ...log, activityId: a.id })

  const ev = rewardForDone(a, input.date, st.settings.rewardMinPerStudyHour)
  if (ev) st.award(ev)
  if (workoutId)
    for (const r of records)
      st.award({
        id: `pr-${workoutId}-${r.name}`,
        date: input.date,
        reason: t('wo.xp.record', { name: r.name, kg: r.weight }),
        xp: XP.personalRecord,
        category: 'workout',
      })
  return { workoutId, records }
}

/** "Done" / "Undo" pressed on the Today screen for a workout. */
export function setWorkoutDone(activityId: string, date: string, done: boolean) {
  const st = state()
  const a = st.activities.find((x) => x.id === activityId)
  if (!a) return
  const log = logFor(st.workouts, activityId, date)
  if (done) {
    finishWorkout({
      activityId,
      date,
      exercises: log?.exercises ?? [],
      durationMin: log?.planned === false ? log.durationMin : durationMin(a.start, a.end),
    })
    return
  }
  st.update('activities', a.id, withStatus(a, date, 'planned'))
  st.revoke(`act-${a.id}-${date}`)
  if (log) {
    // the exercises stay as the plan for this workout; the records they brought are taken back
    st.update('workouts', log.id, { planned: true })
    st.revoke(`pr-${log.id}-`, { prefix: true })
  }
}

/** Deletes a logged workout; the scheduled workout it belonged to is "not done" again. */
export function removeWorkoutLog(workoutId: string) {
  const st = state()
  const w = st.workouts.find((x) => x.id === workoutId)
  if (!w) return
  st.remove('workouts', workoutId)
  const a = w.activityId ? st.activities.find((x) => x.id === w.activityId) : undefined
  if (!a || w.planned) return
  st.update('activities', a.id, withStatus(a, w.date, 'planned'))
  st.revoke(`act-${a.id}-${w.date}`)
}

/* ---------------- ready-made plans ---------------- */

export interface PlanSlot {
  day: Weekday
  start: string
}

/** The first date from `from` on that falls on the given weekday. */
export function nextWeekday(from: string, day: Weekday): string {
  let d = from
  while (weekdayOf(d) !== day) d = addDaysStr(d, 1)
  return d
}

const isPlanActivity = (a: Activity, today: string) =>
  a.planDay !== undefined && (a.until === undefined || a.until >= today)

/** Ends the repeating workouts of the active plan: what was done stays in the history. */
function endPlanActivities(today: string) {
  const st = state()
  for (const a of st.activities.filter((x) => isPlanActivity(x, today))) {
    const started = a.date < today || (a.doneDates?.length ?? 0) > 0 || a.status === 'done'
    if (started) st.update('activities', a.id, { until: addDaysStr(today, -1) })
    else st.remove('activities', a.id)
  }
}

/**
 * "Use this plan": every day of the plan becomes a workout that repeats each week at the chosen
 * day and time. `slots[i]` belongs to `plan.days[i]`.
 */
export function activatePlan(plan: WorkoutPlan, slots: PlanSlot[], today: string = todayStr()) {
  endPlanActivities(today)
  const st = state()
  const days = plan.days.map((d, i) => ({ ...d, day: slots[i]?.day ?? d.day }))
  days.forEach((d, i) => {
    const start = slots[i]?.start ?? '18:00'
    st.add('activities', {
      title: d.title,
      category: 'workout',
      date: nextWeekday(today, d.day),
      start,
      end: minToTime(timeToMin(start) + estimateMinutes(d.exercises)),
      recurrence: 'weekly',
      status: 'planned',
      source: 'me',
      planDay: d.day,
    })
  })
  st.patch({
    workoutPlan: {
      ...plan,
      days,
      schedule: days.map((d, i) => ({ day: d.day, start: slots[i]?.start ?? '18:00' })),
    },
  })
}

/** "Stop the plan": no more scheduled workouts from it; the plan itself stays to look at. */
export function stopPlan(today: string = todayStr()) {
  endPlanActivities(today)
  const plan = state().workoutPlan
  if (plan) state().patch({ workoutPlan: { ...plan, schedule: undefined } })
}

/** Classes that overlap a workout at that weekday and time (the ones the student attends). */
export function planConflicts(day: Weekday, start: string, minutes: number): string[] {
  const { subjects } = selectData(state())
  const s = timeToMin(start)
  const e = s + minutes
  return subjects
    .filter((sub) =>
      sub.slots.some(
        (sl) =>
          sl.day === day &&
          sl.attendance !== 'ne-idem' &&
          timeToMin(sl.start) < e &&
          s < timeToMin(sl.end),
      ),
    )
    .map((sub) => sub.name)
}
