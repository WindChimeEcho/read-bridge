'use client'

import { useCallback, useState } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import {
  type BackupConflictStrategy,
  type BackupImportResult,
  type BackupInspectSummary,
  exportFullBackup as runExportFullBackup,
  importBackupBytes,
  inspectBackupBytes,
} from '@/services/BackupService'
import { fileAdapter } from '@/services/platform/fileAdapter'
import { notify } from '@/services/platform/notify'

export type { BackupConflictStrategy, BackupImportResult, BackupInspectSummary } from '@/services/BackupService'

export interface PendingBackupArchive {
  fileName: string
  bytes: Uint8Array
  summary: BackupInspectSummary
}

export function useBackup() {
  const { t } = useTranslation()
  const [includeApiKeys, setIncludeApiKeys] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [pendingArchive, setPendingArchive] = useState<PendingBackupArchive | null>(null)

  const exportFullBackup = useCallback(async () => {
    if (isExporting) return null
    setIsExporting(true)
    try {
      const result = await runExportFullBackup({ includeApiKeys })
      if (result.saved) {
        notify.success(t('backup.exportSuccess', { filename: result.filename }))
      }
      return result
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      notify.error(t('backup.exportFailed', { error: msg }))
      return null
    } finally {
      setIsExporting(false)
    }
  }, [includeApiKeys, isExporting, t])

  const inspectFile = useCallback(async (file: File) => {
    try {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      const { summary } = await inspectBackupBytes(bytes)
      setPendingArchive({
        fileName: file.name,
        bytes,
        summary,
      })
      return summary
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      notify.error(t('backup.invalidArchive', { error: msg }))
      setPendingArchive(null)
      return null
    }
  }, [t])

  const pickBackupFile = useCallback(async () => {
    const files = await fileAdapter.pickFiles({
      extensions: ['rbk', 'zip'],
      multiple: false,
    })
    const file = files[0]
    if (!file) return null
    return inspectFile(file)
  }, [inspectFile])

  const confirmImport = useCallback(async (
    strategy: BackupConflictStrategy
  ): Promise<BackupImportResult | null> => {
    if (!pendingArchive || isImporting) return null
    setIsImporting(true)
    try {
      const result = await importBackupBytes(pendingArchive.bytes, strategy)
      notify.success(
        t('backup.importSuccess', {
          imported: String(result.importedBooks),
          overwritten: String(result.overwrittenBooks),
          skipped: String(result.skippedBooks),
          bookmarks: String(result.mergedBookmarks),
        })
      )
      setPendingArchive(null)
      return result
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      notify.error(t('backup.importFailed', { error: msg }))
      return null
    } finally {
      setIsImporting(false)
    }
  }, [isImporting, pendingArchive, t])

  const clearPendingArchive = useCallback(() => {
    setPendingArchive(null)
  }, [])

  return {
    includeApiKeys,
    setIncludeApiKeys,
    isExporting,
    isImporting,
    pendingArchive,
    exportFullBackup,
    inspectFile,
    pickBackupFile,
    confirmImport,
    clearPendingArchive,
  }
}
