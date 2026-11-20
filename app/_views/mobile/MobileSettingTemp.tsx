'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useTranslation } from '@/i18n/useTranslation'
import {
  AiSection,
  DefaultModelSection,
  PromptSection,
  SentenceProcessingSection,
  TTSSection,
  WordProcessingSection,
} from '@/app/setting/components'

export default function MobileSettingTemp() {
  const router = useRouter()
  const { t } = useTranslation()

  const sections = [
    { key: 'ai', label: t('settings.aiSettings'), element: <AiSection /> },
    { key: 'defaultModel', label: t('settings.modelConfig'), element: <DefaultModelSection /> },
    { key: 'prompt', label: t('settings.promptConfig'), element: <PromptSection /> },
    { key: 'sentenceProcessing', label: t('settings.sentenceConfig'), element: <SentenceProcessingSection /> },
    { key: 'wordProcessing', label: t('settings.wordConfig'), element: <WordProcessingSection /> },
    { key: 'tts', label: t('settings.ttsConfig'), element: <TTSSection /> },
  ]

  return (
    <div className="h-full w-full flex flex-col bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)]">
      <header className="pt-safe shrink-0 border-b border-[var(--rb-border)] bg-[var(--rb-bg-chrome)]">
        <div className="h-14 px-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="h-9 px-2 -ml-1 rounded-full flex items-center gap-1.5 text-sm font-medium text-[var(--rb-text-primary)] active:bg-[var(--rb-bg-muted)]"
            aria-label={t('mobile.backToBookshelf')}
          >
            <ArrowLeftOutlined className="text-base" />
            <span>{t('mobile.backToBookshelf')}</span>
          </button>
          <h1 className="text-base font-semibold truncate">{t('common.settings')}</h1>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 pb-safe space-y-6">
        {sections.map(section => (
          <section
            key={section.key}
            className="rounded-2xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] p-3 overflow-x-auto"
          >
            <h2 className="text-base font-semibold mb-3">{section.label}</h2>
            {section.element}
          </section>
        ))}
      </div>
    </div>
  )
}
