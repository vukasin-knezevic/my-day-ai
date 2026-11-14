import { emptyData } from './defaults'
import { numericId, planNotifications } from './nativePlan'
import type { AppData } from '../types'

const NOW = new Date('2026-11-14T08:00:00')
const data = (patch: Partial<AppData['settings']> = {}): AppData => {
  const d = emptyData()
  d.settings = {
    ...d.settings,
    onboarded: true,
    reminders: true,
    wakeTime: '09:00',
    bedTime: '23:30',
    routineOn: false,
    ...patch,
  }
  return d
}
const keys = (d: AppData, now = NOW) => planNotifications(d, now).map((n) => n.key)

describe('planNotifications', () => {
  it('plans bedtime for today and tomorrow, in time order', () => {
    const out = planNotifications(data(), NOW)
    expect(out.map((n) => n.key)).toEqual(['bed-2026-11-14', 'bed-2026-11-15'])
    expect(out[0].at.getHours()).toBe(23)
    expect(out[0].at.getMinutes()).toBe(0)
  })

  it('never plans a moment that has already passed', () => {
    expect(keys(data(), new Date('2026-11-14T23:15:00'))).toEqual(['bed-2026-11-15'])
  })

  it('the morning routine is planned with a "Done" button on its own channel', () => {
    const d = data({
      routineOn: true,
      routineSteps: [{ emoji: '💧', text: 'Water' }],
      routineGoal: '09:00',
    })
    const r = planNotifications(d, NOW).find((n) => n.key.startsWith('routine-'))!
    expect(r.channel).toBe('routine')
    expect(r.actions?.[0].action).toBe('done')
  })

  it('steps reminders: 12, 16, 20 while the goal is not reached', () => {
    const d = data({ stepReminders: true, watchConnected: true })
    const steps = planNotifications(d, NOW).filter((n) => n.key.startsWith('steps-'))
    expect(steps.filter((n) => n.at.getDate() === 14).map((n) => n.at.getHours())).toEqual([
      12, 16, 20,
    ])
  })

  it('reaching the goal removes the rest of today (rescheduling), tomorrow stays', () => {
    const d = data({ stepReminders: true, watchConnected: true })
    d.days['2026-11-14'] = { steps: 10000 }
    const steps = planNotifications(d, NOW).filter((n) => n.key.startsWith('steps-'))
    expect(steps.every((n) => n.at.getDate() === 15)).toBe(true)
    expect(steps).toHaveLength(3)
  })

  it('steps reminders are off when the setting is off or no watch is connected', () => {
    expect(
      keys(data({ stepReminders: false, watchConnected: true })).some((k) =>
        k.startsWith('steps-'),
      ),
    ).toBe(false)
    expect(
      keys(data({ stepReminders: true, watchConnected: false })).some((k) =>
        k.startsWith('steps-'),
      ),
    ).toBe(false)
  })

  it('the wake-up alarm is on the alarm channel and opens /alarm', () => {
    const a = planNotifications(data({ wakeAlarm: true }), NOW).find((n) => n.channel === 'alarm')!
    expect(a.key).toBe('alarm-2026-11-14')
    expect(a.route).toBe('/alarm')
  })

  it('no more than 6 a day', () => {
    const d = data({ stepReminders: true, watchConnected: true, wakeAlarm: true })
    for (let i = 0; i < 8; i++)
      d.activities.push({
        id: `a${i}`,
        title: `T${i}`,
        category: 'study',
        date: '2026-11-14',
        start: `${10 + i}:00`,
        end: `${10 + i}:30`,
        status: 'planned',
      } as never)
    const today = planNotifications(d, NOW).filter((n) => n.at.getDate() === 14)
    expect(today.length).toBeLessThanOrEqual(6)
  })

  it('ids are stable numbers', () => {
    expect(numericId('bed-2026-11-14')).toBe(numericId('bed-2026-11-14'))
    expect(numericId('a')).not.toBe(numericId('b'))
    expect(Number.isInteger(numericId('x'))).toBe(true)
  })
})
