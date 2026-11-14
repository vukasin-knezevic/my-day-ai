import { nightsFromSessions, planSleepImport, nightId } from './sleepImport'
import type { SleepLog } from '../../types'
import type { SleepSession } from './types'

const s = (id: string, start: string, end: string, origin = 'watch.app'): SleepSession => ({
  id,
  start,
  end,
  origin,
})
const manual = (date: string, bed: string, wake: string | null): SleepLog => ({
  id: `m-${date}`,
  date,
  bedtime: bed,
  wakeTime: wake,
  quality: null,
  source: 'manual',
})

describe('nightsFromSessions', () => {
  it('a night across midnight belongs to the day of the wake-up', () => {
    const [n] = nightsFromSessions([s('a', '2026-11-10T23:40:00', '2026-11-11T07:05:00')])
    expect(n.date).toBe('2026-11-11')
    expect(n.bedtime).toBe('2026-11-10T23:40:00')
  })

  it('a night that starts after midnight is still the same wake-up day', () => {
    const [n] = nightsFromSessions([s('a', '2026-11-11T00:30:00', '2026-11-11T08:00:00')])
    expect(n.date).toBe('2026-11-11')
  })

  it('adjacent sessions (a short wake-up) become one night', () => {
    const out = nightsFromSessions([
      s('b', '2026-11-11T03:10:00', '2026-11-11T07:00:00'),
      s('a', '2026-11-10T23:30:00', '2026-11-11T03:00:00'),
    ])
    expect(out).toHaveLength(1)
    expect(out[0].bedtime).toBe('2026-11-10T23:30:00')
    expect(out[0].wakeTime).toBe('2026-11-11T07:00:00')
  })

  it('sessions far apart stay two nights', () => {
    const out = nightsFromSessions([
      s('a', '2026-11-10T00:00:00', '2026-11-10T07:00:00'),
      s('b', '2026-11-11T00:00:00', '2026-11-11T07:00:00'),
    ])
    expect(out.map((n) => n.date)).toEqual(['2026-11-10', '2026-11-11'])
  })

  it('a nap shorter than 30 minutes is ignored, 30 minutes is kept', () => {
    expect(nightsFromSessions([s('a', '2026-11-11T14:00:00', '2026-11-11T14:29:00')])).toEqual([])
    expect(nightsFromSessions([s('a', '2026-11-11T14:00:00', '2026-11-11T14:30:00')])).toHaveLength(
      1,
    )
  })

  it('a broken record (end before start, or over 20 hours) is ignored', () => {
    expect(nightsFromSessions([s('a', '2026-11-11T08:00:00', '2026-11-11T07:00:00')])).toEqual([])
    expect(nightsFromSessions([s('a', '2026-11-10T00:00:00', '2026-11-11T00:00:00')])).toEqual([])
  })

  it('the id comes from the start and does not change when the night grows', () => {
    const a = nightsFromSessions([s('x', '2026-11-10T23:30:00', '2026-11-11T03:00:00')])[0]
    const b = nightsFromSessions([
      s('x', '2026-11-10T23:30:00', '2026-11-11T03:00:00'),
      s('y', '2026-11-11T03:05:00', '2026-11-11T07:00:00'),
    ])[0]
    expect(a.id).toBe(b.id)
    expect(a.id).toBe(nightId('2026-11-10T23:30:00'))
  })
})

describe('planSleepImport', () => {
  const night = nightsFromSessions([s('a', '2026-11-10T23:30:00', '2026-11-11T07:00:00')])

  it('adds a new night as a watch log', () => {
    const plan = planSleepImport([], night, [])
    expect(plan.add).toHaveLength(1)
    expect(plan.add[0]).toMatchObject({ source: 'watch', date: '2026-11-11', quality: null })
  })

  it('a second sync does not duplicate', () => {
    const first = planSleepImport([], night, [])
    const second = planSleepImport(first.add, night, [])
    expect(second.add).toEqual([])
    expect(second.update).toEqual([])
  })

  it('a manual entry for the same night wins (same day)', () => {
    const plan = planSleepImport(
      [manual('2026-11-11', '2026-11-11T00:15:00', '2026-11-11T08:00:00')],
      night,
      [],
    )
    expect(plan.add).toEqual([])
  })

  it('a manual entry that overlaps wins even with another date', () => {
    const plan = planSleepImport([manual('2026-11-10', '2026-11-10T23:00:00', null)], night, [])
    expect(plan.add).toEqual([])
  })

  it('a manual entry of another night does not block', () => {
    const plan = planSleepImport(
      [manual('2026-11-09', '2026-11-09T00:00:00', '2026-11-09T07:00:00')],
      night,
      [],
    )
    expect(plan.add).toHaveLength(1)
  })

  it('a dismissed night does not come back', () => {
    const plan = planSleepImport([], night, [night[0].id])
    expect(plan.add).toEqual([])
  })

  it('a night that grew is updated, never added again', () => {
    const first = planSleepImport([], night, []).add
    const grown = nightsFromSessions([s('a', '2026-11-10T23:30:00', '2026-11-11T07:45:00')])
    const plan = planSleepImport(first, grown, [])
    expect(plan.add).toEqual([])
    expect(plan.update[0].patch.wakeTime).toBe('2026-11-11T07:45:00')
  })

  it('never touches a manual log even when the id is the same', () => {
    const clash: SleepLog = {
      ...manual('2026-11-11', night[0].bedtime, night[0].wakeTime),
      id: night[0].id,
    }
    const plan = planSleepImport([clash], [{ ...night[0], wakeTime: '2026-11-11T09:00:00' }], [])
    expect(plan.update).toEqual([])
  })
})
