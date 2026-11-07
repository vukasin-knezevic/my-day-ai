import { afterEach, describe, expect, it, vi } from 'vitest'
import { showNotification } from './useReminders'

afterEach(() => vi.unstubAllGlobals())

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
