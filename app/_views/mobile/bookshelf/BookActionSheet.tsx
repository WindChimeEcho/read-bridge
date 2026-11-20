'use client'

import { useEffect, useState } from 'react'
import {
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { useBookManage } from '@/hooks/useBookManage'
import { useTranslation } from '@/i18n/useTranslation'
import { registerBackHandler } from '@/services/platform/backAdapter'
import type { BookPreview } from '@/types/book'
import MobileCoverImage from '../components/MobileCoverImage'

interface BookActionSheetProps {
  book: BookPreview | null
  onClose: () => void
  onOpenDetails: (bookId: string) => void
  onOpenEdit: (bookId: string) => void
}

export default function BookActionSheet({
  book,
  onClose,
  onOpenDetails,
  onOpenEdit,
}: BookActionSheetProps) {
  const { t } = useTranslation()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const { deleteBook, exportSingleBook, saving } = useBookManage(book?.id ?? '', {
    enabled: false,
  })

  useEffect(() => {
    setConfirmingDelete(false)
  }, [book?.id])

  useEffect(() => {
    if (!book) return
    return registerBackHandler(80, () => {
      onClose()
      return true
    })
  }, [book, onClose])

  if (!book) return null

  const handleDeleteClick = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true)
      return
    }
    const deleted = await deleteBook()
    if (deleted) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/45 transition-opacity"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={book.title}
        className="relative z-10 rounded-t-3xl bg-[var(--rb-bg-surface)] text-[var(--rb-text-primary)] shadow-2xl border-t border-[var(--rb-border)] pb-safe"
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--rb-border)]" />
        </div>

        <div className="px-5 py-3 flex items-center gap-3.5 border-b border-[var(--rb-border)]">
          <MobileCoverImage
            cover={book.cover}
            title={book.title}
            className="w-11 h-16 rounded-lg shrink-0"
            showTitleFallback={false}
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{book.title}</div>
            <div className="text-xs text-[var(--rb-text-secondary)] truncate mt-0.5">
              {book.author || t('mobile.unknownAuthor')}
            </div>
          </div>
        </div>

        <div className="p-3 space-y-1">
          <button
            type="button"
            onClick={() => {
              const targetId = book.id
              onClose()
              onOpenDetails(targetId)
            }}
            className="w-full px-3.5 py-3 rounded-xl flex items-center gap-3 text-sm font-medium text-left active:bg-[var(--rb-bg-muted)]"
          >
            <InfoCircleOutlined className="text-base text-[var(--rb-text-secondary)]" />
            <span>{t('mobile.bookDetails')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const targetId = book.id
              onClose()
              onOpenEdit(targetId)
            }}
            className="w-full px-3.5 py-3 rounded-xl flex items-center gap-3 text-sm font-medium text-left active:bg-[var(--rb-bg-muted)]"
          >
            <EditOutlined className="text-base text-[var(--rb-text-secondary)]" />
            <span>{t('mobile.editInfoAndChapters')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              void exportSingleBook()
              onClose()
            }}
            className="w-full px-3.5 py-3 rounded-xl flex items-center gap-3 text-sm font-medium text-left active:bg-[var(--rb-bg-muted)]"
          >
            <ExportOutlined className="text-base text-[var(--rb-text-secondary)]" />
            <span>{t('mobile.exportBackup')}</span>
          </button>

          <div className="pt-1 border-t border-[var(--rb-border)]">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                void handleDeleteClick()
              }}
              className={`w-full px-3.5 py-3 rounded-xl flex items-center gap-3 text-sm font-medium text-left transition-colors ${
                confirmingDelete
                  ? 'bg-red-500/12 text-red-600 dark:text-red-400'
                  : 'text-red-500 active:bg-red-500/10'
              }`}
            >
              <DeleteOutlined className="text-base" />
              <span>
                {confirmingDelete
                  ? t('mobile.confirmDeleteBook', { title: book.title })
                  : t('mobile.deleteBook')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
