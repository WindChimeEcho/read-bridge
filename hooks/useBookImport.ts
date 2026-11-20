'use client'

import { useCallback, useRef, useState } from 'react'
import { BOOK_FORMAT } from '@/constants/book'
import { UPLOAD_CONFIG } from '@/constants/upload'
import { useTranslation } from '@/i18n/useTranslation'
import db from '@/services/DB'
import { handleFileUpload } from '@/services/ServerUpload'
import { fileAdapter } from '@/services/platform/fileAdapter'
import { notify } from '@/services/platform/notify'

export interface ImportProgress {
  total: number
  done: number
  failed: number
}

export function isSupportedBookFile(file: File): boolean {
  const fileExtension = file.name.split('.').pop()?.toLowerCase()
  return Object.values(BOOK_FORMAT).some(
    format => format.toLowerCase() === fileExtension
  )
}

export function useBookImport() {
  const { t } = useTranslation()
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState<ImportProgress>({ total: 0, done: 0, failed: 0 })
  const importingRef = useRef(false)

  const importFiles = useCallback(async (files: File[]): Promise<{ importedIds: string[]; failedCount: number }> => {
    if (files.length === 0 || importingRef.current) {
      return { importedIds: [], failedCount: 0 }
    }

    const invalidFiles = files.filter(file => !isSupportedBookFile(file))
    if (invalidFiles.length > 0) {
      const supportedFormats = Object.values(BOOK_FORMAT).join('/')
      const fileNames = invalidFiles.map(file => file.name).join(', ')
      notify.error(t('uploader.formatNotSupported', { fileNames, supportedFormats }))
    }

    if (files.length > UPLOAD_CONFIG.MAX_BOOK_COUNT) {
      notify.error(t('uploader.maxCountExceeded', { maxCount: UPLOAD_CONFIG.MAX_BOOK_COUNT.toString() }))
      return { importedIds: [], failedCount: files.length }
    }

    const validFiles = files.filter(isSupportedBookFile)
    if (validFiles.length === 0) {
      return { importedIds: [], failedCount: invalidFiles.length }
    }

    importingRef.current = true
    setIsImporting(true)
    setProgress({ total: validFiles.length, done: 0, failed: 0 })

    const importedIds: string[] = []
    let failedCount = 0
    let doneCount = 0

    try {
      for (const file of validFiles) {
        try {
          const book = await handleFileUpload(file)
          const id = await db.addBook(book)
          importedIds.push(id)
          notify.success(t('uploader.importSuccess', { fileName: file.name }))
        } catch (error) {
          failedCount += 1
          if (error instanceof Error) {
            notify.error(t('uploader.importFailedWithError', {
              fileName: file.name,
              error: error.message,
            }))
          } else {
            notify.error(t('uploader.importFailed', { fileName: file.name }))
          }
        } finally {
          doneCount += 1
          setProgress({
            total: validFiles.length,
            done: doneCount,
            failed: failedCount,
          })
        }
      }
    } finally {
      importingRef.current = false
      setIsImporting(false)
    }

    return { importedIds, failedCount }
  }, [t])

  const pickAndImport = useCallback(async () => {
    const files = await fileAdapter.pickFiles({
      extensions: Object.values(BOOK_FORMAT),
      multiple: true,
    })
    if (files.length === 0) {
      return { importedIds: [], failedCount: 0 }
    }
    return importFiles(files)
  }, [importFiles])

  return {
    isImporting,
    progress,
    importFiles,
    pickAndImport,
  }
}
