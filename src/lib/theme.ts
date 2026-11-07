import type { Settings } from '../types'

export function isDark(theme: Settings['theme'], systemDark: boolean): boolean {
  return theme === 'dark' || (theme === 'system' && systemDark)
}

/** matchMedia is missing in some environments (tests), so we guard it. */
function darkQuery(): MediaQueryList | null {
  return typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null
}

/** App background colours: the browser / phone bars take the same colour. */
export const BG_DARK = '#020617'
export const BG_LIGHT = '#f8fafc'

export function applyTheme(theme: Settings['theme']): void {
  const dark = isDark(theme, !!darkQuery()?.matches)
  document.documentElement.classList.toggle('dark', dark)
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? BG_DARK : BG_LIGHT)
}

/** Re-applies the theme when the system theme changes. Returns an unsubscribe function. */
export function watchSystemTheme(onChange: () => void): () => void {
  const mq = darkQuery()
  mq?.addEventListener('change', onChange)
  return () => mq?.removeEventListener('change', onChange)
}
