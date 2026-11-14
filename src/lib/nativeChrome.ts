// The Android shell around the web app: status bar colours that follow the theme, the splash screen.
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { isNative } from './platform'

/** Dark theme -> light icons on a dark bar; light theme -> dark icons on a light bar. Never throws. */
export async function syncStatusBar(dark: boolean): Promise<void> {
  if (!isNative()) return
  try {
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light })
    await StatusBar.setBackgroundColor({ color: dark ? '#0f172a' : '#f8fafc' })
  } catch {
    // an old WebView without the plugin: the default bar is fine
  }
}

export async function hideSplash(): Promise<void> {
  if (!isNative()) return
  try {
    await SplashScreen.hide()
  } catch {
    // nothing to hide
  }
}
