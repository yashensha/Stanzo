import { Capacitor } from '@capacitor/core'

/**
 * Single source of truth for "which app is this?". Use these instead of calling
 * Capacitor directly so web vs. native branches stay greppable in one place.
 *
 * Runtime checks come from Capacitor (true inside the Android/iOS shell, false in any browser).
 * The build-time flag says which bundle this is (`vite build --mode capacitor` → native).
 */
export type Platform = 'web' | 'android' | 'ios'

export const platform = Capacitor.getPlatform() as Platform
export const isNative = Capacitor.isNativePlatform()
export const isAndroid = platform === 'android'
export const isIOS = platform === 'ios'
export const isWeb = !isNative

/** True when this bundle was produced by the native build (`npm run build:native`). */
export const isNativeBuild = import.meta.env.MODE === 'capacitor'
