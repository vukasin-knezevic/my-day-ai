import { render } from '@testing-library/react'
import { useStore } from '../store'
import { emptyData } from './defaults'
import { requestNotifications, useReminders } from './useReminders'

const NOW = new Date(2026, 10, 6, 17, 50)

const shown = vi.fn()
class FakeNotification {
  static permission: NotificationPermission = 'granted'
  static requestPermission = vi.fn(async () => 'granted' as NotificationPermission)
  constructor(title: string) {
    shown(title)
  }
}

function Host() {
  useReminders()
  return null
}

beforeEach(() => {
  shown.mockClear()
  FakeNotification.permission = 'granted'
  vi.stubGlobal('Notification', FakeNotification)
  vi.useFakeTimers({ now: NOW })
  const d = emptyData()
  useStore.setState({
    ...d,
    settings: { ...d.settings, reminders: true, bedTime: '23:00' },
    activities: [
      {
        id: 'a',
        title: 'Trening',
        category: 'workout',
        date: '2026-11-06',
        start: '18:00',
        end: '19:00',
        recurrence: 'none',
        status: 'planned',
        source: 'me',
      },
    ],
    hydrated: true,
  })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useReminders', () => {
  it('shows a reminder once, not again on every minute', () => {
    render(<Host />)
    expect(shown).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(3 * 60_000)
    expect(shown).toHaveBeenCalledTimes(1)
  })
  it('stays quiet when reminders are off', () => {
    useStore.getState().setSettings({ reminders: false })
    render(<Host />)
    expect(shown).not.toHaveBeenCalled()
  })
  it('stays quiet without permission', () => {
    FakeNotification.permission = 'denied'
    render(<Host />)
    expect(shown).not.toHaveBeenCalled()
  })
  it('stops checking after the page is closed', () => {
    const { unmount } = render(<Host />)
    shown.mockClear()
    unmount()
    useStore.getState().setSettings({ bedTime: '18:10' })
    vi.advanceTimersByTime(5 * 60_000)
    expect(shown).not.toHaveBeenCalled()
  })
})

describe('requestNotifications', () => {
  it('asks the browser only when the answer is not known yet', async () => {
    expect(await requestNotifications()).toBe(true)
    FakeNotification.permission = 'denied'
    expect(await requestNotifications()).toBe(false)
    expect(FakeNotification.requestPermission).not.toHaveBeenCalled()
    FakeNotification.permission = 'default'
    expect(await requestNotifications()).toBe(true)
    expect(FakeNotification.requestPermission).toHaveBeenCalledOnce()
  })
  it('a browser without notifications answers no', async () => {
    vi.stubGlobal('Notification', undefined)
    expect(await requestNotifications()).toBe(false)
  })
})
