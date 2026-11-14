import { clampGoal, goalReached, planStepReminders, ringFraction } from './steps'

const base = {
  enabled: true,
  steps: 2000,
  goal: 10000,
  nowMin: 9 * 60,
  bedTime: '01:00',
  wakeTime: '09:00',
  otherToday: 0,
}

describe('steps', () => {
  it('goal is clamped to 1 000 - 50 000', () => {
    expect(clampGoal(10)).toBe(1000)
    expect(clampGoal(99999)).toBe(50000)
    expect(clampGoal(7500)).toBe(7500)
    expect(clampGoal(NaN)).toBe(10000)
  })
  it('goal reached exactly at the goal', () => {
    expect(goalReached(9999, 10000)).toBe(false)
    expect(goalReached(10000, 10000)).toBe(true)
  })
  it('the ring never goes over 1 and never divides by 0', () => {
    expect(ringFraction(5000, 10000)).toBe(0.5)
    expect(ringFraction(30000, 10000)).toBe(1)
    expect(ringFraction(5, 0)).toBe(0)
  })
})

describe('planStepReminders', () => {
  it('plans 12, 16 and 20 when nothing has passed', () => {
    expect(planStepReminders(base).map((r) => r.time)).toEqual(['12:00', '16:00', '20:00'])
  })
  it('only the ones still to come', () => {
    expect(planStepReminders({ ...base, nowMin: 14 * 60 }).map((r) => r.time)).toEqual([
      '16:00',
      '20:00',
    ])
  })
  it('nothing when off, or when the goal is reached', () => {
    expect(planStepReminders({ ...base, enabled: false })).toEqual([])
    expect(planStepReminders({ ...base, steps: 10000 })).toEqual([])
  })
  it('nothing at or after an evening bedtime', () => {
    expect(
      planStepReminders({ ...base, bedTime: '20:00', wakeTime: '06:00' }).map((r) => r.time),
    ).toEqual(['12:00', '16:00'])
  })
  it('respects the daily cap of 6', () => {
    expect(planStepReminders({ ...base, otherToday: 5 })).toHaveLength(1)
    expect(planStepReminders({ ...base, otherToday: 6 })).toEqual([])
  })
})
