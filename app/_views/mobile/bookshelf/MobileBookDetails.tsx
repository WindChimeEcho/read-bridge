'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'
import {
  ArrowLeftOutlined,
  EditOutlined,
  ExportOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { COMMON_LANGUAGES } from '@/constants/book'
import { useBookManage } from '@/hooks/useBookManage'
import { useTranslation } from '@/i18n/useTranslation'
import { registerBackHandler } from '@/services/platform/backAdapter'
import { useSiderStore } from '@/store/useSiderStore'
import MobileCoverImage from '../components/MobileCoverImage'

interface MobileBookDetailsProps {
  bookId: string
  onClose: () => void
  onOpenEdit: (bookId: string) => void
}

export default function MobileBookDetails({
  bookId,
  onClose,
  onOpenEdit,
}: MobileBookDetailsProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const setReadingId = useSiderStore(state => state.setReadingId)
  const { book, loading, exportSingleBook } = useBookManage(bookId, { enabled: true })

  useEffect(() => {
    return registerBackHandler(60, () => {
      onClose()
      return true
    })
  }, [onClose])

  const description = typeof book?.metadata?.description === 'string'
    ? book.metadata.description
    : ''
  const languageCode = book?.metadata?.language || ''
  const languageLabel =
    COMMON_LANGUAGES.find(item => item.code === languageCode)?.name ||
    languageCode ||
    'Unknown'

  const handleStartReading = () => {
    if (!book) return
    setReadingId(book.id)
    onClose()
    router.push('/read')
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)]">
      <header className="pt-safe shrink-0 border-b border-[var(--rb-border)] bg-[var(--rb-bg-chrome)]">
        <div className="h-14 px-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center active:bg-[var(--rb-bg-muted)]"
            aria-label={t('common.back')}
          >
            <ArrowLeftOutlined className="text-base" />
          </button>
          <h1 className="text-base font-semibold truncate">{t('mobile.bookDetails')}</h1>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-safe-4 space-y-4">
        {loading || !book ? (
          <div className="py-16 flex items-center justify-center text-[var(--rb-text-secondary)]">
            <LoadingOutlined className="text-2xl" />
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] p-4 shadow-sm flex gap-4">
              <MobileCoverImage
                cover={book.metadata.cover}
                title={book.title}
                className="w-24 h-36 rounded-xl shrink-0 shadow-sm"
              />
              <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                <div>
                  <h2 className="text-lg font-bold leading-snug line-clamp-2">{book.title}</h2>
                  <p className="text-xs text-[var(--rb-text-secondary)] mt-1 truncate">
                    {book.author || book.metadata.author || t('mobile.unknownAuthor')}
                  </p>
                </div>

                <div className="space-y-1.5 mt-3">
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--rb-highlight-bg)] text-[var(--rb-accent)]">
                    {languageLabel}
                  </div>
                  <div className="text-xs text-[var(--rb-text-secondary)] flex flex-wrap gap-x-3 gap-y-1">
                    <span>{t('mobile.chapterLabel', { count: String(book.chapterList.length) })}</span>
                    <span>
                      {t('mobile.addedOn')} {dayjs(book.createTime).format('YYYY-MM-DD')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] p-4 shadow-sm">
              <h3 className="text-sm font-semibold mb-2">{t('mobile.description')}</h3>
              <p className="text-sm leading-relaxed text-[var(--rb-text-secondary)] whitespace-pre-wrap">
                {description || t('mobile.noDescription')}
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleStartReading}
                className="w-full h-11 rounded-full bg-[var(--rb-accent)] text-white text-sm font-semibold shadow-sm active:opacity-90"
              >
                {t('mobile.continueReading')}
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onOpenEdit(book.id)
                  }}
                  className="h-11 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] text-sm font-medium flex items-center justify-center gap-2 active:bg-[var(--rb-bg-muted)]"
                >
                  <EditOutlined />
                  <span>{t('mobile.editAndChapters')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void exportSingleBook()
                  }}
                  className="h-11 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] text-sm font-medium flex items-center justify-center gap-2 active:bg-[var(--rb-bg-muted)]"
                >
                  <ExportOutlined />
                  <span>{t('mobile.exportBook')}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
