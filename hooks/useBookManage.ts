'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { exportSingleBookBackup } from '@/services/BackupService'
import db from '@/services/DB'
import { notify } from '@/services/platform/notify'
import { useBookmarkStore } from '@/store/useBookmarkStore'
import { useReaderSessionStore } from '@/store/useReaderSessionStore'
import { useReadingProgressStore } from '@/store/useReadingProgress'
import { useSiderStore } from '@/store/useSiderStore'
import type { Book } from '@/types/book'

export function useBookManage(bookId: string, options: { enabled?: boolean } = {}) {
  const { enabled = true } = options
  const { t } = useTranslation()
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const { readingId, setReadingId } = useSiderStore()
  const { updateReadingProgress } = useReadingProgressStore()
  const { removeAllBookmarks } = useBookmarkStore()
  const resetSession = useReaderSessionStore(state => state.resetSession)

  const reload = useCallback(async () => {
    if (!bookId || !enabled) {
      if (!bookId) setBook(null)
      return null
    }
    setLoading(true)
    try {
      const fetchedBook = await db.getBook(bookId)
      setBook(fetchedBook)
      return fetchedBook
    } catch (error) {
      console.error('Error fetching book:', error)
      notify.error(t('common.templates.loadFailed', { entity: t('common.entities.bookDetails') }))
      return null
    } finally {
      setLoading(false)
    }
  }, [bookId, enabled, t])

  useEffect(() => {
    void reload()
  }, [reload])

  const saveBookChanges = useCallback(async (updatedBook: Book): Promise<boolean> => {
    if (!book) {
      notify.error(t('common.templates.loadFailed', { entity: t('common.entities.bookDetails') }))
      return false
    }

    setSaving(true)
    try {
      const mergedBook: Book = {
        ...book,
        ...updatedBook,
      }
      await db.updateBook(bookId, mergedBook)
      setBook(mergedBook)
      if (readingId === bookId) {
        await updateReadingProgress(bookId)
      }
      notify.success(t('common.templates.updateSuccess', { entity: t('common.entities.bookGeneric') }))
      return true
    } catch (error) {
      console.error('Error updating book:', error)
      notify.error(t('common.templates.updateFailed', { entity: t('common.entities.bookGeneric') }))
      return false
    } finally {
      setSaving(false)
    }
  }, [book, bookId, readingId, t, updateReadingProgress])

  const deleteBook = useCallback(async (): Promise<boolean> => {
    if (!bookId) return false

    setSaving(true)
    try {
      await db.deleteBook(bookId)
      removeAllBookmarks(bookId)
      if (bookId === readingId) {
        setReadingId(null)
        resetSession()
      }
      setBook(null)
      notify.success(t('common.templates.deleteSuccess', { entity: t('common.entities.bookGeneric') }))
      return true
    } catch (error) {
      console.error('Error deleting book:', error)
      notify.error(t('common.templates.deleteFailed', { entity: t('common.entities.bookGeneric') }))
      return false
    } finally {
      setSaving(false)
    }
  }, [bookId, readingId, removeAllBookmarks, resetSession, setReadingId, t])

  const exportSingleBook = useCallback(async () => {
    if (!bookId) return
    setSaving(true)
    try {
      const result = await exportSingleBookBackup(bookId)
      if (result.saved) {
        notify.success(t('backup.singleExportSuccess', { filename: result.filename }))
      }
    } catch (error) {
      console.error('Error exporting book backup:', error)
      const msg = error instanceof Error ? error.message : String(error)
      notify.error(t('backup.exportFailed', { error: msg }))
    } finally {
      setSaving(false)
    }
  }, [bookId, t])

  return {
    book,
    loading,
    saving,
    reload,
    saveBookChanges,
    deleteBook,
    exportSingleBook,
  }
}
