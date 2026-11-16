// One place for every vibration in the app. Inside the Android app it uses the Capacitor Haptics plugin
// (navigator.vibrate is not reliable there); in a browser it falls back to navigator.vibrate. It never
// throws, does nothing on desktop and on iPhone, and respects the `vibration` setting and "reduce motion".
import { useMemo } from 'react'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { isNative } from './platform'

/** tap = small toggles and opening sheets; success = something got done; warning = delete / destructive. */
export type HapticKind = 'tap' | 'success' | 'warning'

const PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 10,
  success: [15, 30, 15],
  warning: 40,
}

let enabled = true
/** The `vibration` setting (off = no haptics at all). */
export const setHapticsEnabled = (on: boolean) => {
  enabled = on
}

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

function web(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function')
      navigator.vibrate(pattern)
  } catch {
    /* no vibration (iPhone web, desktop) is fine */
  }
}

async function native(kind: HapticKind) {
  try {
    if (kind === 'tap') await Haptics.impact({ style: ImpactStyle.Light })
    else if (kind === 'success') await Haptics.notification({ type: NotificationType.Success })
    else await Haptics.vibrate({ duration: 40 })
  } catch {
    /* the phone has no vibrator, or the plugin is missing: fine */
  }
}

/** A raw pattern on the phone: vibrate, pause, vibrate... (the plugin only knows one duration at a time). */
function nativePattern(pattern: number | number[]) {
  const list = typeof pattern === 'number' ? [pattern] : pattern
  let at = 0
  list.forEach((ms, i) => {
    if (i % 2 === 0 && ms > 0)
      setTimeout(() => void Haptics.vibrate({ duration: ms }).catch(() => undefined), at)
    at += ms
  })
}

/** Vibrates for `kind`, or plays a raw pattern (ms). Never throws. */
export function haptic(kind: HapticKind | number | number[]): void {
  try {
    if (!enabled || reducedMotion()) return
    if (isNative()) {
      if (typeof kind === 'string') void native(kind)
      else nativePattern(kind)
      return
    }
    web(typeof kind === 'string' ? PATTERNS[kind] : kind)
  } catch {
    /* never break the app for a buzz */
  }
}

/** Stable functions for components (the logic lives outside React). */
export function useHaptics() {
  return useMemo(
    () => ({
      tap: () => haptic('tap'),
      success: () => haptic('success'),
      warning: () => haptic('warning'),
    }),
    [],
  )
}
