// The Android implementation: talks to our own Capacitor plugin `HealthConnect` (Kotlin, see
// android/app/src/main/java/.../HealthConnectPlugin.kt). Only Steps and Sleep are ever read.
import { registerPlugin } from '@capacitor/core'
import {
  fail,
  ok,
  type Availability,
  type DataOrigin,
  type HealthResult,
  type HealthSource,
  type PermissionState,
  type SleepSession,
} from './types'

/** What the native plugin offers (times are epoch milliseconds). */
export interface HealthConnectNative {
  isAvailable(): Promise<{ status: Availability }>
  getPermissions(): Promise<PermissionState>
  requestHealthPermissions(): Promise<PermissionState>
  getDailySteps(o: { date: string; origin?: string }): Promise<{ count: number }>
  getSleepSessions(o: {
    from: number
    to: number
    origin?: string
  }): Promise<{ sessions: { id: string; start: number; end: number; origin: string }[] }>
  listDataOrigins(): Promise<{ origins: string[] }>
  openSettings(): Promise<void>
}

const native = registerPlugin<HealthConnectNative>('HealthConnect')

/** Friendly names of apps that commonly write steps and sleep. Unknown packages show the package name. */
const FRIENDLY: Record<string, string> = {
  'com.huawei.health': 'Huawei Health',
  'com.huawei.himovie.overseas': 'Huawei Health',
  'com.google.android.apps.fitness': 'Google Fit',
  'com.sec.android.app.shealth': 'Samsung Health',
  'com.mi.health': 'Mi Fitness (Xiaomi)',
  'com.xiaomi.wearable': 'Mi Fitness (Xiaomi)',
  'com.fitbit.FitbitMobile': 'Fitbit',
  'com.garmin.android.apps.connectmobile': 'Garmin Connect',
  'com.android.healthconnect.controller': 'Health Connect',
}
export const friendlyOrigin = (pkg: string): DataOrigin => ({
  packageName: pkg,
  name: FRIENDLY[pkg] ?? pkg,
})

const pad = (n: number) => String(n).padStart(2, '0')
const localIso = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** Runs one plugin call: a thrown error becomes a typed result, never an exception. */
async function call<T>(run: () => Promise<T>): Promise<HealthResult<T>> {
  try {
    return ok(await run())
  } catch (e) {
    const err = e as { code?: string; message?: string }
    const msg = err.message ?? String(e)
    if (err.code === 'DENIED') return fail('denied', msg)
    if (err.code === 'UNAVAILABLE') return fail('unavailable', msg)
    return fail('failed', msg)
  }
}

const map = <T, U>(r: HealthResult<T>, f: (v: T) => U): HealthResult<U> =>
  r.ok ? ok(f(r.value)) : r

export const healthConnectSource: HealthSource = {
  kind: 'health-connect',
  isAvailable: async () => map(await call(() => native.isAvailable()), (r) => r.status),
  requestPermissions: () => call(() => native.requestHealthPermissions()),
  getPermissionState: () => call(() => native.getPermissions()),
  getDailySteps: async (date, origin) =>
    map(await call(() => native.getDailySteps({ date, origin })), (r) => r.count),
  getSleepSessions: async (from, to, origin) =>
    map(
      await call(() =>
        native.getSleepSessions({
          from: new Date(from).getTime(),
          to: new Date(to).getTime(),
          origin,
        }),
      ),
      (r): SleepSession[] =>
        r.sessions.map((s) => ({
          id: s.id,
          start: localIso(s.start),
          end: localIso(s.end),
          origin: s.origin,
        })),
    ),
  listDataOrigins: async () =>
    map(await call(() => native.listDataOrigins()), (r) => r.origins.map(friendlyOrigin)),
  openSettings: async () => map(await call(() => native.openSettings()), () => true as const),
}
