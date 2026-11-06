import {
  addDaysStr,
  daysUntil,
  minToTime,
  timeToMin,
  weekdayOf,
  weekDates,
  weekStartStr,
  formatLong,
} from './dates'

describe('dates', () => {
  it('week starts on Monday', () => {
    // 2026-11-06 is a Friday
    expect(weekStartStr('2026-11-06')).toBe('2026-11-02')
    expect(weekStartStr('2026-11-08')).toBe('2026-11-02') // Sunday
    expect(weekStartStr('2026-11-09')).toBe('2026-11-09') // Monday
  })
  it('weekdayOf returns ISO weekday', () => {
    expect(weekdayOf('2026-11-02')).toBe(1)
    expect(weekdayOf('2026-11-08')).toBe(7)
  })
  it('weekDates returns 7 days', () => {
    const d = weekDates('2026-11-06')
    expect(d).toHaveLength(7)
    expect(d[0]).toBe('2026-11-02')
    expect(d[6]).toBe('2026-11-08')
  })
  it('addDaysStr crosses month boundary', () => {
    expect(addDaysStr('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDaysStr('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('daysUntil', () => {
    expect(daysUntil('2026-11-10', '2026-11-06')).toBe(4)
    expect(daysUntil('2026-11-05', '2026-11-06')).toBe(-1)
  })
  it('time conversion', () => {
    expect(timeToMin('18:30')).toBe(1110)
    expect(minToTime(1110)).toBe('18:30')
    expect(minToTime(1500)).toBe('01:00')
    expect(minToTime(-30)).toBe('23:30')
  })
  it('formats in Serbian', () => {
    expect(formatLong('2026-11-06').toLowerCase()).toContain('petak')
  })
})
