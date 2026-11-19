import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.stanza.app',
  appName: 'Stanza',
  // Native bundle from `npm run build:native`; kept apart from the web `dist/`.
  webDir: 'dist-native',
  android: {
    // Matches the OLED dark UI so there's no white flash before the bundle paints.
    backgroundColor: '#000000',
  },
}

export default config
