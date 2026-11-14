import { fail, type HealthSource } from './types'

/** The web version / PWA: no health data, the feature is hidden. */
export const noopSource: HealthSource = {
  kind: 'noop',
  isAvailable: async () => fail('not-native'),
  requestPermissions: async () => fail('not-native'),
  getPermissionState: async () => fail('not-native'),
  getDailySteps: async () => fail('not-native'),
  getSleepSessions: async () => fail('not-native'),
  listDataOrigins: async () => fail('not-native'),
  openSettings: async () => fail('not-native'),
}
