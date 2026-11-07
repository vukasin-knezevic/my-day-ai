import { isIos, notificationSupport, shouldShowIosInstallHint, type Env } from './ios'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36'
const IPAD_AS_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.4 Safari/605.1.15'

const env = (o: Partial<Env>): Env => ({
  userAgent: ANDROID,
  standalone: false,
  hasNotifications: true,
  ...o,
})

describe('isIos', () => {
  it('knows iPhone, iPad and the iPad that looks like a Mac', () => {
    expect(isIos({ userAgent: IPHONE })).toBe(true)
    expect(isIos({ userAgent: IPAD_AS_MAC, platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true)
  })
  it('not Android and not a real Mac', () => {
    expect(isIos({ userAgent: ANDROID })).toBe(false)
    expect(isIos({ userAgent: IPAD_AS_MAC, platform: 'MacIntel', maxTouchPoints: 0 })).toBe(false)
  })
})

describe('install hint', () => {
  it('shown on iOS in the browser, once', () => {
    expect(shouldShowIosInstallHint(env({ userAgent: IPHONE }), false)).toBe(true)
    expect(shouldShowIosInstallHint(env({ userAgent: IPHONE }), true)).toBe(false)
  })
  it('not shown when installed or on other systems', () => {
    expect(shouldShowIosInstallHint(env({ userAgent: IPHONE, standalone: true }), false)).toBe(
      false,
    )
    expect(shouldShowIosInstallHint(env({}), false)).toBe(false)
  })
})

describe('notificationSupport', () => {
  it('iPhone in Safari: only after adding to the home screen', () => {
    expect(notificationSupport(env({ userAgent: IPHONE, hasNotifications: false }))).toBe(
      'ios-install',
    )
    expect(notificationSupport(env({ userAgent: IPHONE, standalone: true }))).toBe('ok')
  })
  it('elsewhere it depends on the Notification API', () => {
    expect(notificationSupport(env({}))).toBe('ok')
    expect(notificationSupport(env({ hasNotifications: false }))).toBe('unsupported')
  })
})
