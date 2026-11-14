// The health layer: the rest of the app only talks to a `HealthSource`, never to a plugin.

export type HealthErrorCode =
  | 'unavailable' // Health Connect is missing / disabled / needs an update
  | 'denied' // the permission is not granted
  | 'not-native' // the web version has no health data
  | 'failed' // anything else the plugin threw

export interface HealthError {
  code: HealthErrorCode
  message: string
}

/** Every call returns a result instead of throwing: a failure must never crash the UI or touch stored data. */
export type HealthResult<T> = { ok: true; value: T } | { ok: false; error: HealthError }

export const ok = <T>(value: T): HealthResult<T> => ({ ok: true, value })
export const fail = (code: HealthErrorCode, message = ''): HealthResult<never> => ({
  ok: false,
  error: { code, message },
})

export type Availability = 'available' | 'update-required' | 'unavailable'

/** What the user has allowed. Only Steps and Sleep are ever asked for. */
export interface PermissionState {
  steps: boolean
  sleep: boolean
}

/** One sleep session as Health Connect reports it (local date-times, 'YYYY-MM-DDTHH:mm:ss'). */
export interface SleepSession {
  /** Stable id of the record (Health Connect record id) */
  id: string
  start: string
  end: string
  /** Package name of the app that wrote it (for example the watch's app) */
  origin: string
}

export interface DataOrigin {
  packageName: string
  /** A friendly name when the package is known, otherwise the package name itself */
  name: string
}

export interface HealthSource {
  /** 'noop' on the web, 'mock' in tests, 'health-connect' on Android */
  readonly kind: 'noop' | 'mock' | 'health-connect'
  isAvailable(): Promise<HealthResult<Availability>>
  requestPermissions(): Promise<HealthResult<PermissionState>>
  getPermissionState(): Promise<HealthResult<PermissionState>>
  /** Steps of one day (the aggregate of Health Connect: sources are de-duplicated). `origin` = one app only. */
  getDailySteps(date: string, origin?: string): Promise<HealthResult<number>>
  getSleepSessions(from: string, to: string, origin?: string): Promise<HealthResult<SleepSession[]>>
  listDataOrigins(): Promise<HealthResult<DataOrigin[]>>
  /** Opens the Health Connect settings screen (to grant or revoke). */
  openSettings(): Promise<HealthResult<true>>
}
