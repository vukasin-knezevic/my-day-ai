import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.vukasinknezevic.mydayai',
  appName: 'My Day AI',
  webDir: 'dist',
  android: { allowMixedContent: false },
  plugins: {
    SplashScreen: { launchShowDuration: 0, backgroundColor: '#f8fafc' },
    Keyboard: { resize: 'body' },
  },
}

export default config
