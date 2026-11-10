// Stand-in for the virtual module of vite-plugin-pwa in tests (there is no service worker there).
// It remembers the options and the calls, so tests can play the service worker's events.
export interface RegisterOptions {
  immediate?: boolean
  onNeedRefresh?: () => void
  onRegisteredSW?: (url: string, registration: ServiceWorkerRegistration | undefined) => void
}
export const pwaTest = {
  options: undefined as RegisterOptions | undefined,
  updateCalls: [] as (boolean | undefined)[],
}
export function registerSW(options?: RegisterOptions): (reload?: boolean) => Promise<void> {
  pwaTest.options = options
  return async (reload) => {
    pwaTest.updateCalls.push(reload)
  }
}
