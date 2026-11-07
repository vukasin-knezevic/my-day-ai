// Stand-in for the virtual module of vite-plugin-pwa in tests (there is no service worker there).
export function registerSW(): (reload?: boolean) => Promise<void> {
  return async () => {}
}
