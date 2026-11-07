import { emptyData } from './defaults'
import {
  buildAlerts,
  currentAndNext,
  daySummary,
  freeSlots,
  occurrencesOn,
  withStatus,
  withoutOccurrence,
} from './schedule'
import type { Activity, Assessment, Subject } from '../types'

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
