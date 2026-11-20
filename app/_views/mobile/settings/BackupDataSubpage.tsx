'use client'

import { CloudDownloadOutlined, CloudUploadOutlined } from '@ant-design/icons'
import { useTranslation } from '@/i18n/useTranslation'
import { notify } from '@/services/platform/notify'
import { SectionCard, SubpageHeader } from './SettingsPrimitives'

export default function BackupDataSubpage({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()

  const handleStage4Notice = () => {
    notify.info(t('mobileSettings.backupReadyNotice'))
  }

  return (
    <div className="h-full w-full flex flex-col bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)]">
      <SubpageHeader title={t('mobileSettings.backupData')} onBack={onBack} />

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 pb-safe space-y-4">
        <SectionCard className="space-y-2">
          <div className="text-sm font-semibold">{t('mobileSettings.backupData')}</div>
          <p className="text-xs leading-relaxed text-[var(--rb-text-secondary)]">
            {t('mobileSettings.backupReadyNotice')}
          </p>
        </SectionCard>

        <SectionCard className="space-y-3">
          <button
            type="button"
            onClick={handleStage4Notice}
            className="w-full h-11 rounded-xl bg-[var(--rb-accent)] text-white text-sm font-semibold flex items-center justify-center gap-2 active:opacity-90"
          >
            <CloudDownloadOutlined />
            <span>{t('mobileSettings.fullExportTitle')}</span>
          </button>

          <button
            type="button"
            onClick={handleStage4Notice}
            className="w-full h-11 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] text-sm font-medium flex items-center justify-center gap-2 active:bg-[var(--rb-bg-muted)]"
          >
            <CloudUploadOutlined />
            <span>{t('mobileSettings.fullImportTitle')}</span>
          </button>
        </SectionCard>
      </div>
    </div>
  )
}
