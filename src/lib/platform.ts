import { Capacitor } from '@capacitor/core'

/** True inside the Android app (Capacitor); false in the browser / PWA. */
export const isNative = (): boolean => Capacitor.isNativePlatform()
