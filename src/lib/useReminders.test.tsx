import { render } from '@testing-library/react'
import { useStore } from '../store'
import { emptyData } from './defaults'
import {
  loadSent,
  requestNotifications,
  saveSent,
  showNotification,
  useReminders,
} from './useReminders'

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
  localStorage.clear()
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

describe('showNotification', () => {
  it('uses the service worker (the only way on Chrome for Android)', async () => {
    const showSw = vi.fn().mockResolvedValue(undefined)
    const ctor = vi.fn()
    vi.stubGlobal('Notification', Object.assign(ctor, { permission: 'granted' }))
    vi.stubGlobal('navigator', {
      serviceWorker: { ready: Promise.resolve({ showNotification: showSw }) },
    })
    expect(await showNotification('T', 'B')).toBe(true)
    expect(showSw).toHaveBeenCalledWith('T', expect.objectContaining({ body: 'B' }))
    expect(ctor).not.toHaveBeenCalled()
  })

  it('falls back to the constructor without a service worker', async () => {
    const ctor = vi.fn()
    vi.stubGlobal('Notification', Object.assign(ctor, { permission: 'granted' }))
    vi.stubGlobal('navigator', {})
    expect(await showNotification('T', 'B')).toBe(true)
    expect(ctor).toHaveBeenCalledOnce()
  })

  it('reports failure instead of swallowing it', async () => {
    const ctor = vi.fn(() => {
      throw new TypeError('Illegal constructor')
    })
    vi.stubGlobal('Notification', Object.assign(ctor, { permission: 'granted' }))
    vi.stubGlobal('navigator', {})
    expect(await showNotification('T', 'B')).toBe(false)
  })

  it('does nothing without permission', async () => {
    vi.stubGlobal('Notification', Object.assign(vi.fn(), { permission: 'denied' }))
    expect(await showNotification('T', 'B')).toBe(false)
  })
})

describe('A-10: notifications do not repeat and carry the logo', () => {
  beforeEach(() => localStorage.clear())

  it('a reminder shown before the app was closed is not shown again after reopening', () => {
    const first = render(<Host />)
    expect(shown).toHaveBeenCalledTimes(1)
    first.unmount()
    render(<Host />)
    expect(shown).toHaveBeenCalledTimes(1)
  })

  it('remembers today and yesterday only', () => {
    saveSent(
      new Map([
        ['old', '2026-11-04'],
        ['bed-2026-11-05', '2026-11-05'],
        ['ev-x', '2026-11-06'],
      ]),
    )
    expect([...loadSent('2026-11-06').keys()]).toEqual(['bed-2026-11-05', 'ev-x'])
  })

  it('damaged memory starts empty instead of breaking reminders', () => {
    localStorage.setItem('my-day-ai-sent', '{oops')
    expect(loadSent('2026-11-06').size).toBe(0)
  })

  it('has a tag (no duplicates), the small one-colour icon and the large one', async () => {
    const showSw = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('Notification', Object.assign(vi.fn(), { permission: 'granted' }))
    vi.stubGlobal('navigator', {
      serviceWorker: { ready: Promise.resolve({ showNotification: showSw }) },
    })
    await showNotification('T', 'B', { tag: 'ev-a' })
    expect(showSw).toHaveBeenCalledWith(
      'T',
      expect.objectContaining({
        tag: 'ev-a',
        badge: expect.stringContaining('badge-96.png'),
        icon: expect.stringContaining('icon-192.png'),
      }),
    )
  })
})
