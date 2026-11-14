import {
  fail,
  ok,
  type Availability,
  type DataOrigin,
  type HealthSource,
  type PermissionState,
  type SleepSession,
} from './types'

export interface MockData {
  availability?: Availability
  permissions?: PermissionState
  /** date -> steps per origin; with no origin asked the biggest one is used (like the Health Connect aggregate) */
  steps?: Record<string, Record<string, number>>
  sessions?: SleepSession[]
  /** Makes every call fail with this message (tests of the error paths) */
  failWith?: string
}

/** A deterministic source for tests: no timers, no randomness. */
export function createMockSource(data: MockData = {}): HealthSource & { data: MockData } {
  const state: MockData = {
    availability: 'available',
    permissions: { steps: true, sleep: true },
    steps: {},
    sessions: [],
    ...data,
  }
  const guard =
    <T>(run: () => T) =>
    async () => {
      if (state.failWith) return fail('failed', state.failWith)
      return ok(run())
    }
  return {
    data: state,
    kind: 'mock',
    isAvailable: async () =>
      state.failWith ? fail('failed', state.failWith) : ok(state.availability ?? 'available'),
    requestPermissions: guard(() => state.permissions!),
    getPermissionState: guard(() => state.permissions!),
    getDailySteps: async (date, origin) => {
      if (state.failWith) return fail('failed', state.failWith)
      if (!state.permissions?.steps) return fail('denied')
      const day = state.steps?.[date] ?? {}
      if (origin) return ok(day[origin] ?? 0)
      return ok(Math.max(0, ...Object.values(day)))
    },
    getSleepSessions: async (from, to, origin) => {
      if (state.failWith) return fail('failed', state.failWith)
      if (!state.permissions?.sleep) return fail('denied')
      return ok(
        (state.sessions ?? []).filter(
          (s) => s.end >= from && s.start <= to && (!origin || s.origin === origin),
        ),
      )
    },
    listDataOrigins: async () => {
      if (state.failWith) return fail('failed', state.failWith)
      const names = new Set<string>()
      for (const d of Object.values(state.steps ?? {})) Object.keys(d).forEach((k) => names.add(k))
      for (const s of state.sessions ?? []) names.add(s.origin)
      const list: DataOrigin[] = [...names].sort().map((p) => ({ packageName: p, name: p }))
      return ok(list)
    },
    openSettings: async () => ok(true as const),
  }
}
