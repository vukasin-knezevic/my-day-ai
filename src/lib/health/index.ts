import { isNative } from '../platform'
import { healthConnectSource } from './healthConnect'
import { noopSource } from './noop'
import type { HealthSource } from './types'

let override: HealthSource | null = null

/** The source for this platform: Health Connect inside the Android app, nothing on the web. Tests can swap it. */
export function getHealthSource(): HealthSource {
  return override ?? (isNative() ? healthConnectSource : noopSource)
}

export function setHealthSource(source: HealthSource | null): void {
  override = source
}

export * from './types'
