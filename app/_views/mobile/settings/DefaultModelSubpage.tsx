'use client'

import { useEffect, useMemo } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { useLLMStore } from '@/store/useLLMStore'
import type { ReasoningEffort, ThinkingConfig, ThinkingMode } from '@/types/llm'
import MobileSelect, { type MobileSelectGroup } from '../components/MobileSelect'
import { SectionCard, SubpageHeader } from './SettingsPrimitives'

export default function DefaultModelSubpage({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  const {
    providers,
    chatModel,
    setChatModel,
    parseModel,
    setParseModel,
    chatThinking,
    setChatThinking,
    parseThinking,
    setParseThinking,
  } = useLLMStore()

  const configuredProviders = useMemo(() => {
    return providers.filter(provider => {
      const needsBaseUrl = !provider.protocol || provider.protocol === 'openai-compatible'
      return Boolean(provider.apiKey && provider.models.length > 0 && (!needsBaseUrl || provider.baseUrl))
    })
  }, [providers])

  const availableModels = useMemo(
    () => configuredProviders.flatMap(provider => provider.models),
    [configuredProviders]
  )

  const modelGroups = useMemo<MobileSelectGroup[]>(() => (
    configuredProviders.map(provider => ({
      label: provider.name,
      options: provider.models.map(model => ({
        value: `${provider.id}:${model.id}`,
        label: model.name,
        description: model.id !== model.name ? model.id : undefined,
      })),
    }))
  ), [configuredProviders])

  const hasModels = availableModels.length > 0

  useEffect(() => {
    if (!hasModels) {
      if (chatModel) setChatModel(null)
      if (parseModel) setParseModel(null)
    }
  }, [hasModels, chatModel, parseModel, setChatModel, setParseModel])

  const modeOptions: Array<{ value: ThinkingMode; label: string }> = [
    { value: 'default', label: t('settings.thinkingModeDefault') },
    { value: 'enabled', label: t('settings.thinkingModeEnabled') },
    { value: 'disabled', label: t('settings.thinkingModeDisabled') },
  ]

  const effortOptions: Array<{ value: ReasoningEffort; label: string }> = [
    { value: 'low', label: t('settings.reasoningEffortLow') },
    { value: 'medium', label: t('settings.reasoningEffortMedium') },
    { value: 'high', label: t('settings.reasoningEffortHigh') },
  ]

  const renderThinkingControls = (
    thinking: ThinkingConfig,
    onChange: (next: ThinkingConfig) => void
  ) => (
    <div className="space-y-3 pt-2 border-t border-[var(--rb-border)]">
      <div>
        <div className="text-xs font-medium text-[var(--rb-text-secondary)] mb-1.5">
          {t('settings.thinkingMode')}
        </div>
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--rb-bg-muted)]">
          {modeOptions.map(option => {
            const active = thinking.mode === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ ...thinking, mode: option.value })}
                className={`h-8 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[var(--rb-bg-surface)] text-[var(--rb-text-primary)] shadow-sm'
                    : 'text-[var(--rb-text-secondary)]'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-[var(--rb-text-secondary)] mb-1.5">
          {t('settings.reasoningEffort')}
        </div>
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--rb-bg-muted)]">
          {effortOptions.map(option => {
            const active = thinking.effort === option.value
            return (
              <button
                key={option.value}
                type="button"
                disabled={thinking.mode === 'disabled'}
                onClick={() => onChange({ ...thinking, effort: option.value })}
                className={`h-8 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 ${
                  active
                    ? 'bg-[var(--rb-bg-surface)] text-[var(--rb-text-primary)] shadow-sm'
                    : 'text-[var(--rb-text-secondary)]'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-full w-full flex flex-col bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)]">
      <SubpageHeader title={t('mobileSettings.defaultModels')} onBack={onBack} />

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-safe-4 space-y-4">
        {!hasModels ? (
          <SectionCard>
            <p className="text-sm text-[var(--rb-text-secondary)] leading-relaxed">
              {t('mobileSettings.noConfiguredProviders')}
            </p>
          </SectionCard>
        ) : (
          <>
            <SectionCard className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold">{t('settings.analyticalModel')}</h2>
                <p className="text-xs text-[var(--rb-text-secondary)] mt-0.5">
                  {t('settings.analyticalModelTooltip')}
                </p>
              </div>

              <MobileSelect
                variant="field"
                surface="canvas"
                title={t('settings.analyticalModel')}
                placeholder={t('settings.selectAnalyticalModel')}
                clearLabel={t('mobileSettings.clearSelection')}
                value={parseModel ? `${parseModel.providerId}:${parseModel.id}` : ''}
                onChange={raw => {
                  if (!raw) {
                    setParseModel(null)
                    return
                  }
                  const found = availableModels.find(m => `${m.providerId}:${m.id}` === raw)
                  if (found) setParseModel(found)
                }}
                groups={modelGroups}
              />

              {renderThinkingControls(parseThinking, setParseThinking)}
            </SectionCard>

            <SectionCard className="space-y-3">
              <div>
                <h2 className="text-sm font-semibold">{t('settings.chatModel')}</h2>
                <p className="text-xs text-[var(--rb-text-secondary)] mt-0.5">
                  {t('settings.chatModelTooltip')}
                </p>
              </div>

              <MobileSelect
                variant="field"
                surface="canvas"
                title={t('settings.chatModel')}
                placeholder={t('settings.selectChatModel')}
                clearLabel={t('mobileSettings.clearSelection')}
                value={chatModel ? `${chatModel.providerId}:${chatModel.id}` : ''}
                onChange={raw => {
                  if (!raw) {
                    setChatModel(null)
                    return
                  }
                  const found = availableModels.find(m => `${m.providerId}:${m.id}` === raw)
                  if (found) setChatModel(found)
                }}
                groups={modelGroups}
              />

              {renderThinkingControls(chatThinking, setChatThinking)}
            </SectionCard>
          </>
        )}
      </div>
    </div>
  )
}
