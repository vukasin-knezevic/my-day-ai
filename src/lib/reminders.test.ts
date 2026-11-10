import { setTimeFormat } from './dates'
import { dueReminders } from './reminders'
import { buildIcs } from './ics'
import { hoursByCategory, overview, periodDates } from './overview'
import { emptyData } from './defaults'
import type { Activity, Assessment, AppData } from '../types'

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
const exam = (p: Partial<Assessment> = {}): Assessment => ({
  id: 'e1',
  subjectId: 's',
  type: 'kolokvijum',
  title: 'Kol 1',
  date: '2026-11-12',
  registration: 'nije-prijavljen',
  registrationDeadline: '2026-11-07',
  maxPoints: 30,
  points: null,
  difficulty: 3,
  studyHours: 5,
  ...p,
})
const data = (p: Partial<AppData> = {}): AppData => ({ ...emptyData(), ...p })
const at = (h: number, m: number) => new Date(2026, 10, 6, h, m)

describe('dueReminders', () => {
  it('fires 15 min before an activity', () => {
    const r = dueReminders(data({ activities: [act()] }), at(17, 50), new Set())
    expect(r).toHaveLength(1)
    expect(r[0].body).toContain('18:00')
  })
  it('A-10: the time in the text follows the 12h / 24h setting', () => {
    setTimeFormat('12h')
    try {
      const r = dueReminders(data({ activities: [act()] }), at(17, 50), new Set())
      expect(r[0].body).toMatch(/6:00\s?PM/i)
    } finally {
      setTimeFormat('24h')
    }
  })
  it('does not fire too early, after start, or twice', () => {
    expect(dueReminders(data({ activities: [act()] }), at(17, 0), new Set())).toHaveLength(0)
    expect(dueReminders(data({ activities: [act()] }), at(18, 5), new Set())).toHaveLength(0)
    const first = dueReminders(data({ activities: [act()] }), at(17, 50), new Set())
    expect(
      dueReminders(data({ activities: [act()] }), at(17, 52), new Set(first.map((x) => x.id))),
    ).toHaveLength(0)
  })
  it('ignores suggestions, done and skipped items', () => {
    for (const p of [
      { suggested: true },
      { status: 'done' as const },
      { status: 'skipped' as const },
    ])
      expect(dueReminders(data({ activities: [act(p)] }), at(17, 50), new Set())).toHaveLength(0)
  })
  it('A-04: no deadline entered -> reminder on the assumed day (7 days before) to check the faculty site', () => {
    // exam on Nov 13: assumed deadline Nov 6 (today)
    const d = data({ assessments: [exam({ registrationDeadline: undefined, date: '2026-11-13' })] })
    const r = dueReminders(d, at(9, 30), new Set())
    expect(r).toHaveLength(1)
    expect(r[0].body).toBe('Kol 1: rok za prijavu nije unet. Proveri na sajtu fakulteta.')
    const far = data({
      assessments: [exam({ registrationDeadline: undefined, date: '2026-12-13' })],
    })
    expect(dueReminders(far, at(9, 30), new Set())).toHaveLength(0)
  })
  it('registration deadline reminder tomorrow morning onward', () => {
    const d = data({ assessments: [exam()] })
    expect(dueReminders(d, at(8, 0), new Set())).toHaveLength(0)
    const r = dueReminders(d, at(10, 0), new Set())
    expect(r[0].title).toContain('Prijava')
    expect(
      dueReminders(
        data({ assessments: [exam({ registration: 'prijavljen' })] }),
        at(10, 0),
        new Set(),
      ),
    ).toHaveLength(0)
  })
  it('bedtime reminder 30 min before, also after midnight', () => {
    const d = data()
    d.settings.bedTime = '01:00'
    expect(dueReminders(d, at(0, 40), new Set())[0].title).toContain('spavanje')
    expect(dueReminders(d, at(22, 0), new Set())).toHaveLength(0)
    d.settings.bedTime = '23:30'
    expect(dueReminders(d, at(23, 10), new Set())).toHaveLength(1)
  })
})

describe('buildIcs folding', () => {
  const data = emptyData()
  const title = 'Učenje šđčćž 📚 '.repeat(12).trim()
  data.activities = [
    {
      id: 'a',
      title,
      category: 'study',
      date: '2026-11-06',
      start: '10:00',
      end: '11:00',
      recurrence: 'none',
      status: 'planned',
      source: 'me',
    },
  ]
  const ics = buildIcs(data, new Date(2026, 10, 6, 9), 1)
  it('no line is longer than 75 octets, even with Serbian letters and emoji', () => {
    const utf8 = new TextEncoder()
    for (const line of ics.split('\r\n')) expect(utf8.encode(line).length).toBeLessThanOrEqual(75)
  })
  it('unfolding gives back the whole text', () => {
    expect(ics.replace(/\r\n /g, '')).toContain(`SUMMARY:${title}`)
  })
})

describe('buildIcs', () => {
  const ics = buildIcs(
    data({ activities: [act()], assessments: [exam({ time: '10:00' })] }),
    at(9, 0),
    7,
  )
  it('is a valid-looking calendar with CRLF lines', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('VERSION:2.0')
  })
  it('contains the activity with local time and an alarm', () => {
    expect(ics).toContain('DTSTART:20261106T180000')
    expect(ics).toContain('DTEND:20261106T193000')
    expect(ics).toContain('TRIGGER:-PT15M')
  })
  it('contains exam and registration deadline (all-day)', () => {
    expect(ics).toContain('DTSTART:20261112T100000')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261107')
    expect(ics).toContain('Rok za prijavu')
  })
  it('skips suggestions and escapes special characters', () => {
    const x = buildIcs(
      data({
        activities: [
          act({ suggested: true }),
          act({ id: 'b', title: 'A, B; C', date: '2026-11-07' }),
        ],
      }),
      at(9, 0),
      7,
    )
    expect(x).toContain('A\\, B\\; C')
    expect(x.match(/BEGIN:VEVENT/g)).toHaveLength(1)
  })
  it('folds long lines', () => {
    const x = buildIcs(data({ activities: [act({ title: 'x'.repeat(200) })] }), at(9, 0), 1)
    expect(x.split('\r\n').every((l) => l.length <= 75)).toBe(true)
  })
})

describe('overview', () => {
  it('period dates', () => {
    expect(periodDates('week', '2026-11-06')).toHaveLength(7)
    expect(periodDates('month', '2026-11-06')).toHaveLength(30)
    expect(periodDates('month', '2026-02-10')).toHaveLength(28)
  })
  it('hours per category skip skipped items and suggestions', () => {
    const d = data({
      activities: [
        act(),
        act({ id: 'b', status: 'skipped' }),
        act({ id: 'c', suggested: true }),
        act({ id: 'd', category: 'study', start: '10:00', end: '12:00' }),
      ],
    })
    const h = hoursByCategory(d, ['2026-11-06'])
    expect(h.workout).toBe(1.5)
    expect(h.study).toBe(2)
  })
  it('week stats: workouts, spending, XP, sleep', () => {
    const d = data({
      workouts: [
        { id: 'w', date: '2026-11-05', type: 't', durationMin: 60, exercises: [], feeling: 3 },
      ],
      expenses: [
        { id: 'x1', date: '2026-11-04', amount: 300, category: 'hrana', description: '' },
        { id: 'x2', date: '2026-10-30', amount: 999, category: 'hrana', description: '' },
      ],
      sleep: [
        {
          id: 's',
          date: '2026-11-06',
          bedtime: '2026-11-05T23:00:00',
          wakeTime: '2026-11-06T07:00:00',
          quality: 4,
          source: 'manual',
        },
      ],
    })
    d.progress.events = [{ id: 'e', date: '2026-11-05', reason: 'x', xp: 30, category: 'workout' }]
    const o = overview(d, 'week', '2026-11-06')
    expect(o.workouts.done).toBe(1)
    expect(o.spent).toBe(300)
    expect(o.spentByCategory.hrana).toBe(300)
    expect(o.xp).toBe(30)
    expect(o.avgSleep).toBe(8)
  })
  it('month scales the weekly workout goal', () => {
    const d = data()
    d.settings.workoutsPerWeek = 4
    expect(overview(d, 'month', '2026-11-06').workouts.goal).toBe(17)
  })
})
