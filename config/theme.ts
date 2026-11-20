export type ReadingTheme = 'paper' | 'light' | 'dark'

export interface ReadingThemePalette {
  canvas: string
  surface: string
  chromeBg: string
  elevated: string
  muted: string
  textPrimary: string
  textSecondary: string
  accent: string
  highlightBg: string
  border: string
  borderSecondary: string
  codeBg: string
  codeBorder: string
  blockquoteBorder: string
}

export const READING_THEME_PALETTES: Record<ReadingTheme, ReadingThemePalette> = {
  paper: {
    canvas: '#FAF8F5',
    surface: '#FFFFFF',
    chromeBg: '#F6F3EC',
    elevated: '#FFFFFF',
    muted: '#EFECE6',
    textPrimary: '#26231F',
    textSecondary: '#716B62',
    accent: '#4F46E5',
    highlightBg: '#EEF0FF',
    border: '#E6E1D6',
    borderSecondary: '#EAE5DA',
    codeBg: '#EFECE6',
    codeBorder: '#DFD9CC',
    blockquoteBorder: '#CFC7B8',
  },
  light: {
    canvas: '#FFFFFF',
    surface: '#FFFFFF',
    chromeBg: '#FFFFFF',
    elevated: '#FFFFFF',
    muted: '#F3F4F6',
    textPrimary: '#18181B',
    textSecondary: '#71717A',
    accent: '#4F46E5',
    highlightBg: '#EEF2FF',
    border: '#E5E7EB',
    borderSecondary: '#E5E7EB',
    codeBg: '#F6F8FA',
    codeBorder: '#D1D9E0',
    blockquoteBorder: '#D1D9E0',
  },
  dark: {
    canvas: '#16161A',
    surface: '#202026',
    chromeBg: '#1B1B21',
    elevated: '#26262E',
    muted: '#2A2A32',
    textPrimary: '#D4D4D8',
    textSecondary: '#9CA3AF',
    accent: '#6366F1',
    highlightBg: '#26294A',
    border: '#2E2E38',
    borderSecondary: '#363642',
    codeBg: '#1E1E26',
    codeBorder: '#32323E',
    blockquoteBorder: '#3F3F4E',
  },
}

export function isReadingTheme(value: unknown): value is ReadingTheme {
  return value === 'paper' || value === 'light' || value === 'dark'
}

export function getEffectiveTextColor(
  readingTheme: ReadingTheme,
  lightModeTextColor: string,
  darkModeTextColor: string,
  useCustomTextColor: boolean
): string {
  if (!useCustomTextColor) {
    return READING_THEME_PALETTES[readingTheme].textPrimary
  }
  return readingTheme === 'dark' ? darkModeTextColor : lightModeTextColor
}

export function applyReadingThemeCSSVars(
  root: HTMLElement,
  readingTheme: ReadingTheme,
  effectiveTextColor: string
): void {
  const palette = READING_THEME_PALETTES[readingTheme]
  root.dataset.readingTheme = readingTheme
  root.style.setProperty('--rb-bg-canvas', palette.canvas)
  root.style.setProperty('--rb-bg-surface', palette.surface)
  root.style.setProperty('--rb-bg-chrome', palette.chromeBg)
  root.style.setProperty('--rb-bg-elevated', palette.elevated)
  root.style.setProperty('--rb-bg-muted', palette.muted)
  root.style.setProperty('--rb-text-primary', effectiveTextColor)
  root.style.setProperty('--rb-text-secondary', palette.textSecondary)
  root.style.setProperty('--rb-accent', palette.accent)
  root.style.setProperty('--rb-highlight-bg', palette.highlightBg)
  root.style.setProperty('--rb-border', palette.border)
  root.style.setProperty('--rb-code-bg', palette.codeBg)
  root.style.setProperty('--rb-code-border', palette.codeBorder)
  root.style.setProperty('--rb-blockquote-border', palette.blockquoteBorder)
  root.style.setProperty('--card-bg-color', palette.muted)
  root.style.setProperty('--primary-text-color', effectiveTextColor)
}
