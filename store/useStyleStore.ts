import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Locale } from '@/i18n'
import type { ReadingTheme } from '@/config/theme'

export type FontSize = 'small' | 'medium' | 'large'

export const DEFAULT_LIGHT_TEXT_COLOR = '#000000'
export const DEFAULT_DARK_TEXT_COLOR = '#ffffff'

interface StyleStore {
  itemsPerRow: number
  gutterX: number
  gutterY: number
  readingTheme: ReadingTheme
  themeInitialized: boolean
  useCustomTextColor: boolean
  lightModeTextColor: string
  darkModeTextColor: string
  headerCollapsed: boolean
  language: Locale
  fontSize: FontSize
  setItemsPerRow: (itemsPerRow: number) => void
  setGutterX: (gutterX: number) => void
  setGutterY: (gutterY: number) => void
  setReadingTheme: (readingTheme: ReadingTheme) => void
  setLightModeTextColor: (color: string) => void
  setDarkModeTextColor: (color: string) => void
  resetTextColors: () => void
  setHeaderCollapsed: (collapsed: boolean) => void
  toggleHeaderCollapsed: () => void
  setLanguage: (language: Locale) => void
  toggleLanguage: () => void
  setFontSize: (fontSize: FontSize) => void
}

export function mergeStyleState(persistedState: unknown, currentState: StyleStore): StyleStore {
  const persisted = (persistedState ?? {}) as Partial<StyleStore>
  const merged: StyleStore = {
    ...currentState,
    ...persisted,
  }
  const hasLegacyCustomColor =
    merged.lightModeTextColor !== DEFAULT_LIGHT_TEXT_COLOR ||
    merged.darkModeTextColor !== DEFAULT_DARK_TEXT_COLOR
  if (persisted.useCustomTextColor === undefined) {
    merged.useCustomTextColor = hasLegacyCustomColor
  }
  if (persisted.themeInitialized === undefined) {
    merged.themeInitialized = false
  }
  if (!persisted.readingTheme) {
    merged.readingTheme = 'light'
  }
  return merged
}

export const useStyleStore = create<StyleStore>()(
  persist(
    (set) => ({
      itemsPerRow: 12,
      gutterX: 16,
      gutterY: 24,
      readingTheme: 'light',
      themeInitialized: false,
      useCustomTextColor: false,
      lightModeTextColor: DEFAULT_LIGHT_TEXT_COLOR,
      darkModeTextColor: DEFAULT_DARK_TEXT_COLOR,
      headerCollapsed: false,
      language: 'zh',
      fontSize: 'medium',
      setItemsPerRow: (itemsPerRow) => set({ itemsPerRow }),
      setGutterX: (gutterX) => set({ gutterX }),
      setGutterY: (gutterY) => set({ gutterY }),
      setReadingTheme: (readingTheme) => set({ readingTheme, themeInitialized: true }),
      setLightModeTextColor: (lightModeTextColor) => set({
        lightModeTextColor,
        useCustomTextColor: true,
      }),
      setDarkModeTextColor: (darkModeTextColor) => set({
        darkModeTextColor,
        useCustomTextColor: true,
      }),
      resetTextColors: () => set({
        useCustomTextColor: false,
        lightModeTextColor: DEFAULT_LIGHT_TEXT_COLOR,
        darkModeTextColor: DEFAULT_DARK_TEXT_COLOR,
      }),
      setHeaderCollapsed: (headerCollapsed) => set({ headerCollapsed }),
      toggleHeaderCollapsed: () => set((state) => ({ headerCollapsed: !state.headerCollapsed })),
      setLanguage: (language) => set({ language }),
      toggleLanguage: () => set((state) => ({ language: state.language === 'zh' ? 'en' : 'zh' })),
      setFontSize: (fontSize) => set({ fontSize }),
    }),
    {
      name: 'style-storage',
      merge: mergeStyleState,
    }
  )
)
