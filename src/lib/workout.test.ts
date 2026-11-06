import {
  getSplits,
  exerciseHistory,
  exerciseNames,
  maxWeight,
  newRecords,
  personalRecords,
  proteinOn,
  totalVolume,
  workoutsInWeek,
} from './workout'
import type { Workout } from '../types'

const w = (date: string, ex: [string, number, number][], id = date): Workout => ({
  id,
  date,
  type: 'Test',
  durationMin: 60,
  feeling: 3,
  exercises: ex.map(([name, reps, weight]) => ({ name, sets: [{ reps, weight }] })),
})

describe('workout records', () => {
  const history = [
    w('2026-11-01', [['Bench press', 8, 60]]),
    w('2026-11-03', [
      ['bench press', 5, 65],
      ['Čučanj', 5, 80],
    ]),
  ]
  it('maxWeight is case-insensitive', () => {
    expect(maxWeight(history[1], 'BENCH PRESS')).toBe(65)
  })
  it('personal records per exercise', () => {
    expect(personalRecords(history)).toEqual({ 'bench press': 65, čučanj: 80 })
  })
  it('detects a new record', () => {
    const r = newRecords(w('2026-11-05', [['Bench press', 5, 70]]), history)
    expect(r).toEqual([{ name: 'Bench press', weight: 70, before: 65 }])
  })
  it('equal weight is not a record', () => {
    expect(newRecords(w('2026-11-05', [['Bench press', 5, 65]]), history)).toHaveLength(0)
  })
  it('first time doing an exercise is not a record', () => {
    expect(newRecords(w('2026-11-05', [['Mrtvo dizanje', 5, 100]]), history)).toHaveLength(0)
  })
  it('bodyweight (0 kg) never counts', () => {
    expect(
      newRecords(w('2026-11-05', [['Zgibovi', 10, 0]]), [w('2026-11-01', [['Zgibovi', 8, 0]])]),
    ).toHaveLength(0)
  })
  it('exercise history for the chart is sorted', () => {
    expect(exerciseHistory([history[1], history[0]], 'Bench press')).toEqual([
      { date: '2026-11-01', weight: 60 },
      { date: '2026-11-03', weight: 65 },
    ])
  })
  it('exerciseNames are unique', () => {
    expect(exerciseNames(history)).toHaveLength(2)
  })
  it('workoutsInWeek (Mon-Sun)', () => {
    const list = [
      w('2026-11-01', []),
      w('2026-11-02', []),
      w('2026-11-08', []),
      w('2026-11-09', []),
    ]
    expect(workoutsInWeek(list, '2026-11-05').map((x) => x.date)).toEqual([
      '2026-11-02',
      '2026-11-08',
    ])
  })
  it('total volume', () => {
    expect(totalVolume(w('2026-11-01', [['A', 10, 20]]))).toBe(200)
  })
})

describe('food and splits', () => {
  it('protein per day', () => {
    const meals = [
      { id: '1', date: 'd1', description: 'a', protein: 30 },
      { id: '2', date: 'd1', description: 'b', protein: 25 },
      { id: '3', date: 'd2', description: 'c', protein: 99 },
    ]
    expect(proteinOn(meals, 'd1')).toBe(55)
  })
  it('three ready-made splits with the right number of days', () => {
    expect(getSplits().map((s) => s.days.length)).toEqual([3, 4, 5])
  })
})
