import type { Settings } from '../types'

export function isDark(theme: Settings['theme'], systemDark: boolean): boolean {
  return theme === 'dark' || (theme === 'system' && systemDark)
}

/** matchMedia is missing in some environments (tests), so we guard it. */
function darkQuery(): MediaQueryList | null {
  return typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null
}

export function applyTheme(theme: Settings['theme']): void {
  document.documentElement.classList.toggle('dark', isDark(theme, !!darkQuery()?.matches))
}

/** Re-applies the theme when the system theme changes. Returns an unsubscribe function. */
export function watchSystemTheme(onChange: () => void): () => void {
  const mq = darkQuery()
  mq?.addEventListener('change', onChange)
  return () => mq?.removeEventListener('change', onChange)
}
