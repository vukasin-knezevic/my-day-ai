import { useStore, selectData } from '../store'
import { emptyData } from './defaults'
import { doneWorkouts, workoutsDoneInWeek } from './workout'
import { computeStreaks } from './xp'
import {
  activatePlan,
  finishWorkout,
  removeWorkoutLog,
  scheduleWorkout,
  setWorkoutDone,
  stopPlan,
} from './workoutFlow'
import { getSplits } from './workout'

const DAY = '2026-11-10' // a Tuesday
const bench = (kg: number) => [{ name: 'Bench', sets: [{ reps: 8, weight: kg }] }]
const st = () => useStore.getState()

beforeEach(() => {
  useStore.setState({ ...emptyData(), hydrated: true })
})

test('a scheduled workout with exercises is ONE workout: counted once, XP paid once', () => {
  const { activityId } = scheduleWorkout({
    title: 'Push',
    date: DAY,
    start: '18:00',
    exercises: bench(60),
  })
  expect(doneWorkouts(selectData(st()))).toHaveLength(0)

  finishWorkout({ activityId, date: DAY, exercises: bench(60), durationMin: 50 })
  const xp = st().progress.xp
  expect(xp).toBeGreaterThan(0)
  expect(doneWorkouts(selectData(st()))).toHaveLength(1)
  expect(workoutsDoneInWeek(selectData(st()), DAY)).toBe(1)
  expect(computeStreaks(selectData(st()), DAY).workout).toBe(1)

  // pressing "done" again (from the other screen) does not pay again
  setWorkoutDone(activityId, DAY, true)
  expect(st().progress.xp).toBe(xp)
  expect(st().workouts).toHaveLength(1)
})

test('undo takes the XP and the records back and the exercises stay as the plan', () => {
  const first = scheduleWorkout({
    title: 'A',
    date: '2026-11-03',
    start: '18:00',
    exercises: bench(50),
  })
  finishWorkout({
    activityId: first.activityId,
    date: '2026-11-03',
    exercises: bench(50),
    durationMin: 40,
  })
  const { activityId } = scheduleWorkout({
    title: 'B',
    date: DAY,
    start: '18:00',
    exercises: bench(60),
  })
  const { records } = finishWorkout({
    activityId,
    date: DAY,
    exercises: bench(60),
    durationMin: 40,
  })
  expect(records).toHaveLength(1)
  const before = st().progress.xp

  setWorkoutDone(activityId, DAY, false)
  expect(st().progress.xp).toBeLessThan(before)
  expect(st().activities.find((a) => a.id === activityId)?.status).toBe('planned')
  expect(st().workouts.find((w) => w.activityId === activityId)?.planned).toBe(true)
  expect(doneWorkouts(selectData(st())).map((w) => w.date)).toEqual(['2026-11-03'])
})

test('Today "done" without any exercises still counts as a workout', () => {
  const { activityId } = scheduleWorkout({ title: 'Run', date: DAY, start: '07:00', exercises: [] })
  setWorkoutDone(activityId, DAY, true)
  expect(doneWorkouts(selectData(st()))).toHaveLength(1)
  expect(st().workouts).toHaveLength(0)
})

test('deleting a logged workout makes the scheduled one "not done" and takes the XP back', () => {
  const { activityId } = scheduleWorkout({
    title: 'A',
    date: DAY,
    start: '18:00',
    exercises: bench(50),
  })
  const { workoutId } = finishWorkout({
    activityId,
    date: DAY,
    exercises: bench(50),
    durationMin: 40,
  })
  removeWorkoutLog(workoutId!)
  expect(st().progress.xp).toBe(0)
  expect(st().activities[0].status).toBe('planned')
})

test('a plan repeats weekly; stopping it removes unstarted workouts and keeps started ones', () => {
  const plan = getSplits()[0] // 3 days
  activatePlan(
    plan,
    plan.days.map((d) => ({ day: d.day, start: '19:00' })),
    DAY,
  )
  expect(st().activities).toHaveLength(3)
  expect(st().activities.every((a) => a.recurrence === 'weekly' && a.start === '19:00')).toBe(true)
  expect(st().workoutPlan?.schedule).toHaveLength(3)

  // one of them is done, then the plan is stopped
  const a = st().activities[0]
  setWorkoutDone(a.id, a.date, true)
  stopPlan(DAY)
  expect(st().activities).toHaveLength(1)
  expect(st().activities[0].until).toBe('2026-11-09')
  expect(st().workoutPlan?.schedule).toBeUndefined()
  expect(doneWorkouts(selectData(st()))).toHaveLength(1)
})
