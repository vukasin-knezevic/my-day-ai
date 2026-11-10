import { applyParsed } from './apply'
import { parseQuick } from './quickParse'
import { sleepHours } from './life'
import { useStore } from '../store'
import { emptyData } from './defaults'

const enter = (text: string, now: Date) => {
  const st = useStore.getState()
  return applyParsed(parseQuick(text, now), st)
}

beforeEach(() => {
  useStore.setState({ ...emptyData(), hydrated: true })
})

describe('quick entry saved into the store', () => {
  it('a repeating activity keeps its repeat and says so', () => {
    const msg = enter('trening svaki dan u 18', new Date(2026, 10, 6, 10))
    expect(useStore.getState().activities[0]).toMatchObject({
      category: 'workout',
      recurrence: 'daily',
      start: '18:00',
    })
    expect(msg).toContain('18:00')
  })
  it('an expense lands in its category', () => {
    enter('kafa 200', new Date(2026, 10, 6, 10))
    expect(useStore.getState().expenses[0]).toMatchObject({ amount: 200, category: 'hrana' })
  })
  it('bedtime and wake-up make one night of sleep', () => {
    enter('legao 23:30', new Date(2026, 10, 6, 23, 35))
    enter('ustao 7:30', new Date(2026, 10, 7, 7, 35))
    const [night] = useStore.getState().sleep
    expect(useStore.getState().sleep).toHaveLength(1)
    expect(night.date).toBe('2026-11-07')
    expect(sleepHours(night)).toBe(8)
  })
  it('a late bedtime typed after midnight still counts as a full night', () => {
    enter('legao 23:30', new Date(2026, 10, 7, 0, 30))
    enter('ustao 7:30', new Date(2026, 10, 7, 7, 35))
    expect(sleepHours(useStore.getState().sleep[0])).toBe(8)
  })
  it('a wake-up without a bedtime is saved, but does not invent hours of sleep', () => {
    enter('ustao 8', new Date(2026, 10, 7, 8, 5))
    const [night] = useStore.getState().sleep
    expect(night.wakeTime).toBe('2026-11-07T08:00:00')
    expect(sleepHours(night)).toBeNull()
  })
  it('an entry it does not understand changes nothing', () => {
    enter('zzzz', new Date(2026, 10, 6, 10))
    const { activities, expenses, sleep } = useStore.getState()
    expect([...activities, ...expenses, ...sleep]).toHaveLength(0)
  })
})

describe('A-12: sleep typed the next morning, and a forgotten "woke up"', () => {
  beforeEach(() => useStore.setState({ ...emptyData() }))
  const apply = (text: string, now: Date) => applyParsed(parseQuick(text, now), useStore.getState())

  it('"legao 23:30" then "ustao 8", both typed at 09:00, is 8.5 h of sleep', () => {
    const morning = new Date(2026, 10, 7, 9, 0)
    apply('legao 23:30', morning)
    apply('ustao 8', morning)
    const [night] = useStore.getState().sleep
    expect(useStore.getState().sleep).toHaveLength(1)
    expect(night.date).toBe('2026-11-07')
    expect(sleepHours(night)).toBe(8.5)
  })

  it("a bedtime from three days ago does not swallow today's wake-up", () => {
    apply('legao 23:30', new Date(2026, 10, 3, 23, 40))
    apply('ustao 8', new Date(2026, 10, 7, 8, 5))
    const logs = useStore.getState().sleep
    expect(logs).toHaveLength(2)
    expect(logs[0].wakeTime).toBeNull()
  })
})
