'use client'

import { useState } from 'react'
import {
  CloudDownloadOutlined,
  CloudUploadOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { type BackupConflictStrategy, useBackup } from '@/hooks/useBackup'
import { useTranslation } from '@/i18n/useTranslation'
import { SectionCard, SubpageHeader, ToggleSwitch } from './SettingsPrimitives'

export default function BackupDataSubpage({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  const {
    includeApiKeys,
    setIncludeApiKeys,
    isExporting,
    isImporting,
    pendingArchive,
    exportFullBackup,
    pickBackupFile,
    confirmImport,
    clearPendingArchive,
  } = useBackup()

  const [strategy, setStrategy] = useState<BackupConflictStrategy>('skip')

  return (
    <div className="h-full w-full flex flex-col bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)]">
      <SubpageHeader title={t('mobileSettings.backupData')} onBack={onBack} />

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-safe-4 space-y-4">
        <SectionCard className="space-y-3">
          <div className="text-sm font-semibold">{t('backup.title')}</div>
          <p className="text-xs leading-relaxed text-[var(--rb-text-secondary)]">
            {t('backup.description')}
          </p>

          <div className="pt-2 border-t border-[var(--rb-border)] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium">{t('backup.includeApiKeys')}</div>
              <div className="text-[11px] text-[var(--rb-text-secondary)] mt-0.5 leading-relaxed">
                {t('backup.includeApiKeysHint')}
              </div>
            </div>
            <ToggleSwitch
              checked={includeApiKeys}
              onChange={setIncludeApiKeys}
              ariaLabel={t('backup.includeApiKeys')}
            />
          </div>

          <button
            type="button"
            disabled={isExporting}
            onClick={() => {
              void exportFullBackup()
            }}
            className="w-full h-11 rounded-xl bg-[var(--rb-accent)] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 active:opacity-90"
          >
            {isExporting ? <LoadingOutlined /> : <CloudDownloadOutlined />}
            <span>{isExporting ? t('backup.exporting') : t('backup.exportButton')}</span>
          </button>
        </SectionCard>

        <SectionCard className="space-y-3">
          <button
            type="button"
            disabled={isImporting}
            onClick={() => {
              void pickBackupFile()
            }}
            className="w-full h-11 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 active:bg-[var(--rb-bg-muted)]"
          >
            <CloudUploadOutlined />
            <span>{t('backup.importButton')}</span>
          </button>

          {pendingArchive && (
            <div className="pt-3 border-t border-[var(--rb-border)] space-y-3">
              <div className="text-xs font-semibold text-[var(--rb-accent)]">
                {t('backup.summaryTitle')}
              </div>

              <div className="rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] p-3 space-y-1.5 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--rb-text-secondary)]">{t('backup.fileName')}</span>
                  <span className="font-medium truncate max-w-[190px]">{pendingArchive.fileName}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--rb-text-secondary)]">{t('backup.exportType')}</span>
                  <span className="font-medium">
                    {pendingArchive.summary.manifest.exportType === 'full'
                      ? t('backup.typeFull')
                      : t('backup.typeBook')}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--rb-text-secondary)]">{t('backup.booksCount')}</span>
                  <span className="font-medium">
                    {t('backup.booksSummary', {
                      total: String(pendingArchive.summary.totalBooks),
                      newCount: String(pendingArchive.summary.newBookCount),
                      duplicateCount: String(pendingArchive.summary.duplicateBookCount),
                    })}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--rb-text-secondary)]">{t('backup.bookmarksCount')}</span>
                  <span className="font-medium">{pendingArchive.summary.totalBookmarks}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--rb-text-secondary)]">{t('backup.historiesCount')}</span>
                  <span className="font-medium">{pendingArchive.summary.totalHistories}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--rb-text-secondary)]">{t('backup.settingsIncluded')}</span>
                  <span className="font-medium">
                    {pendingArchive.summary.hasSettings ? t('backup.yes') : t('backup.no')}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[var(--rb-text-secondary)]">{t('backup.apiKeyStatus')}</span>
                  <span className="font-medium">
                    {pendingArchive.summary.includeApiKeys
                      ? t('backup.apiKeysIncludedTag')
                      : t('backup.apiKeysRedactedTag')}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-[var(--rb-text-secondary)]">
                  {t('backup.strategyLabel')}
                </div>

                {(['skip', 'overwrite'] as const).map(option => {
                  const active = strategy === option
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setStrategy(option)}
                      className={`w-full px-3 py-2.5 rounded-xl border text-left text-xs font-medium flex items-center gap-2.5 ${
                        active
                          ? 'border-[var(--rb-accent)] bg-[var(--rb-highlight-bg)] text-[var(--rb-accent)]'
                          : 'border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)]'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          active ? 'border-[var(--rb-accent)]' : 'border-[var(--rb-border)]'
                        }`}
                      >
                        {active && <span className="w-2 h-2 rounded-full bg-[var(--rb-accent)]" />}
                      </span>
                      <span>
                        {option === 'skip' ? t('backup.strategySkip') : t('backup.strategyOverwrite')}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={clearPendingArchive}
                  className="h-10 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] text-xs font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={() => {
                    void confirmImport(strategy)
                  }}
                  className="h-10 rounded-xl bg-[var(--rb-accent)] text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {isImporting && <LoadingOutlined />}
                  <span>{isImporting ? t('backup.importing') : t('backup.confirmImport')}</span>
                </button>
              </div>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
