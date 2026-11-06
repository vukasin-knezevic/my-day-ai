import { gradeFor, subjectPoints } from './grades'
import {
  countdownLabel,
  monthRegistrations,
  nextWeekStart,
  slotsToAsk,
  sortAssessments,
  unansweredSlots,
  unregisteredIn,
  urgency,
} from './exams'
import type { Assessment, Subject } from '../types'

const subj = (p: Partial<Subject> = {}): Subject => ({
  id: 's',
  name: 'M',
  color: '#000',
  espb: 6,
  passMark: 51,
  slots: [],
  ...p,
})
const asm = (p: Partial<Assessment> = {}): Assessment => ({
  id: Math.random().toString(),
  subjectId: 's',
  type: 'kolokvijum',
  title: 'K',
  date: '2026-11-20',
  registration: 'nije-prijavljen',
  maxPoints: 30,
  points: null,
  difficulty: 3,
  studyHours: 5,
  ...p,
})

describe('gradeFor', () => {
  it.each([
    [0, 5],
    [50, 5],
    [51, 6],
    [60, 6],
    [61, 7],
    [70, 7],
    [71, 8],
    [80, 8],
    [81, 9],
    [90, 9],
    [91, 10],
    [100, 10],
  ])('%i points -> %i', (p, g) => expect(gradeFor(p)).toBe(g))
  it('respects a custom pass mark', () => {
    expect(gradeFor(45, 40)).toBe(6)
    expect(gradeFor(39, 40)).toBe(5)
  })
})

describe('subjectPoints', () => {
  it('sums earned points and computes what is missing', () => {
    const r = subjectPoints(subj(), [
      asm({ points: 20 }),
      asm({ points: 15 }),
      asm({ maxPoints: 50 }),
    ])
    expect(r.earned).toBe(35)
    expect(r.maxGraded).toBe(60)
    expect(r.missingToPass).toBe(16)
    expect(r.remaining).toBe(50)
    expect(r.canPass).toBe(true)
    expect(r.grade).toBe(5)
  })
  it('passed subject', () => {
    const r = subjectPoints(subj(), [asm({ points: 65, maxPoints: 100 })])
    expect(r.missingToPass).toBe(0)
    expect(r.grade).toBe(7)
  })
  it('cannot pass anymore', () => {
    const r = subjectPoints(subj(), [asm({ points: 5, maxPoints: 40 }), asm({ maxPoints: 20 })])
    expect(r.canPass).toBe(false)
  })
  it('no graded work -> no grade; other subjects ignored', () => {
    const r = subjectPoints(subj(), [asm({ subjectId: 'other', points: 50 })])
    expect(r.grade).toBeNull()
    expect(r.earned).toBe(0)
  })
})

describe('exams helpers', () => {
  it('urgency', () => {
    expect(urgency('2026-11-05', '2026-11-06')).toBe('past')
    expect(urgency('2026-11-07', '2026-11-06')).toBe('red')
    expect(urgency('2026-11-12', '2026-11-06')).toBe('orange')
    expect(urgency('2026-11-18', '2026-11-06')).toBe('yellow')
    expect(urgency('2026-12-18', '2026-11-06')).toBe('green')
  })
  it('countdown label', () => {
    expect(countdownLabel('2026-11-06', '2026-11-06')).toBe('danas')
    expect(countdownLabel('2026-11-07', '2026-11-06')).toBe('sutra')
    expect(countdownLabel('2026-11-10', '2026-11-06')).toBe('za 4 d')
  })
  it('month registrations list only exams of that month', () => {
    const list = [
      asm({ date: '2026-11-25' }),
      asm({ date: '2026-12-02' }),
      asm({ date: '2026-11-10', type: 'ispit' }),
      asm({ date: '2026-11-11', type: 'domaci' }),
    ]
    const r = monthRegistrations(list, '2026-11')
    expect(r.map((x) => x.date)).toEqual(['2026-11-10', '2026-11-25'])
    expect(unregisteredIn(list, '2026-11')).toHaveLength(2)
    expect(unregisteredIn([asm({ registration: 'prijavljen' })], '2026-11')).toHaveLength(0)
  })
  it('sortAssessments puts past ones last', () => {
    const r = sortAssessments(
      [asm({ date: '2026-11-01' }), asm({ date: '2026-11-20' }), asm({ date: '2026-11-08' })],
      '2026-11-06',
    )
    expect(r.map((x) => x.date)).toEqual(['2026-11-08', '2026-11-20', '2026-11-01'])
  })
  it('weekly question for "ponekad"', () => {
    expect(nextWeekStart('2026-11-08')).toBe('2026-11-09')
    const s = subj({
      slots: [
        { id: 'a', kind: 'vezbe', day: 2, start: '10:00', end: '11:00', attendance: 'ponekad' },
        {
          id: 'b',
          kind: 'vezbe',
          day: 3,
          start: '10:00',
          end: '11:00',
          attendance: 'ponekad',
          askedWeek: '2026-11-09',
        },
        { id: 'c', kind: 'vezbe', day: 4, start: '10:00', end: '11:00', attendance: null },
      ],
    })
    expect(slotsToAsk([s], '2026-11-08').map((x) => x.slot.id)).toEqual(['a'])
    expect(unansweredSlots([s]).map((x) => x.slot.id)).toEqual(['c'])
  })
})
