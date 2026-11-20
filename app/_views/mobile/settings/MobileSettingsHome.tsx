'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlignLeftOutlined,
  ApiOutlined,
  AppstoreOutlined,
  BgColorsOutlined,
  CloudSyncOutlined,
  FileWordOutlined,
  OrderedListOutlined,
  RightOutlined,
  SoundOutlined,
} from '@ant-design/icons'
import { useTranslation } from '@/i18n/useTranslation'
import { registerBackHandler } from '@/services/platform/backAdapter'
import { useLLMStore } from '@/store/useLLMStore'
import { useOutputOptions } from '@/store/useOutputOptions'
import { useStyleStore } from '@/store/useStyleStore'
import { useTTSStore } from '@/store/useTTSStore'
import AiProvidersSubpage from './AiProvidersSubpage'
import AppearanceGeneralSubpage from './AppearanceGeneralSubpage'
import BackupDataSubpage from './BackupDataSubpage'
import DefaultModelSubpage from './DefaultModelSubpage'
import PromptRulesSubpage from './PromptRulesSubpage'
import SentenceRulesSubpage from './SentenceRulesSubpage'
import { SubpageHeader } from './SettingsPrimitives'
import TTSSubpage from './TTSSubpage'
import WordRulesSubpage from './WordRulesSubpage'

type SettingsSubpageKey =
  | 'ai'
  | 'models'
  | 'prompts'
  | 'sentence'
  | 'word'
  | 'tts'
  | 'appearance'
  | 'backup'

interface MenuEntry {
  key: SettingsSubpageKey
  icon: ReactNode
  title: string
  description: string
  summary?: string
}

export default function MobileSettingsHome() {
  const router = useRouter()
  const { t } = useTranslation()
  const [activeSubpage, setActiveSubpage] = useState<SettingsSubpageKey | null>(null)

  const { providers, parseModel, chatModel } = useLLMStore()
  const { promptOptions, sentenceOptions, wordOptions } = useOutputOptions()
  const { ttsConfig } = useTTSStore()
  const { readingTheme, language } = useStyleStore()

  useEffect(() => {
    if (!activeSubpage) return
    return registerBackHandler(50, () => {
      setActiveSubpage(null)
      return true
    })
  }, [activeSubpage])

  if (activeSubpage === 'ai') {
    return <AiProvidersSubpage onBack={() => setActiveSubpage(null)} />
  }
  if (activeSubpage === 'models') {
    return <DefaultModelSubpage onBack={() => setActiveSubpage(null)} />
  }
  if (activeSubpage === 'prompts') {
    return <PromptRulesSubpage onBack={() => setActiveSubpage(null)} />
  }
  if (activeSubpage === 'sentence') {
    return <SentenceRulesSubpage onBack={() => setActiveSubpage(null)} />
  }
  if (activeSubpage === 'word') {
    return <WordRulesSubpage onBack={() => setActiveSubpage(null)} />
  }
  if (activeSubpage === 'tts') {
    return <TTSSubpage onBack={() => setActiveSubpage(null)} />
  }
  if (activeSubpage === 'appearance') {
    return <AppearanceGeneralSubpage onBack={() => setActiveSubpage(null)} />
  }
  if (activeSubpage === 'backup') {
    return <BackupDataSubpage onBack={() => setActiveSubpage(null)} />
  }

  const configuredCount = providers.filter(p => Boolean(p.apiKey && p.models.length > 0)).length
  const modelSummary = parseModel?.name || chatModel?.name || t('mobileSettings.notConfigured')
  const themeLabelMap = {
    paper: 'Paper',
    light: 'White',
    dark: 'Dark',
  } as const

  const groups: Array<{ title: string; items: MenuEntry[] }> = [
    {
      title: t('mobileSettings.groupAi'),
      items: [
        {
          key: 'ai',
          icon: <ApiOutlined />,
          title: t('mobileSettings.aiProviders'),
          description: t('mobileSettings.aiProvidersDesc'),
          summary: `${configuredCount}/${providers.length}`,
        },
        {
          key: 'models',
          icon: <AppstoreOutlined />,
          title: t('mobileSettings.defaultModels'),
          description: t('mobileSettings.defaultModelsDesc'),
          summary: modelSummary,
        },
      ],
    },
    {
      title: t('mobileSettings.groupReading'),
      items: [
        {
          key: 'prompts',
          icon: <AlignLeftOutlined />,
          title: t('mobileSettings.promptRules'),
          description: t('mobileSettings.promptRulesDesc'),
          summary: String(promptOptions.length),
        },
        {
          key: 'sentence',
          icon: <OrderedListOutlined />,
          title: t('mobileSettings.sentenceRules'),
          description: t('mobileSettings.sentenceRulesDesc'),
          summary: String(sentenceOptions.length),
        },
        {
          key: 'word',
          icon: <FileWordOutlined />,
          title: t('mobileSettings.wordRules'),
          description: t('mobileSettings.wordRulesDesc'),
          summary: String(wordOptions.length),
        },
        {
          key: 'tts',
          icon: <SoundOutlined />,
          title: t('mobileSettings.ttsSettings'),
          description: t('mobileSettings.ttsSettingsDesc'),
          summary: `${ttsConfig.system.speedRatio.toFixed(1)}x`,
        },
      ],
    },
    {
      title: t('mobileSettings.groupGeneral'),
      items: [
        {
          key: 'appearance',
          icon: <BgColorsOutlined />,
          title: t('mobileSettings.appearanceGeneral'),
          description: t('mobileSettings.appearanceGeneralDesc'),
          summary: `${themeLabelMap[readingTheme]} · ${language === 'zh' ? '中文' : 'EN'}`,
        },
        {
          key: 'backup',
          icon: <CloudSyncOutlined />,
          title: t('mobileSettings.backupData'),
          description: t('mobileSettings.backupDataDesc'),
          summary: '.rbk',
        },
      ],
    },
  ]

  return (
    <div className="h-full w-full flex flex-col bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)]">
      <SubpageHeader title={t('common.settings')} onBack={() => router.push('/')} />

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 pb-safe space-y-5">
        {groups.map(group => (
          <div key={group.title} className="space-y-2">
            <div className="px-1 text-xs font-semibold uppercase tracking-wide text-[var(--rb-text-secondary)]">
              {group.title}
            </div>
            <div className="rounded-2xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] divide-y divide-[var(--rb-border)] overflow-hidden">
              {group.items.map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveSubpage(item.key)}
                  className="w-full px-3.5 py-3 flex items-center gap-3 text-left active:bg-[var(--rb-bg-muted)] transition-colors"
                >
                  <span className="w-9 h-9 rounded-xl bg-[var(--rb-highlight-bg)] text-[var(--rb-accent)] flex items-center justify-center text-base shrink-0">
                    {item.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{item.title}</div>
                    <div className="text-xs text-[var(--rb-text-secondary)] truncate mt-0.5">
                      {item.description}
                    </div>
                  </div>
                  {item.summary && (
                    <span className="max-w-[96px] truncate text-xs text-[var(--rb-text-secondary)] shrink-0">
                      {item.summary}
                    </span>
                  )}
                  <RightOutlined className="text-[11px] text-[var(--rb-text-secondary)] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
