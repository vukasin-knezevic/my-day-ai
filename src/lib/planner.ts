// Rule-based weekly planner (no AI). Pure function: same input -> same output.
// It creates *suggestions* (dashed border in the UI) that the user accepts or ignores.
import type { Activity, Assessment, Category, Settings, Subject } from '../types'
import {
  addDaysStr,
  daysUntil,
  formatShort,
  minToTime,
  timeToMin,
  weekStartStr,
  weekdayOf,
} from './dates'
import { isExam } from './exams'
import { freeSlots, occurrencesOn, type Occurrence } from './schedule'
import { t as tr } from '../i18n'
import { rewardNameOf } from './labels'

export interface PlanInput {
  /** First day to plan (usually today) */
  from: string
  /** Number of days to plan; default = until Sunday of the week of `from` */
  days?: number
  /** Current time when `from` is today: nothing is suggested before it */
  nowMin?: number
  settings: Pick<
    Settings,
    | 'wakeTime'
    | 'bedTime'
    | 'studyHoursPerDay'
    | 'workoutsPerWeek'
    | 'rewardMinPerStudyHour'
    | 'rewardName'
  >
  subjects: Subject[]
  assessments: Assessment[]
  activities: Activity[]
}

export interface Adjustment {
  activityId: string
  date: string
  newEnd: string
  reason: string
}

export interface PlanResult {
  suggestions: Omit<Activity, 'id'>[]
  adjustments: Adjustment[]
  notes: string[]
  easyDay: string | null
}

export const MAX_STUDY_BLOCK = 120 // minutes
export const BREAK_MIN = 30
const MIN_BLOCK = 30
const TIME_STEP = 15
const EASY_DAY_STUDY = 60
const WORKOUT_MIN = 75
const WORKOUT_GAP = 15 // getting ready after a workout
const EVE_WORKOUT_MAX = 45
const EVENING = 17 * 60
const LAST_WORKOUT_END = 21 * 60 + 30
const LAST_STUDY_END = 22 * 60 + 30
const MIN_REWARD = 30
const MAX_REWARD = 120
const LAST_MINUTE = 1439 // activities cannot cross midnight in this model

/** A stretch of time in minutes from midnight. */
interface Iv {
  s: number
  e: number
}

function subtract(list: Iv[], cut: Iv): Iv[] {
  const out: Iv[] = []
  for (const iv of list) {
    if (cut.e <= iv.s || cut.s >= iv.e) out.push(iv)
    else {
      if (cut.s > iv.s) out.push({ s: iv.s, e: cut.s })
      if (cut.e < iv.e) out.push({ s: cut.e, e: iv.e })
    }
  }
  return out
}
const intersect = (a: Iv, b: Iv): Iv | null => {
  const s = Math.max(a.s, b.s)
  const e = Math.min(a.e, b.e)
  return e > s ? { s, e } : null
}

/** Splits `total` by weight into MIN_BLOCK steps. The parts always add up to `total`. */
function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  let weightSoFar = 0
  let given = 0
  return weights.map((w) => {
    weightSoFar += w
    const upToHere = Math.round((total * weightSoFar) / sum / MIN_BLOCK) * MIN_BLOCK
    const part = upToHere - given
    given = upToHere
    return part
  })
}

interface DayState {
  free: Iv[]
  existingStudy: number
  newStudy: number
  lastStudyEnd: number | null
  workout: boolean
  load: number
}

/** Everything one planning run knows; the steps below read it and add to its results. */
interface Plan extends PlanResult {
  input: PlanInput
  dates: string[]
  /** Activities that stay in place */
  fixed: Activity[]
  exams: Assessment[]
  examDays: Set<string>
  eveDays: Set<string>
  /** Waking hours of a day */
  window: Iv
  day: Map<string, DayState>
}

/** One day's study need for one exam. */
interface StudyTask {
  exam: Assessment
  minutes: number
}

export function planWeek(input: PlanInput): PlanResult {
  const plan = startPlan(input)
  chooseEasyDay(plan)
  shortenWorkoutsBeforeExams(plan)
  addWorkouts(plan)
  placeStudy(plan, studyDemand(plan))
  addRewards(plan)
  const { suggestions, adjustments, notes, easyDay } = plan
  suggestions.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
  return { suggestions, adjustments, notes, easyDay }
}

function startPlan(input: PlanInput): Plan {
  const { from, settings, subjects } = input
  const days = input.days ?? 7 - weekdayOf(from) + 1
  const dates = Array.from({ length: Math.max(days, 0) }, (_, i) => addDaysStr(from, i))

  // the planner's own pending suggestions get replaced, so they are not busy time;
  // pending AI suggestions stay in place and must not be overlapped
  const fixed = input.activities.filter((a) => !a.suggested || a.source !== 'me')

  const wake = timeToMin(settings.wakeTime)
  const bed = timeToMin(settings.bedTime)
  const window: Iv = { s: wake, e: bed <= wake ? LAST_MINUTE : Math.min(bed, LAST_MINUTE) }

  const exams = input.assessments.filter((a) => isExam(a) && a.date >= from)
  const startAt =
    input.nowMin === undefined ? null : Math.ceil(input.nowMin / TIME_STEP) * TIME_STEP

  const day = new Map<string, DayState>()
  for (const date of dates) {
    const occ = occurrencesOn({ activities: fixed, subjects }, date)
    day.set(date, dayState(occ, window, date === from ? startAt : null))
  }
  return {
    input,
    dates,
    fixed,
    exams,
    examDays: new Set(exams.map((e) => e.date)),
    eveDays: new Set(exams.map((e) => addDaysStr(e.date, -1))),
    window,
    day,
    suggestions: [],
    adjustments: [],
    notes: [],
    easyDay: null,
  }
}

function dayState(occurrences: Occurrence[], window: Iv, startAt: number | null): DayState {
  const occ = occurrences.filter((o) => o.status !== 'skipped')
  let free: Iv[] = startAt === null ? [window] : subtract([window], { s: 0, e: startAt })
  let load = 0
  let existingStudy = 0
  for (const o of occ) {
    const iv = { s: timeToMin(o.start), e: timeToMin(o.end) }
    free = subtract(free, iv)
    load += Math.max(0, iv.e - iv.s)
    if (o.category === 'study' && o.type === 'activity') existingStudy += iv.e - iv.s
  }
  return {
    free,
    existingStudy,
    newStudy: 0,
    lastStudyEnd: null,
    workout: occ.some((o) => o.category === 'workout'),
    load,
  }
}

/** The least loaded day without an exam or the evening before one (later day on a tie). */
function chooseEasyDay(plan: Plan) {
  if (plan.dates.length < 3) return
  const load = (d: string) => plan.day.get(d)!.load
  const [easiest] = plan.dates
    .filter((d) => !plan.examDays.has(d) && !plan.eveDays.has(d))
    .sort((a, b) => load(a) - load(b) || b.localeCompare(a))
  if (!easiest) return
  plan.easyDay = easiest
  plan.notes.push(tr('plan.easyDay', { date: formatShort(easiest) }))
}

function shortenWorkoutsBeforeExams(plan: Plan) {
  for (const date of plan.dates) {
    if (!plan.eveDays.has(date)) continue
    const long = plan.fixed.filter((a) => {
      if (a.category !== 'workout') return false
      const [occ] = occurrencesOn({ activities: [a], subjects: [] }, date)
      return occ?.status === 'planned' && timeToMin(a.end) - timeToMin(a.start) > EVE_WORKOUT_MAX
    })
    for (const a of long)
      plan.adjustments.push({
        activityId: a.id,
        date,
        newEnd: minToTime(timeToMin(a.start) + EVE_WORKOUT_MAX),
        reason: tr('plan.eveReason', { min: EVE_WORKOUT_MAX }),
      })
    if (long.length)
      plan.notes.push(tr('plan.eveNote', { date: formatShort(date), min: EVE_WORKOUT_MAX }))
  }
}

/** New workouts up to the weekly goal, as far apart as possible, away from exams. */
function addWorkouts(plan: Plan) {
  const { dates, day, examDays, eveDays, easyDay, window, input } = plan
  const perWeek = input.settings.workoutsPerWeek
  const trained = new Set(dates.filter((d) => day.get(d)!.workout))
  const goal = Math.min(
    Math.round((perWeek * dates.length) / 7),
    Math.max(0, perWeek - workoutDaysBefore(plan.fixed, input.from)),
  )
  let toAdd = Math.max(0, goal - trained.size)
  while (toAdd > 0) {
    const cands = dates.filter(
      (d) =>
        !trained.has(d) &&
        !examDays.has(d) &&
        !eveDays.has(d) &&
        d !== easyDay &&
        findWorkoutSlot(day.get(d)!.free, window) !== null,
    )
    if (!cands.length) break
    const distance = (d: string) =>
      trained.size ? Math.min(...[...trained].map((t) => Math.abs(daysUntil(d, t)))) : 99
    cands.sort((a, b) => distance(b) - distance(a) || a.localeCompare(b))
    const date = cands[0]
    const st = day.get(date)!
    const slot = findWorkoutSlot(st.free, window)!
    st.free = subtract(st.free, { s: slot, e: slot + WORKOUT_MIN + WORKOUT_GAP })
    st.workout = true
    trained.add(date)
    plan.suggestions.push(
      makeAct(tr('plan.workoutTitle'), 'workout', date, slot, slot + WORKOUT_MIN),
    )
    toAdd--
  }
  if (toAdd > 0) plan.notes.push(tr('plan.noRoom', { n: toAdd }))
}

/** Days of this week before `from` that already have a workout, so the weekly goal is not exceeded. */
function workoutDaysBefore(activities: Activity[], from: string): number {
  const workouts = activities.filter((a) => a.category === 'workout')
  let count = 0
  for (let d = weekStartStr(from); d < from; d = addDaysStr(d, 1)) {
    const occ = occurrencesOn({ activities: workouts, subjects: [] }, d)
    if (occ.some((o) => o.status !== 'skipped')) count++
  }
  return count
}

/** Start minute of a free workout slot: prefers the evening, otherwise any time in the day. */
function findWorkoutSlot(free: Iv[], window: Iv): number | null {
  const need = WORKOUT_MIN + WORKOUT_GAP
  const end = Math.min(LAST_WORKOUT_END, window.e)
  const firstIn = (w: Iv) => {
    for (const f of free) {
      const x = intersect(f, w)
      if (x && x.e - x.s >= need) return x.s
    }
    return null
  }
  return firstIn({ s: EVENING, e: end }) ?? firstIn({ s: window.s + 60, e: end })
}

/** How much to study for which exam on each day. */
function studyDemand({ exams, day, fixed, input }: Plan): Map<string, StudyTask[]> {
  const demand = new Map<string, StudyTask[]>()
  for (const exam of exams) {
    const daysLeft = daysUntil(exam.date, input.from)
    if (daysLeft <= 0) continue
    const span = Math.min(daysLeft, 3 + 2 * exam.difficulty) // harder exam -> start earlier
    const prepDays = Array.from({ length: span }, (_, i) => addDaysStr(exam.date, -span + i))
    // hard exams: even spread (more work early); easier: ramp up towards the exam
    const weights = prepDays.map((_, i) => (exam.difficulty >= 4 ? 1 : i + 1))
    const missing = exam.studyHours * 60 - scheduledMinutes(fixed, exam.id, input.from)
    const total = Math.ceil(Math.max(0, missing) / MIN_BLOCK) * MIN_BLOCK
    const shares = allocate(total, weights)
    prepDays.forEach((d, i) => {
      if (!day.has(d) || shares[i] <= 0) return
      demand.set(d, [...(demand.get(d) ?? []), { exam, minutes: shares[i] }])
    })
  }
  return demand
}

/** Study already done for an exam, or still scheduled from `from` on. */
function scheduledMinutes(activities: Activity[], examId: string, from: string): number {
  return activities
    .filter((a) => a.assessmentId === examId && a.status !== 'skipped')
    .filter((a) => a.status === 'done' || a.date >= from)
    .reduce((n, a) => n + timeToMin(a.end) - timeToMin(a.start), 0)
}

/** Places study blocks day by day. What does not fit moves on to the next day. */
function placeStudy(plan: Plan, demand: Map<string, StudyTask[]>) {
  const { dates, exams, input, easyDay } = plan
  const carry = new Map<string, number>() // exam id -> minutes
  for (const date of dates) {
    const cap = date === easyDay ? EASY_DAY_STUDY : input.settings.studyHoursPerDay * 60
    const st = plan.day.get(date)!
    let room = Math.max(0, cap - st.existingStudy)
    for (const task of tasksFor(date, demand, carry, exams)) {
      const left = placeBlocks(plan, date, task, room)
      room -= task.minutes - left
      // a part too small for a block today is not lost: it joins tomorrow's share
      if (left > 0) carry.set(task.exam.id, left)
      else carry.delete(task.exam.id)
    }
  }
  const dayAfterPlan = addDaysStr(input.from, dates.length)
  for (const [id, minutes] of carry) {
    const exam = exams.find((e) => e.id === id)!
    // an exam beyond the planned days still has time: the next plan picks these minutes up
    if (minutes >= MIN_BLOCK && exam.date <= dayAfterPlan)
      plan.notes.push(tr('plan.notEnough', { title: exam.title, h: Math.round(minutes / 6) / 10 }))
  }
}

/** Today's share plus what was carried over, nearest exam first. */
function tasksFor(
  date: string,
  demand: Map<string, StudyTask[]>,
  carry: Map<string, number>,
  exams: Assessment[],
): StudyTask[] {
  const tasks = (demand.get(date) ?? []).map((d) => ({
    ...d,
    minutes: d.minutes + (carry.get(d.exam.id) ?? 0),
  }))
  for (const [id, minutes] of carry) {
    const exam = exams.find((e) => e.id === id)
    if (exam && exam.date > date && !tasks.some((x) => x.exam.id === id))
      tasks.push({ exam, minutes })
  }
  return tasks.sort(
    (a, b) => a.exam.date.localeCompare(b.exam.date) || b.exam.difficulty - a.exam.difficulty,
  )
}

/** Fills the day with blocks for one task, within `room` minutes. Returns the minutes left over. */
function placeBlocks(plan: Plan, date: string, task: StudyTask, room: number): number {
  const { window, input } = plan
  const st = plan.day.get(date)!
  const studyWindow: Iv = {
    s: window.s + 30,
    e: Math.min(window.e - 60, LAST_STUDY_END),
  }
  const skippedClasses = freeSlots(input.subjects, date).map((f) => ({
    s: timeToMin(f.start),
    e: timeToMin(f.end),
  }))
  const subject = input.subjects.find((s) => s.id === task.exam.subjectId)?.name
  let left = task.minutes
  while (left >= MIN_BLOCK && room >= MIN_BLOCK) {
    const slot = pickStudySlot(st.free, studyWindow, skippedClasses)
    if (!slot) break
    const fits = Math.min(left, room, MAX_STUDY_BLOCK, slot.e - slot.s)
    const block = Math.floor(fits / TIME_STEP) * TIME_STEP
    const end = slot.s + block
    plan.suggestions.push(
      makeAct(
        tr('plan.studyTitle', { subject: subject ?? tr('subject.fallback') }),
        'study',
        date,
        slot.s,
        end,
        { note: task.exam.title, assessmentId: task.exam.id },
      ),
    )
    st.free = subtract(st.free, { s: slot.s, e: end + BREAK_MIN })
    st.newStudy += block
    st.lastStudyEnd = Math.max(st.lastStudyEnd ?? 0, end)
    left -= block
    room -= block
  }
  return left
}

/** Skipped classes first: that time is already set aside for the subject. */
function pickStudySlot(free: Iv[], win: Iv, preferred: Iv[]): Iv | null {
  const clipped = free
    .map((f) => intersect(f, win))
    .filter((x): x is Iv => !!x && x.e - x.s >= MIN_BLOCK)
  for (const p of preferred) {
    for (const c of clipped) {
      const x = intersect(c, p)
      if (x && x.e - x.s >= MIN_BLOCK) return x
    }
  }
  return clipped[0] ?? null
}

/** The user's reward after the last study block of a day, in proportion to the study. */
function addRewards(plan: Plan) {
  const { settings } = plan.input
  for (const date of plan.dates) {
    const st = plan.day.get(date)!
    const studied = st.newStudy + st.existingStudy
    if (st.newStudy === 0 || studied < 60 || plan.eveDays.has(date)) continue
    const earned = (studied / 60) * settings.rewardMinPerStudyHour
    const reward = Math.min(MAX_REWARD, Math.floor(earned / TIME_STEP) * TIME_STEP)
    if (reward < MIN_REWARD) continue
    const after: Iv = { s: st.lastStudyEnd!, e: plan.window.e - 30 }
    const slot = st.free.map((iv) => intersect(iv, after)).find((x) => x && x.e - x.s >= reward)
    if (slot)
      plan.suggestions.push(
        makeAct(
          tr('plan.rewardTitle', { name: rewardNameOf(settings) }),
          'games',
          date,
          slot.s,
          slot.s + reward,
        ),
      )
  }
}

function makeAct(
  title: string,
  category: Category,
  date: string,
  s: number,
  e: number,
  extra: Pick<Activity, 'note' | 'assessmentId'> = {},
): Omit<Activity, 'id'> {
  return {
    title,
    category,
    date,
    start: minToTime(s),
    end: minToTime(e),
    recurrence: 'none',
    status: 'planned',
    source: 'me',
    suggested: true,
    ...extra,
  }
}
