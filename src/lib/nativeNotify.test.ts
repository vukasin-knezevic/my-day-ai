import { beforeEach, describe, expect, it, vi } from 'vitest'

const n = vi.hoisted(() => ({
  schedule: vi.fn().mockResolvedValue(undefined),
  plan: [] as unknown[],
}))
vi.mock('./platform', () => ({ isNative: () => true }))
vi.mock('./nativePlan', () => ({
  numericId: () => 1,
  planNotifications: () => n.plan,
}))
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    getPending: vi.fn().mockResolvedValue({ notifications: [] }),
    cancel: vi.fn().mockResolvedValue(undefined),
    schedule: n.schedule,
  },
}))

import { NOTIFICATION_ICON, rescheduleAll, showNow } from './nativeNotify'
import { emptyData } from './defaults'

beforeEach(() => {
  n.schedule.mockClear()
  n.plan = [
    {
      key: 'k1',
      title: 'T',
      body: 'B',
      channel: 'reminders',
      at: new Date(Date.now() + 60_000),
      route: '/',
    },
  ]
})

describe('notification small icon', () => {
  it('is the sun drawable, not the system default (a "!" in a circle)', () => {
    expect(NOTIFICATION_ICON).toBe('ic_stat_notification')
  })
  it('the scheduled reminders carry smallIcon', async () => {
    const data = emptyData()
    data.settings.reminders = true
    await rescheduleAll(data)
    const sent = n.schedule.mock.calls[0][0].notifications
    expect(sent).toHaveLength(1)
    expect(sent[0].smallIcon).toBe('ic_stat_notification')
  })
  it('the notification shown now (test button) carries smallIcon too', async () => {
    await showNow('T', 'B')
    expect(n.schedule.mock.calls[0][0].notifications[0].smallIcon).toBe('ic_stat_notification')
  })
})
