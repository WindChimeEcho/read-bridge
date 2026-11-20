'use client'

import { ExportOutlined, ReloadOutlined } from '@ant-design/icons'
import { getEffectiveTextColor, READING_THEME_PALETTES, type ReadingTheme } from '@/config/theme'
import { useTranslation } from '@/i18n/useTranslation'
import { type FontSize, useStyleStore } from '@/store/useStyleStore'
import { SectionCard, SubpageHeader } from './SettingsPrimitives'

const THEME_CARDS: Array<{ key: ReadingTheme; labelKey: string }> = [
  { key: 'paper', labelKey: 'theme.paper' },
  { key: 'light', labelKey: 'theme.light' },
  { key: 'dark', labelKey: 'theme.dark' },
]

const FONT_OPTIONS: Array<{ key: FontSize; labelKey: string; sizeClass: string }> = [
  { key: 'small', labelKey: 'mobile.fontSmall', sizeClass: 'text-[15px]' },
  { key: 'medium', labelKey: 'mobile.fontMedium', sizeClass: 'text-[18px]' },
  { key: 'large', labelKey: 'mobile.fontLarge', sizeClass: 'text-[21px]' },
]

export default function AppearanceGeneralSubpage({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  const {
    readingTheme,
    setReadingTheme,
    fontSize,
    setFontSize,
    useCustomTextColor,
    lightModeTextColor,
    darkModeTextColor,
    setLightModeTextColor,
    setDarkModeTextColor,
    resetTextColors,
    language,
    setLanguage,
  } = useStyleStore()

  const activePalette = READING_THEME_PALETTES[readingTheme]
  const previewTextColor = getEffectiveTextColor(
    readingTheme,
    lightModeTextColor,
    darkModeTextColor,
    useCustomTextColor
  )
  const previewFontClass =
    FONT_OPTIONS.find(opt => opt.key === fontSize)?.sizeClass ?? 'text-[18px]'

  return (
    <div className="h-full w-full flex flex-col bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)]">
      <SubpageHeader title={t('mobileSettings.appearanceGeneral')} onBack={onBack} />

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-safe-4 space-y-4">
        <SectionCard className="space-y-3">
          <h2 className="text-sm font-semibold">{t('mobileSettings.readingTheme')}</h2>
          <div className="grid grid-cols-3 gap-2.5">
            {THEME_CARDS.map(item => {
              const palette = READING_THEME_PALETTES[item.key]
              const active = readingTheme === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setReadingTheme(item.key)}
                  className={`rounded-2xl border p-3 flex flex-col items-center gap-2 transition-all ${
                    active
                      ? 'border-[var(--rb-accent)] ring-2 ring-[var(--rb-accent)]/25'
                      : 'border-[var(--rb-border)]'
                  }`}
                  style={{ backgroundColor: palette.canvas, color: palette.textPrimary }}
                >
                  <span className="rb-serif text-lg font-semibold">Aa</span>
                  <span className="text-xs font-medium">{t(item.labelKey)}</span>
                </button>
              )
            })}
          </div>
        </SectionCard>

        <SectionCard className="space-y-3">
          <h2 className="text-sm font-semibold">{t('mobileSettings.fontSize')}</h2>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--rb-bg-muted)]">
            {FONT_OPTIONS.map(option => {
              const active = fontSize === option.key
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setFontSize(option.key)}
                  className={`h-9 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[var(--rb-bg-surface)] text-[var(--rb-text-primary)] shadow-sm'
                      : 'text-[var(--rb-text-secondary)]'
                  }`}
                >
                  {t(option.labelKey)}
                </button>
              )
            })}
          </div>
          <div
            className="rounded-xl border px-3.5 py-2.5 rb-serif"
            style={{
              backgroundColor: activePalette.canvas,
              borderColor: activePalette.border,
              color: previewTextColor,
            }}
          >
            <p className={previewFontClass}>{t('mobile.fontPreviewSample')}</p>
          </div>
        </SectionCard>

        <SectionCard className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{t('mobileSettings.customTextColor')}</h2>
            {useCustomTextColor && (
              <button
                type="button"
                onClick={resetTextColors}
                className="h-7 px-2.5 rounded-full border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] text-xs font-medium flex items-center gap-1"
              >
                <ReloadOutlined className="text-[11px]" />
                <span>{t('theme.resetTextColor')}</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 py-1">
            <span className="text-sm">{t('mobileSettings.lightTextColor')}</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs font-mono text-[var(--rb-text-secondary)]">
                {lightModeTextColor.toUpperCase()}
              </span>
              <input
                type="color"
                value={lightModeTextColor}
                onChange={e => setLightModeTextColor(e.target.value)}
                className="w-8 h-8 rounded-lg border border-[var(--rb-border)] bg-transparent cursor-pointer"
              />
            </label>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--rb-border)]">
            <span className="text-sm">{t('mobileSettings.darkTextColor')}</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs font-mono text-[var(--rb-text-secondary)]">
                {darkModeTextColor.toUpperCase()}
              </span>
              <input
                type="color"
                value={darkModeTextColor}
                onChange={e => setDarkModeTextColor(e.target.value)}
                className="w-8 h-8 rounded-lg border border-[var(--rb-border)] bg-transparent cursor-pointer"
              />
            </label>
          </div>
        </SectionCard>

        <SectionCard className="space-y-3">
          <h2 className="text-sm font-semibold">{t('mobileSettings.language')}</h2>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--rb-bg-muted)]">
            {[
              { code: 'zh' as const, label: '简体中文' },
              { code: 'en' as const, label: 'English' },
            ].map(item => {
              const active = language === item.code
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setLanguage(item.code)}
                  className={`h-9 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[var(--rb-bg-surface)] text-[var(--rb-text-primary)] shadow-sm'
                      : 'text-[var(--rb-text-secondary)]'
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        </SectionCard>

        <SectionCard className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{t('mobileSettings.about')}</div>
            <div className="text-xs text-[var(--rb-text-secondary)] mt-0.5">
              ReadBridge · Open Source Reader
            </div>
          </div>
          <a
            href="https://github.com/WindChimeEcho/read-bridge"
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-3.5 rounded-full border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] text-xs font-medium flex items-center gap-1.5 text-[var(--rb-text-primary)]"
          >
            <span>{t('mobileSettings.openGithub')}</span>
            <ExportOutlined className="text-[11px]" />
          </a>
        </SectionCard>
      </div>
    </div>
  )
}
