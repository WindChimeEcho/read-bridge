export type RuntimePlatform = 'web' | 'tauri-desktop' | 'tauri-android'

export function isTauri(): boolean {
  if (typeof window === 'undefined') return false
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window
}

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false
  return /android/i.test(navigator.userAgent)
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/iphone|ipad|ipod/i.test(ua)) return true
  return navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1
}

export function isTauriAndroid(): boolean {
  return isTauri() && isAndroid()
}

export function isDesktopTauri(): boolean {
  return isTauri() && !isAndroid()
}

export function isMobileWeb(): boolean {
  return !isTauri() && typeof navigator !== 'undefined' && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
}

export function getRuntimePlatform(): RuntimePlatform {
  if (!isTauri()) return 'web'
  return isAndroid() ? 'tauri-android' : 'tauri-desktop'
}
