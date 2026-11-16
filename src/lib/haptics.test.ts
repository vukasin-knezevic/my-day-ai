import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  native: false,
  impact: vi.fn().mockResolvedValue(undefined),
  notification: vi.fn().mockResolvedValue(undefined),
  vibrate: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('./platform', () => ({ isNative: () => h.native }))
vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: h.impact, notification: h.notification, vibrate: h.vibrate },
  ImpactStyle: { Light: 'LIGHT' },
  NotificationType: { Success: 'SUCCESS' },
}))

import { haptic, setHapticsEnabled } from './haptics'
import { setEffectPrefs, cue } from './effects'

const webVibrate = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  h.native = false
  setHapticsEnabled(true)
  Object.defineProperty(navigator, 'vibrate', { value: webVibrate, configurable: true })
  vi.stubGlobal('matchMedia', undefined)
})

describe('haptic (web fallback)', () => {
  it('uses navigator.vibrate with the patterns of each kind', () => {
    haptic('tap')
    haptic('success')
    haptic('warning')
    expect(webVibrate.mock.calls).toEqual([[10], [[15, 30, 15]], [40]])
  })
  it('accepts a raw pattern', () => {
    haptic([30, 50, 30])
    expect(webVibrate).toHaveBeenCalledWith([30, 50, 30])
  })
  it('does not crash when navigator.vibrate is missing or throws', () => {
    Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true })
    expect(() => haptic('success')).not.toThrow()
    Object.defineProperty(navigator, 'vibrate', {
      value: () => {
        throw new Error('no')
      },
      configurable: true,
    })
    expect(() => haptic('tap')).not.toThrow()
  })
  it('is silent when vibration is off', () => {
    setHapticsEnabled(false)
    haptic('success')
    expect(webVibrate).not.toHaveBeenCalled()
  })
  it('is silent with "reduce motion"', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    haptic('success')
    expect(webVibrate).not.toHaveBeenCalled()
  })
})

describe('haptic (Android app)', () => {
  beforeEach(() => {
    h.native = true
  })
  it('uses the Capacitor plugin, not navigator.vibrate', () => {
    haptic('tap')
    haptic('success')
    haptic('warning')
    expect(h.impact).toHaveBeenCalledWith({ style: 'LIGHT' })
    expect(h.notification).toHaveBeenCalledWith({ type: 'SUCCESS' })
    expect(h.vibrate).toHaveBeenCalledWith({ duration: 40 })
    expect(webVibrate).not.toHaveBeenCalled()
  })
  it('never throws when the plugin fails', async () => {
    h.impact.mockRejectedValueOnce(new Error('x'))
    expect(() => haptic('tap')).not.toThrow()
    await Promise.resolve()
  })
  it('plays a raw pattern as separate pulses', () => {
    vi.useFakeTimers()
    haptic([30, 50, 30])
    vi.runAllTimers()
    vi.useRealTimers()
    expect(h.vibrate.mock.calls).toEqual([[{ duration: 30 }], [{ duration: 30 }]])
  })
  it('is silent when vibration is off', () => {
    setHapticsEnabled(false)
    haptic('success')
    expect(h.notification).not.toHaveBeenCalled()
  })
})

describe('cue goes through haptic', () => {
  it('the vibration setting of effects controls it', () => {
    setEffectPrefs({ sound: false, vibration: true, animations: true })
    cue('tick')
    expect(webVibrate).toHaveBeenCalledWith([15, 30, 15])
    webVibrate.mockClear()
    setEffectPrefs({ sound: false, vibration: false, animations: true })
    cue('level')
    expect(webVibrate).not.toHaveBeenCalled()
    setEffectPrefs({ sound: false, vibration: true, animations: true })
  })
})
