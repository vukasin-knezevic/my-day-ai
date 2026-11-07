// The rules below must hold for ANY week, not only for the examples in planner.test.ts.
// Scenarios are random but seeded, so a failure repeats exactly: the test name shows the seed.
import { studyHoursOf } from './exams'
import { planWeek, MAX_STUDY_BLOCK, type PlanInput } from './planner'
import { addDaysStr, timeToMin } from './dates'
import { occurrencesOn } from './schedule'
import type { Activity, Assessment, ClassSlot, Subject, Weekday } from '../types'

const MON = '2026-11-02'

/** Small seeded generator (mulberry32): same seed, same numbers. */
function randomFrom(seed: number) {
  let s = seed
  const next = () => {
    s = (s + 0x6d2b79f5) | 0
    let x = Math.imul(s ^ (s >>> 15), 1 | s)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1))
  const pick = <T>(list: readonly T[]) => list[int(0, list.length - 1)]
  return { int, pick }
}

const hhmm = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

function scenario(seed: number): PlanInput {
  const { int, pick } = randomFrom(seed)
  const from = addDaysStr(MON, int(0, 6))
  const slot = (i: number): ClassSlot => {
    const start = int(8, 18) * 60
    return {
      id: `c${i}`,
      kind: 'predavanje',
      day: int(1, 7) as Weekday,
      start: hhmm(start),
      end: hhmm(start + pick([45, 90, 120])),
      attendance: pick(['idem', 'ne-idem', 'ponekad', null] as const),
    }
  }
  const subjects: Subject[] = Array.from({ length: int(0, 3) }, (_, i) => ({
    id: `s${i}`,
    name: `Predmet ${i}`,
    color: '#000',
    espb: 6,
    passMark: 51,
    slots: Array.from({ length: int(0, 3) }, (_, j) => slot(10 * i + j)),
  }))
  const assessments: Assessment[] = Array.from({ length: int(0, 4) }, (_, i) => ({
    id: `e${i}`,
    subjectId: subjects.length ? `s${int(0, subjects.length - 1)}` : 'nema',
    type: pick(['kolokvijum', 'ispit', 'domaci', 'lab'] as const),
    title: `Ispit ${i}`,
    date: addDaysStr(from, int(-2, 14)),
    registration: 'prijavljen',
    maxPoints: 30,
    points: null,
    difficulty: int(1, 5) as Assessment['difficulty'],
    studyHours: int(0, 24) / 2,
  }))
  const activities: Activity[] = Array.from({ length: int(0, 6) }, (_, i) => {
    const start = int(7, 21) * 60
    return {
      id: `a${i}`,
      title: `Aktivnost ${i}`,
      category: pick(['study', 'workout', 'habits', 'food'] as const),
      date: addDaysStr(from, int(-3, 6)),
      start: hhmm(start),
      end: hhmm(start + pick([30, 60, 120, 180])),
      recurrence: pick(['none', 'none', 'daily', 'weekdays', 'weekly'] as const),
      status: pick(['planned', 'planned', 'done', 'skipped'] as const),
      source: pick(['me', 'ai'] as const),
      suggested: pick([false, false, true]),
    }
  })
  return {
    from,
    nowMin: pick([undefined, int(0, 1439)]),
    settings: {
      wakeTime: hhmm(int(5, 10) * 60),
      bedTime: pick(['22:00', '23:30', '00:00', '01:00', '02:30']),
      studyHoursPerDay: int(0, 8),
      workoutsPerWeek: int(0, 7),
      rewardMinPerStudyHour: pick([0, 15, 30, 60]),
      rewardName: 'Nagrada',
    },
    subjects,
    assessments,
    activities,
  }
}

const range = (a: { start: string; end: string }) => ({
  s: timeToMin(a.start),
  e: timeToMin(a.end),
})
const overlap = (a: { s: number; e: number }, b: { s: number; e: number }) => a.s < b.e && b.s < a.e

describe.each(Array.from({ length: 300 }, (_, i) => [i + 1]))('planWeek, seed %i', (seed) => {
  const input = scenario(seed)
  const { suggestions } = planWeek(input)
  const kept = input.activities.filter((a) => !a.suggested || a.source !== 'me')
  const busyOn = (date: string) =>
    occurrencesOn({ activities: kept, subjects: input.subjects }, date)
      .filter((o) => o.status !== 'skipped')
      .map(range)

  it('nothing overlaps: not each other, not what is already in the calendar', () => {
    for (const s of suggestions) {
      const sameDay = suggestions.filter((x) => x !== s && x.date === s.date).map(range)
      for (const other of [...busyOn(s.date), ...sameDay])
        expect(overlap(range(s), other)).toBe(false)
    }
  })

  it('everything stays inside the waking hours, after the current time', () => {
    const wake = timeToMin(input.settings.wakeTime)
    const bed = timeToMin(input.settings.bedTime)
    const lastEnd = bed <= wake ? 1439 : bed
    for (const s of suggestions) {
      const { s: start, e: end } = range(s)
      expect(end).toBeGreaterThan(start)
      expect(start).toBeGreaterThanOrEqual(wake)
      expect(end).toBeLessThanOrEqual(lastEnd)
      if (s.date === input.from && input.nowMin !== undefined)
        expect(start).toBeGreaterThanOrEqual(input.nowMin)
    }
  })

  it('study respects the daily limit, the block limit and the exam date', () => {
    const study = suggestions.filter((s) => s.category === 'study')
    for (const s of study) {
      const { s: start, e: end } = range(s)
      expect(end - start).toBeLessThanOrEqual(MAX_STUDY_BLOCK)
      const exam = input.assessments.find((a) => a.id === s.assessmentId)
      expect(exam && s.date < exam.date).toBe(true)
    }
    for (const date of new Set(study.map((s) => s.date))) {
      const added = study
        .filter((s) => s.date === date)
        .reduce((n, s) => n + timeToMin(s.end) - timeToMin(s.start), 0)
      expect(added).toBeLessThanOrEqual(input.settings.studyHoursPerDay * 60)
    }
  })

  it('no exam gets more study than was asked for', () => {
    for (const exam of input.assessments) {
      const planned = suggestions
        .filter((s) => s.assessmentId === exam.id)
        .reduce((n, s) => n + timeToMin(s.end) - timeToMin(s.start), 0)
      expect(planned).toBeLessThanOrEqual(
        Math.ceil(
          studyHoursOf(
            exam,
            input.subjects.find((x) => x.id === exam.subjectId),
          ) * 2,
        ) * 30,
      )
    }
  })

  it('a second run gives the same plan', () => {
    expect(planWeek(input)).toEqual(planWeek(input))
  })
})
