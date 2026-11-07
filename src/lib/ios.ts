// iPhone / iPad specifics: there is no "Install" button there, and notifications only work for an
// app that was added to the home screen (iOS 16.4+). Pure functions, so they are easy to test.

export interface Env {
  userAgent: string
  platform?: string
  maxTouchPoints?: number
  /** Opened from the home screen icon (not in a browser tab) */
  standalone: boolean
  /** The Notification API exists in this browser */
  hasNotifications: boolean
}

/** iPhone, iPod or iPad (new iPads pretend to be a Mac, but have a touch screen). */
export function isIos(env: Pick<Env, 'userAgent' | 'platform' | 'maxTouchPoints'>): boolean {
  if (/iPhone|iPad|iPod/i.test(env.userAgent)) return true
  return (
    (env.platform === 'MacIntel' || /Macintosh/.test(env.userAgent)) &&
    (env.maxTouchPoints ?? 0) > 1
  )
}

/** Show the "Add to Home Screen" card: on iOS, not installed yet, and not closed before. */
export function shouldShowIosInstallHint(env: Env, dismissed: boolean): boolean {
  return isIos(env) && !env.standalone && !dismissed
}

export type NotificationSupport = 'ok' | 'ios-install' | 'unsupported'

/** Can this device show notifications, and if not, why (so the settings can say it clearly). */
export function notificationSupport(env: Env): NotificationSupport {
  if (isIos(env) && !env.standalone) return 'ios-install'
  return env.hasNotifications ? 'ok' : 'unsupported'
}

/** The real environment of the running app. */
export function currentEnv(): Env {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined
  const standalone =
    (nav as unknown as { standalone?: boolean } | undefined)?.standalone === true ||
    (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches)
  return {
    userAgent: nav?.userAgent ?? '',
    platform: nav?.platform,
    maxTouchPoints: nav?.maxTouchPoints,
    standalone,
    hasNotifications: typeof Notification !== 'undefined',
  }
}
