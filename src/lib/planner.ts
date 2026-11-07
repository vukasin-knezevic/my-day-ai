// Rule-based weekly planner (no AI). Pure function: same input -> same output.
// It creates *suggestions* (dashed border in the UI) that the user accepts or ignores.
import type { Activity, Assessment, Category, Settings, Subject } from '../types'
import { addDaysStr, daysUntil, formatDuration, minToTime, timeToMin, weekdayOf } from './dates'
import { isExamType } from './kinds'
import { studyHoursOf } from './exams'
import { freeSlots, occurrencesOn } from './schedule'
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

interface Iv {
  s: number
  e: number
}

export const MAX_STUDY_BLOCK = 120 // minutes
export const BREAK_MIN = 30
const MIN_BLOCK = 30
const WORKOUT_MIN = 75
const EVE_WORKOUT_MAX = 45

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
const round15 = (n: number) => Math.round(n / 15) * 15

interface DayState {
  date: string
  free: Iv[]
  window: Iv
  existingStudy: number
  newStudy: number
  lastStudyEnd: number | null
  workout: boolean
  load: number
}

export function planWeek(input: PlanInput): PlanResult {
  const { from, settings, subjects, assessments } = input
  const days = input.days ?? 7 - weekdayOf(from) + 1
  const dates = Array.from({ length: Math.max(days, 0) }, (_, i) => addDaysStr(from, i))
  const notes: string[] = []
  const suggestions: PlanResult['suggestions'] = []
  const adjustments: Adjustment[] = []

  // the planner's own pending suggestions get replaced, so they are not busy time;
  // pending AI suggestions stay in place and must not be overlapped
  const fixed = input.activities.filter((a) => !a.suggested || a.source !== 'me')
  const data = { activities: fixed, subjects }

  const wake = timeToMin(settings.wakeTime)
  let bed = timeToMin(settings.bedTime)
  if (bed <= wake) bed += 1440
  const windowEnd = Math.min(bed, 1439) // activities cannot cross midnight in this model
  const window: Iv = { s: wake, e: windowEnd }

  const exams = assessments.filter((a) => isExamType(a.type) && a.date >= from)
  const examDays = new Set(exams.map((e) => e.date))
  const eveDays = new Set(exams.map((e) => addDaysStr(e.date, -1)))

  // ---- day states ----
  const state = new Map<string, DayState>()
  for (const date of dates) {
    const occ = occurrencesOn(data, date).filter((o) => o.status !== 'skipped')
    let free: Iv[] = [window]
    if (date === from && input.nowMin !== undefined)
      free = subtract(free, { s: 0, e: Math.ceil(input.nowMin / 15) * 15 })
    let load = 0
    let existingStudy = 0
    for (const o of occ) {
      const iv = { s: timeToMin(o.start), e: timeToMin(o.end) }
      free = subtract(free, iv)
      load += Math.max(0, iv.e - iv.s)
      if (o.category === 'study' && o.type === 'activity') existingStudy += iv.e - iv.s
    }
    state.set(date, {
      date,
      free,
      window,
      existingStudy,
      newStudy: 0,
      lastStudyEnd: null,
      workout: occ.some((o) => o.category === 'workout'),
      load,
    })
  }

  // ---- easy day: least loaded day without an exam (or exam eve) ----
  let easyDay: string | null = null
  if (dates.length >= 3) {
    const cands = dates.filter((d) => !examDays.has(d) && !eveDays.has(d))
    cands.sort((a, b) => state.get(a)!.load - state.get(b)!.load || b.localeCompare(a))
    easyDay = cands[0] ?? null
    if (easyDay) notes.push(tr('plan.easyDay', { date: easyDay }))
  }

  // ---- workouts: shorten the one on an exam eve, add new ones spread over the week ----
  for (const date of dates) {
    if (!eveDays.has(date)) continue
    for (const a of fixed) {
      const occ = occurrencesOn({ activities: [a], subjects: [] }, date)[0]
      if (!occ || a.category !== 'workout' || occ.status === 'skipped') continue
      const len = timeToMin(a.end) - timeToMin(a.start)
      if (len > EVE_WORKOUT_MAX) {
        adjustments.push({
          activityId: a.id,
          date,
          newEnd: minToTime(timeToMin(a.start) + EVE_WORKOUT_MAX),
          reason: tr('plan.eveReason', { min: EVE_WORKOUT_MAX }),
        })
        notes.push(tr('plan.eveNote', { date, min: EVE_WORKOUT_MAX }))
      }
    }
  }

  const existingWorkouts = dates.filter((d) => state.get(d)!.workout).length
  const target = Math.round((settings.workoutsPerWeek * dates.length) / 7)
  let toAdd = Math.max(0, target - existingWorkouts)
  const trained = new Set(dates.filter((d) => state.get(d)!.workout))
  while (toAdd > 0) {
    const cands = dates.filter(
      (d) =>
        !trained.has(d) &&
        !examDays.has(d) &&
        !eveDays.has(d) &&
        d !== easyDay &&
        findWorkoutSlot(state.get(d)!),
    )
    if (!cands.length) break
    // spread: maximize the distance to the nearest training day
    const dist = (d: string) =>
      trained.size ? Math.min(...[...trained].map((t) => Math.abs(daysUntil(d, t)))) : 99
    cands.sort((a, b) => dist(b) - dist(a) || a.localeCompare(b))
    const day = cands[0]
    const st = state.get(day)!
    const slot = findWorkoutSlot(st)!
    st.free = subtract(st.free, { s: slot, e: slot + WORKOUT_MIN + 15 })
    st.workout = true
    trained.add(day)
    suggestions.push(makeAct(tr('plan.workoutTitle'), 'workout', day, slot, slot + WORKOUT_MIN))
    toAdd--
  }
  if (toAdd > 0) notes.push(tr('plan.noRoom', { n: toAdd }))

  // ---- study demand per exam, spread over days ----
  const demand = new Map<string, { exam: Assessment; minutes: number }[]>()
  for (const ex of exams) {
    const n = daysUntil(ex.date, from)
    if (n <= 0) continue
    const span = Math.min(n, 3 + 2 * ex.difficulty) // harder exam -> start earlier
    const prepDays = Array.from({ length: span }, (_, i) => addDaysStr(ex.date, -span + i))
    // hard exams: even spread (more work early); easier: ramp up towards the exam
    const weights = prepDays.map((_, i) => (ex.difficulty >= 4 ? 1 : i + 1))
    const sum = weights.reduce((a, b) => a + b, 0)
    prepDays.forEach((d, i) => {
      if (!state.has(d)) return
      const m = round15(
        (studyHoursOf(
          ex,
          subjects.find((s) => s.id === ex.subjectId),
        ) *
          60 *
          weights[i]) /
          sum,
      )
      if (m <= 0) return
      demand.set(d, [...(demand.get(d) ?? []), { exam: ex, minutes: m }])
    })
  }

  // ---- place study blocks day by day, carrying leftovers forward ----
  const carry = new Map<string, number>() // exam id -> minutes
  const subjName = (id: string) => subjects.find((s) => s.id === id)?.name ?? tr('subject.fallback')
  for (const date of dates) {
    const st = state.get(date)!
    const cap = date === easyDay ? 60 : settings.studyHoursPerDay * 60
    let room = Math.max(0, cap - st.existingStudy)
    const todo = (demand.get(date) ?? []).map((d) => ({
      ...d,
      minutes: d.minutes + (carry.get(d.exam.id) ?? 0),
    }))
    // exams with carried minutes but no demand today
    for (const [id, m] of carry) {
      if (!todo.some((t) => t.exam.id === id)) {
        const ex = exams.find((e) => e.id === id)
        if (ex && ex.date > date) todo.push({ exam: ex, minutes: m })
      }
    }
    todo.sort(
      (a, b) => a.exam.date.localeCompare(b.exam.date) || b.exam.difficulty - a.exam.difficulty,
    )
    const neIdem = freeSlots(subjects, date).map((f) => ({
      s: timeToMin(f.start),
      e: timeToMin(f.end),
    }))
    const studyWin: Iv = { s: wake + 30, e: Math.min(windowEnd - 60, 22 * 60 + 30) }

    for (const t of todo) {
      let remaining = t.minutes
      while (remaining >= MIN_BLOCK && room >= MIN_BLOCK) {
        const slot = pickStudySlot(st.free, studyWin, neIdem)
        if (!slot) break
        const len = Math.min(remaining, room, MAX_STUDY_BLOCK, slot.e - slot.s)
        const blockLen = Math.floor(len / 15) * 15
        if (blockLen < MIN_BLOCK) {
          st.free = subtract(st.free, slot)
          continue
        }
        suggestions.push(
          makeAct(
            tr('plan.studyTitle', { subject: subjName(t.exam.subjectId) }),
            'study',
            date,
            slot.s,
            slot.s + blockLen,
            t.exam.title,
          ),
        )
        st.free = subtract(st.free, { s: slot.s, e: slot.s + blockLen + BREAK_MIN })
        st.newStudy += blockLen
        st.lastStudyEnd = Math.max(st.lastStudyEnd ?? 0, slot.s + blockLen)
        remaining -= blockLen
        room -= blockLen
      }
      if (remaining >= MIN_BLOCK) carry.set(t.exam.id, remaining)
      else carry.delete(t.exam.id)
    }
  }
  for (const [id, m] of carry) {
    const ex = exams.find((e) => e.id === id)!
    notes.push(tr('plan.notEnough', { title: ex.title, d: formatDuration(m) }))
  }

  // ---- games as a reward after studying ----
  for (const date of dates) {
    const st = state.get(date)!
    const studied = st.newStudy + st.existingStudy
    if (st.newStudy === 0 || studied < 60 || eveDays.has(date) || st.lastStudyEnd === null) continue
    const reward = Math.min(
      120,
      Math.floor(((studied / 60) * settings.rewardMinPerStudyHour) / 15) * 15,
    )
    if (reward < 30) continue
    const after: Iv = { s: st.lastStudyEnd, e: windowEnd - 30 }
    for (const iv of st.free) {
      const cut = intersect(iv, after)
      if (cut && cut.e - cut.s >= reward) {
        suggestions.push(
          makeAct(
            tr('plan.rewardTitle', { name: rewardNameOf(settings) }),
            'games',
            date,
            cut.s,
            cut.s + reward,
          ),
        )
        break
      }
    }
  }

  suggestions.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
  return { suggestions, adjustments, notes, easyDay }
}

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

/** Start minute of a free workout slot: prefers 17:00–21:30, otherwise any time in the day. */
function findWorkoutSlot(st: DayState): number | null {
  const need = WORKOUT_MIN + 15
  const tryWin = (w: Iv) => {
    for (const f of st.free) {
      const x = intersect(f, w)
      if (x && x.e - x.s >= need) return x.s
    }
    return null
  }
  return (
    tryWin({ s: 17 * 60, e: Math.min(21 * 60 + 30, st.window.e) }) ??
    tryWin({ s: st.window.s + 60, e: Math.min(21 * 60 + 30, st.window.e) })
  )
}

function makeAct(
  title: string,
  category: Category,
  date: string,
  s: number,
  e: number,
  note?: string,
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
    note,
  }
}
