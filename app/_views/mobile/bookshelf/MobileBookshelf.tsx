'use client'

import type React from 'react'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOutlined,
  LoadingOutlined,
  PlusOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { LogoIcon } from '@/assets/icon'
import { useBookshelf } from '@/hooks/useBook'
import { useBookImport } from '@/hooks/useBookImport'
import { useTranslation } from '@/i18n/useTranslation'
import { useSiderStore } from '@/store/useSiderStore'
import type { BookPreview } from '@/types/book'
import MobileCoverImage from '../components/MobileCoverImage'
import BookActionSheet from './BookActionSheet'
import MobileBookDetails from './MobileBookDetails'
import MobileBookEditor from './MobileBookEditor'

const LONG_PRESS_MS = 500
const MOVE_CANCEL_PX = 10

export default function MobileBookshelf() {
  const router = useRouter()
  const { t } = useTranslation()
  const { books, recentReading } = useBookshelf()
  const { isImporting, pickAndImport } = useBookImport()
  const setReadingId = useSiderStore(state => state.setReadingId)

  const [actionBook, setActionBook] = useState<BookPreview | null>(null)
  const [detailBookId, setDetailBookId] = useState<string | null>(null)
  const [editBookId, setEditBookId] = useState<string | null>(null)

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressOriginRef = useRef<{ x: number; y: number } | null>(null)
  const longPressFiredIdRef = useRef<string | null>(null)

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    pressOriginRef.current = null
  }

  const openReader = (bookId: string) => {
    setReadingId(bookId)
    router.push('/read')
  }

  const handlePointerDown = (book: BookPreview, e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    clearLongPress()
    longPressFiredIdRef.current = null
    pressOriginRef.current = { x: e.clientX, y: e.clientY }
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredIdRef.current = book.id
      setActionBook(book)
      clearLongPress()
    }, LONG_PRESS_MS)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const origin = pressOriginRef.current
    if (!origin || !longPressTimerRef.current) return
    const distance = Math.hypot(e.clientX - origin.x, e.clientY - origin.y)
    if (distance > MOVE_CANCEL_PX) {
      clearLongPress()
    }
  }

  const handleBookClick = (bookId: string) => {
    if (longPressFiredIdRef.current === bookId) {
      longPressFiredIdRef.current = null
      return
    }
    openReader(bookId)
  }

  return (
    <div className="h-full w-full flex flex-col bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)]">
      <header className="pt-safe shrink-0 border-b border-[var(--rb-border)] bg-[var(--rb-bg-chrome)]">
        <div className="h-14 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoIcon size={26} color="var(--rb-text-primary)" />
            <span className="text-lg font-bold tracking-tight">Read Bridge</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isImporting}
              onClick={() => {
                void pickAndImport()
              }}
              className="h-9 px-3 rounded-full bg-[var(--rb-highlight-bg)] text-[var(--rb-accent)] text-xs font-semibold flex items-center gap-1.5 active:opacity-80 disabled:opacity-60"
              aria-label={t('mobile.import')}
            >
              {isImporting ? <LoadingOutlined /> : <PlusOutlined />}
              <span>{isImporting ? t('mobile.importing') : t('mobile.import')}</span>
            </button>

            <button
              type="button"
              onClick={() => router.push('/setting')}
              className="w-9 h-9 rounded-full border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] flex items-center justify-center active:bg-[var(--rb-bg-muted)]"
              aria-label={t('common.settings')}
            >
              <SettingOutlined className="text-base" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-safe-4">
        {recentReading && (
          <div
            onClick={() => openReader(recentReading.bookId)}
            className="mb-5 rounded-2xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] p-3 shadow-sm flex items-center gap-3 active:scale-[0.99] transition-transform cursor-pointer"
          >
            <MobileCoverImage
              cover={recentReading.cover}
              title={recentReading.title}
              className="w-12 h-16 rounded-lg shrink-0 shadow-sm"
              showTitleFallback={false}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{recentReading.title}</div>
              <div className="text-xs text-[var(--rb-text-secondary)] truncate mt-0.5">
                {recentReading.chapterTitle ||
                  t('mobile.chapterProgress', {
                    current: String(recentReading.chapterIndex + 1),
                    total: String(Math.max(recentReading.totalChapters, 1)),
                  })}
              </div>
              <div className="text-[11px] text-[var(--rb-text-secondary)] mt-1">
                {t('mobile.chapterProgress', {
                  current: String(recentReading.chapterIndex + 1),
                  total: String(Math.max(recentReading.totalChapters, 1)),
                })}
              </div>
            </div>
            <span className="shrink-0 px-3.5 py-1.5 rounded-full bg-[var(--rb-accent)] text-white text-xs font-semibold">
              {t('mobile.continueReading')}
            </span>
          </div>
        )}

        {books.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-[var(--rb-border)] bg-[var(--rb-bg-surface)] p-8 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-[var(--rb-highlight-bg)] text-[var(--rb-accent)] flex items-center justify-center mb-3">
              <BookOutlined className="text-xl" />
            </div>
            <h2 className="text-base font-semibold">{t('mobile.emptyTitle')}</h2>
            <p className="text-xs text-[var(--rb-text-secondary)] mt-1 max-w-[240px]">
              {t('mobile.emptyDesc')}
            </p>
            <button
              type="button"
              disabled={isImporting}
              onClick={() => {
                void pickAndImport()
              }}
              className="mt-4 h-9 px-5 rounded-full bg-[var(--rb-accent)] text-white text-xs font-semibold flex items-center gap-1.5 active:opacity-90 disabled:opacity-60"
            >
              {isImporting ? <LoadingOutlined /> : <PlusOutlined />}
              <span>{isImporting ? t('mobile.importing') : t('mobile.import')}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-x-3 gap-y-5">
            {books.map(book => (
              <div
                key={book.id}
                role="button"
                tabIndex={0}
                onPointerDown={e => handlePointerDown(book, e)}
                onPointerMove={handlePointerMove}
                onPointerUp={clearLongPress}
                onPointerCancel={clearLongPress}
                onPointerLeave={clearLongPress}
                onContextMenu={e => {
                  e.preventDefault()
                  clearLongPress()
                  setActionBook(book)
                }}
                onClick={() => handleBookClick(book.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openReader(book.id)
                  }
                }}
                className="no-callout group text-left cursor-pointer focus:outline-none"
              >
                <div className="aspect-[2/3] w-full rounded-xl overflow-hidden border border-[var(--rb-border)] shadow-sm bg-[var(--rb-bg-surface)] transition-transform active:scale-[0.97]">
                  <MobileCoverImage
                    cover={book.cover}
                    title={book.title}
                    className="w-full h-full"
                  />
                </div>
                <div className="mt-1.5 text-xs font-medium leading-snug line-clamp-2 text-[var(--rb-text-primary)]">
                  {book.title}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BookActionSheet
        book={actionBook}
        onClose={() => setActionBook(null)}
        onOpenDetails={bookId => setDetailBookId(bookId)}
        onOpenEdit={bookId => setEditBookId(bookId)}
      />

      {detailBookId && (
        <MobileBookDetails
          bookId={detailBookId}
          onClose={() => setDetailBookId(null)}
          onOpenEdit={bookId => setEditBookId(bookId)}
        />
      )}

      {editBookId && (
        <MobileBookEditor
          bookId={editBookId}
          onClose={() => setEditBookId(null)}
        />
      )}
    </div>
  )
}
