import { describe, expect, it } from 'vitest'
import { findFreeSlot } from './freeSlot'
import type { Activity } from '../types'

const bounds = { wakeTime: '07:00', bedTime: '23:00' }
let n = 0
const act = (
  date: string,
  start: string,
  end: string,
  extra: Partial<Activity> = {},
): Activity => ({
  id: `a${++n}`,
  title: 'x',
  category: 'study',
  date,
  start,
  end,
  recurrence: 'none',
  status: 'planned',
  source: 'me',
  ...extra,
})
const at = (date: string, h: number, m = 0) =>
  new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`)
const D = '2026-11-16'
const D2 = '2026-11-17'
const find = (acts: Activity[], mine: Activity, now: Date) =>
  findFreeSlot(
    { activities: acts, subjects: [] },
    { key: `act-${mine.id}-${mine.date}`, date: mine.date, start: mine.start, end: mine.end },
    bounds,
    now,
  )

describe('findFreeSlot', () => {
  it('takes the first gap after now, on a 15-minute mark, with the same length', () => {
    const mine = act(D, '09:00', '10:30')
    const other = act(D, '11:00', '12:00')
    // now 10:40: the next 90 minutes free after 10:40 and after 12:00 -> 12:00
    expect(find([mine, other], mine, at(D, 10, 40))).toEqual({
      date: D,
      start: '12:00',
      end: '13:30',
    })
    // now 08:10: its own old place is free once it leaves, but never earlier than its own start: 09:15
    expect(find([mine, other], mine, at(D, 8, 10))).toEqual({
      date: D,
      start: '09:15',
      end: '10:45',
    })
  })

  it('never lands on the same time or earlier on its own day', () => {
    const mine = act(D, '14:00', '15:00')
    expect(find([mine], mine, at(D, 8, 0))).toEqual({ date: D, start: '14:15', end: '15:15' })
  })

  it('does not use past times: "now" decides', () => {
    const mine = act(D, '07:30', '08:00')
    expect(find([mine], mine, at(D, 15, 7))).toEqual({ date: D, start: '15:15', end: '15:45' })
  })

  it('overlap: slots that touch are fine, slots that overlap are not', () => {
    const mine = act(D, '08:00', '09:00')
    const a = act(D, '10:00', '11:00')
    expect(find([mine, a], mine, at(D, 9, 0))).toEqual({ date: D, start: '09:00', end: '10:00' })
    const b = act(D, '09:30', '10:30')
    // 09:00-10:00 and 09:15-10:15 overlap b; 09:30..10:30 is b itself; 11:00 is the first fit
    expect(find([mine, a, b], mine, at(D, 9, 0))).toEqual({ date: D, start: '11:00', end: '12:00' })
  })

  it('a skipped thing and a suggestion do not block, a done one does', () => {
    const mine = act(D, '08:00', '09:00')
    const skipped = act(D, '08:15', '09:15', { status: 'skipped' })
    const sug = act(D, '08:15', '09:15', { suggested: true })
    expect(find([mine, skipped, sug], mine, at(D, 8, 0))).toEqual({
      date: D,
      start: '08:15',
      end: '09:15',
    })
    const done = act(D, '08:30', '09:30', { status: 'done' })
    expect(find([mine, done], mine, at(D, 8, 0))?.start).toBe('09:30')
  })

  it('goes to tomorrow, from wake-up, when today is full', () => {
    const mine = act(D, '08:00', '09:00')
    const late = act(D, '09:00', '23:00')
    expect(find([mine, late], mine, at(D, 8, 0))).toEqual({
      date: D2,
      start: '07:00',
      end: '08:00',
    })
  })

  it('goes to tomorrow when it is too late today', () => {
    const mine = act(D, '08:00', '09:00')
    expect(find([mine], mine, at(D, 22, 30))).toEqual({ date: D2, start: '07:00', end: '08:00' })
  })

  it('null when both days are full', () => {
    const mine = act(D, '08:00', '09:00')
    const full1 = act(D, '09:00', '23:00')
    const full2 = act(D2, '07:00', '23:00')
    expect(find([mine, full1, full2], mine, at(D, 8, 0))).toBeNull()
  })

  it('a thing from a past day moves from today', () => {
    const mine = act('2026-11-10', '08:00', '09:00')
    expect(find([mine], mine, at(D, 12, 0))).toEqual({ date: D, start: '12:00', end: '13:00' })
  })

  it('a night owl: the day goes on after midnight, so a gap there counts', () => {
    const night = { wakeTime: '10:00', bedTime: '02:00' }
    const mine = act(D, '20:00', '21:00')
    const other = act(D, '20:30', '23:55')
    const res = findFreeSlot(
      { activities: [mine, other], subjects: [] },
      { key: `act-${mine.id}-${D}`, date: D, start: '20:00', end: '21:00' },
      night,
      at(D, 20, 0),
    )
    expect(res).toEqual({ date: D, start: '00:00', end: '01:00' })
  })
})
