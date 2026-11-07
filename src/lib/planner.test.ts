import { planWeek, MAX_STUDY_BLOCK, BREAK_MIN, type PlanInput } from './planner'
import { timeToMin } from './dates'
import type { Activity, Assessment, Subject } from '../types'

const MON = '2026-11-02' // Monday

const subject = (slots: Subject['slots'] = []): Subject => ({
  id: 's1',
  name: 'Mata',
  color: '#00f',
  espb: 6,
  passMark: 51,
  slots,
})
const exam = (p: Partial<Assessment> = {}): Assessment => ({
  id: 'e1',
  subjectId: 's1',
  type: 'kolokvijum',
  title: 'Kol 1',
  date: '2026-11-06',
  registration: 'prijavljen',
  maxPoints: 30,
  points: null,
  difficulty: 4,
  studyHours: 8,
  ...p,
})
const act = (p: Partial<Activity> = {}): Activity => ({
  id: 'a1',
  title: 'Trening',
  category: 'workout',
  date: '2026-11-05',
  start: '18:00',
  end: '20:00',
  recurrence: 'none',
  status: 'planned',
  source: 'me',
  ...p,
})
const input = (p: Partial<PlanInput> = {}): PlanInput => ({
  from: MON,
  settings: {
    wakeTime: '09:00',
    bedTime: '01:00',
    studyHoursPerDay: 3,
    workoutsPerWeek: 3,
    rewardMinPerStudyHour: 30,
    rewardName: 'Serija',
  },
  subjects: [subject()],
  assessments: [exam()],
  activities: [],
  ...p,
})
const mins = (a: { start: string; end: string }) => timeToMin(a.end) - timeToMin(a.start)
const study = (r: ReturnType<typeof planWeek>) =>
  r.suggestions.filter((s) => s.category === 'study')

describe('planWeek: basics', () => {
  it('all suggestions are marked as suggestions (dashed until accepted)', () => {
    const r = planWeek(input())
    expect(r.suggestions.length).toBeGreaterThan(0)
    expect(r.suggestions.every((s) => s.suggested === true)).toBe(true)
  })
  it('is deterministic', () => {
    expect(planWeek(input())).toEqual(planWeek(input()))
  })
  it('respects the number of days', () => {
    const r = planWeek(input({ days: 2 }))
    expect(r.suggestions.every((s) => s.date <= '2026-11-03')).toBe(true)
  })
  it('by default plans until Sunday', () => {
    const r = planWeek(input({ from: '2026-11-04' }))
    expect(r.suggestions.every((s) => s.date >= '2026-11-04' && s.date <= '2026-11-08')).toBe(true)
  })
  it('no exams -> no study blocks, workouts still planned', () => {
    const r = planWeek(input({ assessments: [] }))
    expect(study(r)).toHaveLength(0)
    expect(r.suggestions.filter((s) => s.category === 'workout')).toHaveLength(3)
  })
})

describe('planWeek: study', () => {
  it('study only before the exam day', () => {
    expect(study(planWeek(input())).every((s) => s.date < '2026-11-06')).toBe(true)
  })
  it('exam today or in the past gets no study blocks', () => {
    expect(study(planWeek(input({ assessments: [exam({ date: MON })] })))).toHaveLength(0)
    expect(study(planWeek(input({ assessments: [exam({ date: '2026-10-30' })] })))).toHaveLength(0)
  })
  it('plans the full requested hours when there is room', () => {
    const total = study(planWeek(input())).reduce((n, s) => n + mins(s), 0)
    expect(total).toBe(8 * 60)
  })
  it('spreads study over multiple days', () => {
    const days = new Set(study(planWeek(input())).map((s) => s.date))
    expect(days.size).toBeGreaterThanOrEqual(3)
  })
  it('harder exam starts earlier than an easy one with the same hours', () => {
    const base = { from: MON, days: 14 }
    const hard = study(
      planWeek(
        input({
          ...base,
          assessments: [exam({ date: '2026-11-12', difficulty: 5, studyHours: 10 })],
        }),
      ),
    )
    const easy = study(
      planWeek(
        input({
          ...base,
          assessments: [exam({ date: '2026-11-12', difficulty: 1, studyHours: 10 })],
        }),
      ),
    )
    expect(hard[0].date < easy[0].date).toBe(true)
  })
  it('easy exam ramps up towards the exam', () => {
    const r = study(planWeek(input({ assessments: [exam({ difficulty: 1, studyHours: 6 })] })))
    const byDay = new Map<string, number>()
    r.forEach((s) => byDay.set(s.date, (byDay.get(s.date) ?? 0) + mins(s)))
    const v = [...byDay.entries()].sort().map((x) => x[1])
    expect(v[v.length - 1]).toBeGreaterThanOrEqual(v[0])
  })
  it('a single block is never longer than 3 h (limit is 2 h)', () => {
    const r = study(planWeek(input({ assessments: [exam({ studyHours: 12 })] })))
    expect(Math.max(...r.map(mins))).toBeLessThanOrEqual(MAX_STUDY_BLOCK)
    expect(MAX_STUDY_BLOCK).toBeLessThanOrEqual(180)
  })
  it('breaks between study blocks on the same day', () => {
    const r = study(planWeek(input({ assessments: [exam({ studyHours: 12 })] })))
    for (const d of new Set(r.map((s) => s.date))) {
      const day = r.filter((s) => s.date === d).sort((a, b) => a.start.localeCompare(b.start))
      for (let i = 1; i < day.length; i++) {
        expect(timeToMin(day[i].start) - timeToMin(day[i - 1].end)).toBeGreaterThanOrEqual(
          BREAK_MIN,
        )
      }
    }
  })
  it('daily study cap from settings', () => {
    const r = study(planWeek(input({ assessments: [exam({ studyHours: 20 })] })))
    for (const d of new Set(r.map((s) => s.date))) {
      const total = r.filter((s) => s.date === d).reduce((n, s) => n + mins(s), 0)
      expect(total).toBeLessThanOrEqual(180)
    }
  })
  it('existing study activity counts toward the daily cap', () => {
    const existing = act({
      id: 'x',
      category: 'study',
      date: MON,
      start: '10:00',
      end: '12:00',
      title: 'Moje učenje',
    })
    const r = study(
      planWeek(input({ activities: [existing], assessments: [exam({ studyHours: 20 })] })),
    )
    const monday = r.filter((s) => s.date === MON).reduce((n, s) => n + mins(s), 0)
    expect(monday).toBeLessThanOrEqual(60)
  })
  it('warns when there is not enough time', () => {
    const r = planWeek(input({ from: '2026-11-04', assessments: [exam({ studyHours: 100 })] }))
    expect(r.notes.some((n) => n.includes('ne stiže'))).toBe(true)
  })
})

describe('planWeek: day boundaries and free time', () => {
  it('nothing before wake-up or after bedtime', () => {
    const r = planWeek(
      input({ settings: { ...input().settings, wakeTime: '09:00', bedTime: '23:00' } }),
    )
    for (const s of r.suggestions) {
      expect(timeToMin(s.start)).toBeGreaterThanOrEqual(9 * 60)
      expect(timeToMin(s.end)).toBeLessThanOrEqual(23 * 60)
    }
  })
  it('bedtime after midnight is capped at the end of the day', () => {
    const r = planWeek(input())
    expect(r.suggestions.every((s) => timeToMin(s.end) <= 1439)).toBe(true)
  })
  it('does not overlap fixed classes ("idem")', () => {
    const subj = subject([
      { id: 'c', kind: 'predavanje', day: 1, start: '10:00', end: '17:00', attendance: 'idem' },
    ])
    const r = planWeek(input({ subjects: [subj] }))
    const monday = r.suggestions.filter((s) => s.date === MON)
    for (const s of monday) {
      const overlaps = timeToMin(s.start) < 17 * 60 && timeToMin(s.end) > 10 * 60
      expect(overlaps).toBe(false)
    }
  })
  it('uses "ne idem" slots as free time first', () => {
    const subj = subject([
      { id: 'c', kind: 'vezbe', day: 1, start: '12:00', end: '14:00', attendance: 'ne-idem' },
    ])
    const r = planWeek(input({ subjects: [subj] }))
    const first = study(r).find((s) => s.date === MON)!
    expect(first.start).toBe('12:00')
  })
  it('does not overlap existing activities', () => {
    const busy = act({
      id: 'b',
      category: 'habits',
      date: MON,
      start: '09:30',
      end: '15:00',
      title: 'Posao',
    })
    const r = planWeek(input({ activities: [busy] }))
    for (const s of r.suggestions.filter((x) => x.date === MON)) {
      expect(timeToMin(s.start) >= 15 * 60 || timeToMin(s.end) <= 9 * 60 + 30).toBe(true)
    }
  })
  it('old pending suggestions are ignored (replaced)', () => {
    const old = act({
      id: 'o',
      category: 'study',
      date: MON,
      start: '12:00',
      end: '14:00',
      suggested: true,
    })
    const withOld = planWeek(input({ activities: [old] }))
    expect(withOld).toEqual(planWeek(input()))
  })
  it('cancelled (skipped) activities free the time', () => {
    const skipped = act({
      id: 's',
      category: 'habits',
      date: MON,
      start: '09:30',
      end: '23:00',
      status: 'skipped',
    })
    expect(study(planWeek(input({ activities: [skipped] }))).length).toBeGreaterThan(0)
  })
})

describe('planWeek: workouts and the exam eve', () => {
  it('shortens an existing workout on the exam eve and explains why', () => {
    const r = planWeek(input({ activities: [act()] })) // Thursday 18-20, exam Friday
    expect(r.adjustments).toHaveLength(1)
    expect(r.adjustments[0]).toMatchObject({
      activityId: 'a1',
      date: '2026-11-05',
      newEnd: '18:45',
    })
    expect(r.adjustments[0].reason).toContain('kolokvijum')
    expect(r.notes.some((n) => n.includes('skraćen'))).toBe(true)
  })
  it('does not touch a workout that is already short', () => {
    const r = planWeek(input({ activities: [act({ end: '18:40' })] }))
    expect(r.adjustments).toHaveLength(0)
  })
  it('no new workouts on exam day or the day before', () => {
    const w = planWeek(input()).suggestions.filter((s) => s.category === 'workout')
    expect(w.some((s) => s.date === '2026-11-05' || s.date === '2026-11-06')).toBe(false)
  })
  it('plans the number of workouts from settings, minus existing ones', () => {
    expect(
      planWeek(input({ assessments: [] })).suggestions.filter((s) => s.category === 'workout'),
    ).toHaveLength(3)
    const withOne = planWeek(input({ assessments: [], activities: [act({ date: MON })] }))
    expect(withOne.suggestions.filter((s) => s.category === 'workout')).toHaveLength(2)
  })
  it('spreads workouts (no two in a row when avoidable)', () => {
    const days = planWeek(input({ assessments: [] }))
      .suggestions.filter((s) => s.category === 'workout')
      .map((s) => s.date)
      .sort()
    for (let i = 1; i < days.length; i++) {
      expect(new Date(days[i]).getTime() - new Date(days[i - 1]).getTime()).toBeGreaterThan(
        86400000,
      )
    }
  })
})

describe('planWeek: easy day and games', () => {
  it('has at least one easy day without exam, with little study and no new workout', () => {
    const r = planWeek(input({ assessments: [exam({ studyHours: 20 })] }))
    expect(r.easyDay).not.toBeNull()
    const d = r.easyDay!
    expect(d).not.toBe('2026-11-06')
    expect(
      study(r)
        .filter((s) => s.date === d)
        .reduce((n, s) => n + mins(s), 0),
    ).toBeLessThanOrEqual(60)
    expect(r.suggestions.some((s) => s.date === d && s.category === 'workout')).toBe(false)
  })
  it('no easy day when planning fewer than 3 days', () => {
    expect(planWeek(input({ days: 2 })).easyDay).toBeNull()
  })
  it('the reward suggestion uses the name the user chose', () => {
    const r = planWeek(input())
    const games = r.suggestions.filter((s) => s.category === 'games')
    expect(games.length).toBeGreaterThan(0)
    expect(games.every((g) => g.title.startsWith('Serija'))).toBe(true)
  })
  it('games are suggested as a reward after the last study block', () => {
    const r = planWeek(input())
    const games = r.suggestions.filter((s) => s.category === 'games')
    expect(games.length).toBeGreaterThan(0)
    for (const g of games) {
      const lastStudyEnd = Math.max(
        ...study(r)
          .filter((s) => s.date === g.date)
          .map((s) => timeToMin(s.end)),
      )
      expect(timeToMin(g.start)).toBeGreaterThanOrEqual(lastStudyEnd)
      expect(mins(g)).toBeLessThanOrEqual(120)
    }
  })
  it('no games on the exam eve', () => {
    const r = planWeek(input())
    expect(r.suggestions.some((s) => s.category === 'games' && s.date === '2026-11-05')).toBe(false)
  })
  it('no games without studying', () => {
    expect(
      planWeek(input({ assessments: [] })).suggestions.some((s) => s.category === 'games'),
    ).toBe(false)
  })
})

describe('regressions', () => {
  const base2 = {
    settings: {
      wakeTime: '07:00',
      bedTime: '23:00',
      studyHoursPerDay: 4,
      workoutsPerWeek: 0,
      rewardMinPerStudyHour: 0,
      rewardName: '',
    },
    subjects: [],
    activities: [],
  }
  const lateExam = exam({ date: '2026-11-13', difficulty: 5, studyHours: 12 })
  it('does not suggest anything earlier than the current time today', () => {
    const r = planWeek({ ...base2, from: '2026-11-09', assessments: [lateExam], nowMin: 20 * 60 })
    const today = r.suggestions.filter((s) => s.date === '2026-11-09')
    expect(today.length).toBeGreaterThan(0)
    for (const s of today) expect(s.start >= '20:00').toBe(true)
  })
  it('does not overlap pending AI suggestions, which regenerating keeps', () => {
    const ai = {
      id: 'ai1',
      title: 'AI blok',
      category: 'study' as const,
      date: '2026-11-09',
      start: '07:30',
      end: '20:00',
      recurrence: 'none' as const,
      status: 'planned' as const,
      source: 'ai' as const,
      suggested: true,
    }
    const r = planWeek({ ...base2, from: '2026-11-09', assessments: [lateExam], activities: [ai] })
    for (const s of r.suggestions.filter((x) => x.date === ai.date))
      expect(s.start >= ai.end || s.end <= ai.start).toBe(true)
  })
})
