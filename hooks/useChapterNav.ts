'use client'

import { useCallback, useMemo, useState } from 'react'
import db from '@/services/DB'
import { useBookmarkStore } from '@/store/useBookmarkStore'
import { useReaderSessionStore } from '@/store/useReaderSessionStore'
import { useReadingProgressStore } from '@/store/useReadingProgress'
import { useSiderStore } from '@/store/useSiderStore'
import type { Book, Bookmark } from '@/types/book'

export function useChapterNav(book: Book | null) {
  const { readingId } = useSiderStore()
  const { readingProgress, updateReadingProgress } = useReadingProgressStore()
  const { bookmarksByBook, removeBookmark } = useBookmarkStore()
  const triggerChapterJump = useReaderSessionStore(state => state.triggerChapterJump)
  const [isChapterLoading, setIsChapterLoading] = useState(false)

  const currentChapter = readingProgress.currentLocation.chapterIndex
  const totalChapters = book?.chapterList.length ?? 0
  const hasPrev = currentChapter > 0
  const hasNext = totalChapters > 0 && currentChapter < totalChapters - 1
  const currentChapterTitle = book?.chapterList[currentChapter]?.title || ''

  const bookmarks = useMemo(() => {
    if (!book) return []
    return bookmarksByBook[book.id] ?? []
  }, [book, bookmarksByBook])

  const goToChapter = useCallback(async (index: number, lineIndex = 0) => {
    if (!readingId || !book) return
    if (index < 0 || index >= book.chapterList.length) return

    setIsChapterLoading(true)
    try {
      await db.updateCurrentLocation(readingId, { chapterIndex: index, lineIndex })
      await updateReadingProgress(readingId)
      triggerChapterJump()
    } finally {
      setIsChapterLoading(false)
    }
  }, [book, readingId, triggerChapterJump, updateReadingProgress])

  const prevChapter = useCallback(async () => {
    if (!hasPrev) return
    await goToChapter(currentChapter - 1, 0)
  }, [currentChapter, goToChapter, hasPrev])

  const nextChapter = useCallback(async () => {
    if (!hasNext) return
    await goToChapter(currentChapter + 1, 0)
  }, [currentChapter, goToChapter, hasNext])

  const jumpToBookmark = useCallback(async (bookmark: Bookmark) => {
    await goToChapter(bookmark.chapterIndex, bookmark.lineIndex)
  }, [goToChapter])

  const deleteBookmark = useCallback((bookmarkId: string) => {
    if (!book) return
    removeBookmark(book.id, bookmarkId)
  }, [book, removeBookmark])

  return {
    isChapterLoading,
    currentChapter,
    totalChapters,
    hasPrev,
    hasNext,
    currentChapterTitle,
    bookmarks,
    goToChapter,
    prevChapter,
    nextChapter,
    jumpToBookmark,
    deleteBookmark,
  }
}
