'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftOutlined,
  CommentOutlined,
  LeftOutlined,
  LoadingOutlined,
  MenuOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { useBook } from '@/hooks/useBook'
import { useChapterNav } from '@/hooks/useChapterNav'
import { useReadArea } from '@/hooks/useReadArea'
import { useTranslation } from '@/i18n/useTranslation'
import { useReaderSessionStore } from '@/store/useReaderSessionStore'
import { useReadingProgressStore } from '@/store/useReadingProgress'
import { useSiderStore } from '@/store/useSiderStore'
import { type FontSize, useStyleStore } from '@/store/useStyleStore'
import type { Book, ReadingProgress } from '@/types/book'
import MobileAnalysisSheet from './MobileAnalysisSheet'
import MobileChatSheet from './MobileChatSheet'
import MobileTocDrawer from './MobileTocDrawer'

const MOBILE_FONT_CLASSES: Record<FontSize, string> = {
  small: 'text-[15px] leading-[1.85]',
  medium: 'text-[18px] leading-[1.9]',
  large: 'text-[21px] leading-[1.95]',
}

const MOBILE_TITLE_CLASSES: Record<FontSize, string> = {
  small: 'text-xl',
  medium: 'text-2xl',
  large: 'text-[26px]',
}

export default function MobileReader() {
  const router = useRouter()
  const { t } = useTranslation()
  const { readingId, setReadingId } = useSiderStore()
  const [book] = useBook()
  const { readingProgress } = useReadingProgressStore()
  const resetSession = useReaderSessionStore(state => state.resetSession)
  const [loading, setLoading] = useState(true)
  const [bookNotFound, setBookNotFound] = useState(false)

  const isReady = Boolean(
    readingId &&
    book &&
    book.id === readingId &&
    readingProgress.bookId === readingId
  )

  useEffect(() => {
    resetSession()
    return () => {
      resetSession()
    }
  }, [readingId, resetSession])

  useEffect(() => {
    if (!readingId) {
      setBookNotFound(true)
      setLoading(false)
      return
    }

    if (isReady) {
      setBookNotFound(false)
      setLoading(false)
      return
    }

    setBookNotFound(false)
    setLoading(true)

    const timer = setTimeout(() => {
      setBookNotFound(true)
      setReadingId('')
      setLoading(false)
    }, 5000)

    return () => clearTimeout(timer)
  }, [isReady, readingId, setReadingId])

  if (loading || (!isReady && !bookNotFound)) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 text-[var(--rb-text-secondary)]">
        <LoadingOutlined className="text-2xl" />
        <span className="text-xs">{t('mobile.analysisPending')}</span>
      </div>
    )
  }

  if (bookNotFound || !book || !isReady) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center px-6 text-center gap-4">
        <div className="text-2xl font-bold">404</div>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="h-10 px-5 rounded-full bg-[var(--rb-accent)] text-white text-xs font-semibold flex items-center gap-2"
        >
          <ArrowLeftOutlined />
          <span>{t('mobile.backToBookshelf')}</span>
        </button>
      </div>
    )
  }

  return <MobileReaderContent book={book} readingProgress={readingProgress} />
}

function MobileReaderContent({
  book,
  readingProgress,
}: {
  book: Book
  readingProgress: ReadingProgress
}) {
  const { t } = useTranslation()
  const fontSize = useStyleStore(state => state.fontSize)
  const activeSheet = useReaderSessionStore(state => state.activeSheet)
  const openTocDrawer = useReaderSessionStore(state => state.openTocDrawer)
  const openChatSheet = useReaderSessionStore(state => state.openChatSheet)

  const {
    isChapterLoading,
    currentChapter,
    currentChapterTitle,
    hasPrev,
    hasNext,
    bookmarks,
    goToChapter,
    prevChapter,
    nextChapter,
    jumpToBookmark,
    deleteBookmark,
  } = useChapterNav(book)

  const {
    title,
    lines,
    selectedLineIndex,
    containerRef,
    setLineRef,
    onSelectSentence,
    scrollLineIntoSafeArea,
  } = useReadArea(book, readingProgress)

  const [headerVisible, setHeaderVisible] = useState(true)
  const headerVisibleRef = useRef(headerVisible)
  headerVisibleRef.current = headerVisible
  const lastScrollTopRef = useRef(0)
  const suppressAutoHideUntilRef = useRef(Date.now() + 500)

  useEffect(() => {
    setHeaderVisible(true)
    lastScrollTopRef.current = 0
    suppressAutoHideUntilRef.current = Date.now() + 500
  }, [currentChapter])

  useEffect(() => {
    if (activeSheet !== 'analysis' || selectedLineIndex === null) return
    const topInsetPx = headerVisibleRef.current ? 64 : 20
    const timer = setTimeout(() => {
      const obstructionPx = Math.round(window.innerHeight * 0.88)
      scrollLineIntoSafeArea(selectedLineIndex, obstructionPx, topInsetPx)
    }, 80)
    return () => clearTimeout(timer)
  }, [activeSheet, selectedLineIndex, scrollLineIntoSafeArea])

  const handleScroll = () => {
    const container = containerRef.current
    if (!container) return
    const currentTop = container.scrollTop
    const delta = currentTop - lastScrollTopRef.current
    lastScrollTopRef.current = currentTop

    if (Date.now() < suppressAutoHideUntilRef.current) return

    if (currentTop <= 24 || delta < -8) {
      setHeaderVisible(true)
    } else if (delta > 12 && currentTop > 48) {
      setHeaderVisible(false)
    }
  }

  const bottomPaddingClass = activeSheet === 'analysis' ? 'pb-[90dvh]' : 'pb-16'

  return (
    <div className="h-full w-full relative flex flex-col bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)]">
      {!headerVisible && (
        <div
          onClick={() => setHeaderVisible(true)}
          className="fixed top-0 left-0 right-0 h-7 z-20"
        />
      )}

      <header
        className={`fixed top-0 left-0 right-0 z-20 pt-safe border-b border-[var(--rb-border)] bg-[var(--rb-bg-chrome)]/95 backdrop-blur transition-transform duration-200 ${
          headerVisible ? 'translate-y-0' : '-translate-y-full pointer-events-none'
        }`}
      >
        <div className="h-12 px-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => openTocDrawer('toc')}
            className="min-w-0 flex-1 h-9 px-2 -ml-1 rounded-xl flex items-center gap-2 text-left active:bg-[var(--rb-bg-muted)]"
          >
            <MenuOutlined className="text-base shrink-0" />
            <span className="text-sm font-semibold truncate">
              {currentChapterTitle || title || book.title}
            </span>
          </button>

          <button
            type="button"
            onClick={() => openChatSheet()}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:bg-[var(--rb-bg-muted)]"
            aria-label={t('sider.chat')}
          >
            <CommentOutlined className="text-base" />
          </button>
        </div>
      </header>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`flex-1 min-h-0 overflow-y-auto pt-16 px-4 ${bottomPaddingClass}`}
      >
        {isChapterLoading ? (
          <div className="py-16 flex items-center justify-center text-[var(--rb-text-secondary)]">
            <LoadingOutlined className="text-xl" />
          </div>
        ) : (
          <div className="max-w-prose mx-auto">
            <h1 className={`${MOBILE_TITLE_CLASSES[fontSize]} rb-serif font-bold mb-5 px-2 leading-snug`}>
              {title}
            </h1>

            <div className={`${MOBILE_FONT_CLASSES[fontSize]} rb-serif space-y-1.5`}>
              {lines.map((sentence, index) => {
                if (!sentence) {
                  return <div key={index} className="h-3" />
                }
                const isSelected = selectedLineIndex === index
                return (
                  <div
                    key={index}
                    ref={el => setLineRef(el, index)}
                    onClick={() => {
                      void onSelectSentence(index, { openSheet: true })
                    }}
                    className={`px-2.5 py-1.5 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[var(--rb-highlight-bg)]'
                        : 'active:bg-[var(--rb-highlight-bg)]/55'
                    }`}
                  >
                    {sentence}
                  </div>
                )
              })}
            </div>

            <div className="mt-10 pt-6 border-t border-[var(--rb-border)] flex items-center justify-between gap-2 pb-safe">
              <button
                type="button"
                disabled={!hasPrev}
                onClick={() => {
                  void prevChapter()
                }}
                className="flex-1 h-10 px-3 rounded-full border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-35 active:bg-[var(--rb-bg-muted)]"
              >
                <LeftOutlined className="text-[11px]" />
                <span>{t('mobile.prevChapter')}</span>
              </button>

              <button
                type="button"
                onClick={() => openTocDrawer('toc')}
                className="h-10 px-4 rounded-full border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] text-xs font-medium active:bg-[var(--rb-bg-muted)]"
              >
                {t('mobile.toc')}
              </button>

              <button
                type="button"
                disabled={!hasNext}
                onClick={() => {
                  void nextChapter()
                }}
                className="flex-1 h-10 px-3 rounded-full border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-35 active:bg-[var(--rb-bg-muted)]"
              >
                <span>{t('mobile.nextChapter')}</span>
                <RightOutlined className="text-[11px]" />
              </button>
            </div>
          </div>
        )}
      </div>

      <MobileTocDrawer
        book={book}
        currentChapter={currentChapter}
        bookmarks={bookmarks}
        onSelectChapter={index => goToChapter(index, 0)}
        onSelectBookmark={bookmark => jumpToBookmark(bookmark)}
        onDeleteBookmark={deleteBookmark}
      />

      <MobileAnalysisSheet />
      <MobileChatSheet />
    </div>
  )
}
