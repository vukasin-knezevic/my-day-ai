import { emptyData } from './defaults'
import {
  buildAlerts,
  currentAndNext,
  daySpan,
  daySummary,
  inDayOrder,
  type Occurrence,
  freeSlots,
  occurrencesOn,
  patchOccurrence,
  hasSlot,
  withStatus,
  withoutOccurrence,
} from './schedule'
import type { Activity, Assessment, Subject } from '../types'
import { durationMin } from './dates'

const act = (p: Partial<Activity> = {}): Activity => ({
  id: 'a1',
  title: 'Trening',
  category: 'workout',
  date: '2026-11-06',
  start: '18:00',
  end: '19:30',
  recurrence: 'none',
  status: 'planned',
  source: 'me',
  ...p,
})
const subject: Subject = {
  id: 's1',
  name: 'Mata',
  color: '#00f',
  espb: 6,
  passMark: 51,
  slots: [
    { id: 'x1', kind: 'predavanje', day: 1, start: '10:00', end: '12:00', attendance: 'idem' },
    { id: 'x2', kind: 'vezbe', day: 1, start: '12:00', end: '13:00', attendance: 'ne-idem' },
    {
      id: 'x3',
      kind: 'vezbe',
      day: 1,
      start: '14:00',
      end: '15:00',
      attendance: 'ponekad',
      attendingWeeks: ['2026-11-09'],
    },
  ],
}
const exam = (p: Partial<Assessment> = {}): Assessment => ({
  id: 'e1',
  subjectId: 's1',
  type: 'kolokvijum',
  title: 'Kol 1',
  date: '2026-11-12',
  registration: 'nije-prijavljen',
  registrationDeadline: '2026-11-08',
  maxPoints: 30,
  points: null,
  difficulty: 3,
  studyHours: 5,
  ...p,
})

describe('occurrencesOn', () => {
  it('one-off activity only on its date', () => {
    const d = { activities: [act()], subjects: [] }
    expect(occurrencesOn(d, '2026-11-06')).toHaveLength(1)
    expect(occurrencesOn(d, '2026-11-07')).toHaveLength(0)
  })
  it('recurrence: daily, weekdays, weekly', () => {
    const daily = { activities: [act({ recurrence: 'daily' })], subjects: [] }
    expect(occurrencesOn(daily, '2026-11-08')).toHaveLength(1)
    expect(occurrencesOn(daily, '2026-11-05')).toHaveLength(0)
    const wk = { activities: [act({ recurrence: 'weekdays' })], subjects: [] }
    expect(occurrencesOn(wk, '2026-11-07')).toHaveLength(0) // Saturday
    expect(occurrencesOn(wk, '2026-11-09')).toHaveLength(1)
    const weekly = { activities: [act({ recurrence: 'weekly' })], subjects: [] }
    expect(occurrencesOn(weekly, '2026-11-13')).toHaveLength(1)
    expect(occurrencesOn(weekly, '2026-11-12')).toHaveLength(0)
  })
  it('classes: idem yes, ne-idem no, ponekad only confirmed weeks', () => {
    const d = { activities: [], subjects: [subject] }
    expect(occurrencesOn(d, '2026-11-09').map((o) => o.start)).toEqual(['10:00', '14:00'])
    expect(occurrencesOn(d, '2026-11-16').map((o) => o.start)).toEqual(['10:00'])
  })
  it('ne-idem slots are free time', () => {
    expect(freeSlots([subject], '2026-11-09')).toHaveLength(1)
    expect(freeSlots([subject], '2026-11-10')).toHaveLength(0)
  })
  it('sorted by start', () => {
    const d = { activities: [act({ start: '09:00', end: '10:00' })], subjects: [subject] }
    const r = occurrencesOn(d, '2026-11-06')
    expect(r[0].start).toBe('09:00')
  })
})

describe('withStatus', () => {
  it('one-off changes status', () => {
    expect(withStatus(act(), '2026-11-06', 'done').status).toBe('done')
  })
  it('recurring tracks dates separately', () => {
    const a = withStatus(act({ recurrence: 'daily' }), '2026-11-07', 'done')
    const d = { activities: [a], subjects: [] }
    expect(occurrencesOn(d, '2026-11-07')[0].status).toBe('done')
    expect(occurrencesOn(d, '2026-11-08')[0].status).toBe('planned')
    const b = withStatus(a, '2026-11-07', 'skipped')
    expect(b.doneDates).toEqual([])
    expect(b.skippedDates).toEqual(['2026-11-07'])
  })
})

describe('currentAndNext', () => {
  const occ = occurrencesOn({ activities: [act()], subjects: [] }, '2026-11-06')
  it('before', () => {
    const r = currentAndNext(occ, 17 * 60)
    expect(r.current).toBeNull()
    expect(r.minutesToNext).toBe(60)
  })
  it('during', () => {
    expect(currentAndNext(occ, 18 * 60 + 10).current?.title).toBe('Trening')
  })
})

describe('buildAlerts', () => {
  it('unregistered exam with deadline in 7 days is red', () => {
    const data = { ...emptyData(), subjects: [subject], assessments: [exam()] }
    const a = buildAlerts(data, '2026-11-06')
    expect(a.some((x) => x.level === 'red' && x.text.includes('Neprijavljen'))).toBe(true)
  })
  it('registered exam gives no registration alert', () => {
    const data = { ...emptyData(), assessments: [exam({ registration: 'prijavljen' })] }
    expect(buildAlerts(data, '2026-11-06')).toHaveLength(0)
  })
  it('deadline far away gives no alert', () => {
    const data = {
      ...emptyData(),
      assessments: [exam({ registrationDeadline: '2026-12-20', date: '2026-12-25' })],
    }
    expect(buildAlerts(data, '2026-11-06')).toHaveLength(0)
  })
  it('missed registration deadline', () => {
    const data = { ...emptyData(), assessments: [exam({ registrationDeadline: '2026-11-01' })] }
    expect(buildAlerts(data, '2026-11-06')[0].text).toContain('prošao')
  })
  it('A-04: an exam WITHOUT a deadline still warns: assumed 7 days before, "check the faculty site"', () => {
    const noDeadline = exam({ registrationDeadline: undefined, date: '2026-11-20' })
    const data = { ...emptyData(), subjects: [subject], assessments: [noDeadline] }
    // 15 days before the exam: the assumed deadline is 8 days away, nothing yet
    expect(buildAlerts(data, '2026-11-05')).toHaveLength(0)
    const a = buildAlerts(data, '2026-11-06')
    expect(a).toHaveLength(1)
    expect(a[0]).toMatchObject({ id: `reg-${noDeadline.id}`, level: 'red' })
    expect(a[0].text).toContain('Neprijavljen')
    expect(a[0].text).toContain('rok nije unet, proveri na sajtu fakulteta')
    // it stays until the exam, because nobody knows when the real deadline is
    expect(buildAlerts(data, '2026-11-18').some((x) => x.text.includes('rok nije unet'))).toBe(true)
    expect(buildAlerts(data, '2026-11-21')).toHaveLength(0)
    // registered: quiet
    const ok = { ...data, assessments: [{ ...noDeadline, registration: 'prijavljen' as const }] }
    expect(buildAlerts(ok, '2026-11-10')).toHaveLength(0)
  })
  it('homework due tomorrow', () => {
    const data = {
      ...emptyData(),
      assessments: [exam({ type: 'domaci', date: '2026-11-07', registration: 'ne-treba' })],
    }
    expect(buildAlerts(data, '2026-11-06')[0].level).toBe('red')
  })
  it('short sleep warns', () => {
    const data = {
      ...emptyData(),
      sleep: [
        {
          id: 'z',
          date: '2026-11-06',
          bedtime: '2026-11-06T03:00:00',
          wakeTime: '2026-11-06T08:00:00',
          quality: 2 as const,
          source: 'manual' as const,
        },
      ],
    }
    expect(buildAlerts(data, '2026-11-06').some((a) => a.id === 'sleep')).toBe(true)
  })
})

describe('daySummary', () => {
  it('describes the day', () => {
    const occ = occurrencesOn(
      {
        activities: [act(), act({ id: 'b', category: 'study', start: '10:00', end: '12:00' })],
        subjects: [],
      },
      '2026-11-06',
    )
    expect(daySummary(occ)).toBe('Danas: trening, 2 h učenja')
  })
  it('free day', () => {
    expect(daySummary([])).toContain('slobodan')
  })
})

describe('withoutOccurrence', () => {
  it('removes only the chosen day of a recurring activity', () => {
    const a = withoutOccurrence(act({ recurrence: 'daily' }), '2026-11-07')
    const d = { activities: [a], subjects: [] }
    expect(occurrencesOn(d, '2026-11-07')).toHaveLength(0)
    expect(occurrencesOn(d, '2026-11-08')).toHaveLength(1)
    expect(occurrencesOn(d, '2026-11-08')[0].recurring).toBe(true)
  })
})

describe('patchOccurrence', () => {
  it('patches a one-off in place', () => {
    const r = patchOccurrence(act(), '2026-11-06', { end: '18:45' })
    expect(r.updated.end).toBe('18:45')
    expect(r.single).toBeNull()
  })
  it('changes one day of a series and leaves the other days alone', () => {
    const series = act({ recurrence: 'weekly', doneDates: ['2026-11-06'] })
    const { updated, single } = patchOccurrence(series, '2026-11-13', { end: '18:45' })
    const d = { activities: [updated, { ...single!, id: 'one' }], subjects: [] }
    expect(occurrencesOn(d, '2026-11-13').map((o) => o.end)).toEqual(['18:45'])
    expect(occurrencesOn(d, '2026-11-20').map((o) => o.end)).toEqual(['19:30'])
    expect(occurrencesOn(d, '2026-11-06')[0].status).toBe('done')
    expect(single!.doneDates).toBeUndefined()
  })
})

describe('hasSlot', () => {
  const s = { kind: 'vezbe' as const, day: 2 as const, start: '10:00', end: '12:00' }
  it('finds the same kind, day and time only', () => {
    const slots = [{ ...s, id: 'a', attendance: null }]
    expect(hasSlot(slots, s)).toBe(true)
    expect(hasSlot(slots, { ...s, kind: 'predavanje' })).toBe(false)
    expect(hasSlot(slots, { ...s, start: '11:00' })).toBe(false)
  })
})

describe('A-16: activities after midnight', () => {
  const day = { wakeTime: '09:00', bedTime: '01:00' }
  const o = (start: string, end: string, extra: Partial<Occurrence> = {}): Occurrence => ({
    key: `${start}-${end}`,
    title: start,
    category: 'games',
    date: '2026-11-06',
    start,
    end,
    status: 'planned',
    suggested: false,
    type: 'activity',
    ...extra,
  })

  it('an end before the start is on the next day', () => {
    expect(daySpan(o('22:00', '01:00'))).toEqual({ start: 1320, end: 1500 })
    expect(durationMin('22:00', '01:00')).toBe(180)
    expect(durationMin('10:00', '11:30')).toBe(90)
  })

  it('for a night owl, 00:15 is the end of the day, not its start', () => {
    expect(daySpan(o('00:15', '00:45'), day)).toEqual({ start: 1455, end: 1485 })
    // early morning before the wake-up stays where it is
    expect(daySpan(o('06:00', '07:00'), day)).toEqual({ start: 360, end: 420 })
    // someone who goes to bed before midnight: nothing moves
    expect(daySpan(o('00:15', '00:45'), { wakeTime: '07:00', bedTime: '23:00' }).start).toBe(15)
    expect(inDayOrder([o('00:15', '00:45'), o('10:00', '11:00')], day).map((x) => x.start)).toEqual(
      ['10:00', '00:15'],
    )
  })

  it('"now" at 23:30 inside 22:00-01:00, and still at 00:30 the next calendar day', () => {
    const party = o('22:00', '01:00')
    expect(currentAndNext([party], 23 * 60 + 30, { day }).current).toBe(party)
    expect(currentAndNext([], 30, { day, yesterday: [party] }).current).toBe(party)
    expect(currentAndNext([], 61, { day, yesterday: [party] }).current).toBeNull()
  })

  it('00:15 entered for today is "next" at 00:05, not tomorrow night', () => {
    const late = o('00:15', '00:45')
    const r = currentAndNext([late], 5, { day })
    expect(r.next).toBe(late)
    expect(r.minutesToNext).toBe(10)
    // in the afternoon the same entry is the end of this day
    expect(currentAndNext([late], 15 * 60, { day }).minutesToNext).toBe(1455 - 900)
  })

  it('done and suggested ones from yesterday are not "now"', () => {
    const done = o('22:00', '01:00', { status: 'done' })
    expect(currentAndNext([], 30, { day, yesterday: [done] }).current).toBeNull()
  })
})
