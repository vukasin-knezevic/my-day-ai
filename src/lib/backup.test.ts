import { backupDue, backupStamp, hasUserData, lastBackupLabel, laterStamp } from './backup'
import { emptyData } from './defaults'
import { makeDemoData } from './demo'
import type { AppData } from '../types'

const on = { backupReminder: true, lastBackupAt: '', backupNudgeAt: '' }

describe('backupDue', () => {
  it('is quiet without data, when turned off, and before the clock starts', () => {
    expect(backupDue({ ...on, backupNudgeAt: '2026-11-01' }, false, '2026-11-20')).toBe(false)
    expect(
      backupDue({ ...on, backupReminder: false, backupNudgeAt: '2026-11-01' }, true, '2026-11-20'),
    ).toBe(false)
    expect(backupDue(on, true, '2026-11-20')).toBe(false)
  })
  it('asks a week after the first use, and again a week after "Later"', () => {
    expect(backupDue({ ...on, backupNudgeAt: '2026-11-01' }, true, '2026-11-07')).toBe(false)
    expect(backupDue({ ...on, backupNudgeAt: '2026-11-01' }, true, '2026-11-08')).toBe(true)
    const later = { ...on, ...laterStamp(new Date('2026-11-08T10:00:00')) }
    expect(backupDue(later, true, '2026-11-14')).toBe(false)
    expect(backupDue(later, true, '2026-11-15')).toBe(true)
  })
  it('a fresh backup resets the week', () => {
    const s = {
      ...on,
      backupNudgeAt: '2026-11-01',
      ...backupStamp(new Date('2026-11-09T12:00:00')),
    }
    expect(backupDue(s, true, '2026-11-15')).toBe(false)
    expect(backupDue(s, true, '2026-11-16')).toBe(true)
  })
})

describe('hasUserData', () => {
  it('an empty app and demo examples are not "data to lose"', () => {
    expect(hasUserData(emptyData())).toBe(false)
    const demo = { ...emptyData(), ...makeDemoData('2026-11-07') } as AppData
    expect(hasUserData(demo)).toBe(false)
    const mine = { ...emptyData(), habits: [{ id: 'h', name: 'Voda', goal: 8, entries: {} }] }
    expect(hasUserData(mine as AppData)).toBe(true)
  })
})

it('lastBackupLabel: a date, or "never"', () => {
  expect(lastBackupLabel('')).toBe('nikad')
  expect(lastBackupLabel('2026-11-09T12:00:00')).toMatch(/9\. novembar/)
})
