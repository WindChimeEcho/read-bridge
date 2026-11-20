'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import db from '@/services/DB'
import { useReaderSessionStore } from '@/store/useReaderSessionStore'
import { useReadingProgressStore } from '@/store/useReadingProgress'
import type { Book, ReadingProgress } from '@/types/book'

export function findFirstVisibleLine(
  lines: string[],
  elements: Map<number, HTMLElement>,
  viewportTop: number,
  viewportBottom: number
): number {
  let lower = 0
  let upper = lines.length - 1
  let firstVisible = Infinity

  while (lower <= upper) {
    const middle = Math.floor((lower + upper) / 2)
    const element = elements.get(middle)
    if (!element) break

    if (element.getBoundingClientRect().bottom >= viewportTop) {
      firstVisible = middle
      upper = middle - 1
    } else {
      lower = middle + 1
    }
  }

  for (let index = firstVisible; index < lines.length; index += 1) {
    const element = elements.get(index)
    if (!element) continue
    const rect = element.getBoundingClientRect()
    if (rect.top > viewportBottom) break
    if (lines[index] && rect.bottom >= viewportTop) return index
  }

  return Infinity
}

export function useReadArea(book: Book, readingProgress: ReadingProgress) {
  const { updateReadingProgress } = useReadingProgressStore()
  const sessionSelectedLineIndex = useReaderSessionStore(state => state.selectedLineIndex)
  const jumpSeq = useReaderSessionStore(state => state.jumpSeq)
  const selectSentence = useReaderSessionStore(state => state.selectSentence)

  const chapterIndex = readingProgress.currentLocation.chapterIndex

  const title = useMemo(() => {
    return book.chapterList[chapterIndex]?.title || ''
  }, [book, chapterIndex])

  const lines = useMemo(() => {
    return readingProgress.sentenceChapters[chapterIndex] ?? []
  }, [readingProgress.sentenceChapters, chapterIndex])

  const selectedLineIndex = sessionSelectedLineIndex ?? readingProgress.currentLocation.lineIndex

  const containerRef = useRef<HTMLDivElement>(null)
  const lineRefsMap = useRef<Map<number, HTMLDivElement>>(new Map())
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestLineIndexRef = useRef(readingProgress.currentLocation.lineIndex)
  const lastRestoredKeyRef = useRef('')

  latestLineIndexRef.current = readingProgress.currentLocation.lineIndex

  useEffect(() => {
    const container = containerRef.current
    if (!container || lines.length === 0) return

    const restoreKey = `${book.id}:${chapterIndex}:${jumpSeq}`
    if (lastRestoredKeyRef.current === restoreKey) return
    lastRestoredKeyRef.current = restoreKey

    const savedLineIndex = latestLineIndexRef.current
    if (savedLineIndex !== undefined && savedLineIndex !== Infinity && savedLineIndex > 0) {
      const timer = setTimeout(() => {
        const lineElement = lineRefsMap.current.get(savedLineIndex)
        if (lineElement) {
          lineElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else {
          container.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }, 100)
      return () => clearTimeout(timer)
    }

    container.scrollTo({ top: 0, behavior: 'smooth' })
  }, [book.id, chapterIndex, jumpSeq, lines])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      scrollTimeoutRef.current = setTimeout(() => {
        const containerRect = container.getBoundingClientRect()
        const containerTop = containerRect.top + 10

        const visibleLineIndex = findFirstVisibleLine(
          lines,
          lineRefsMap.current,
          containerTop,
          containerRect.bottom
        )

        if (visibleLineIndex !== Infinity && visibleLineIndex >= 0) {
          void db.updateCurrentLocation(book.id, {
            chapterIndex,
            lineIndex: visibleLineIndex,
          })
        }
      }, 300)
    }

    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [book.id, chapterIndex, lines])

  const setLineRef = useCallback((element: HTMLDivElement | null, index: number) => {
    if (element) {
      lineRefsMap.current.set(index, element)
    } else {
      lineRefsMap.current.delete(index)
    }
  }, [])

  const onSelectSentence = useCallback(async (
    index: number,
    options?: { openSheet?: boolean }
  ) => {
    const sentenceText = lines[index] ?? ''
    selectSentence(index, sentenceText, options?.openSheet)

    await db.updateCurrentLocation(book.id, {
      chapterIndex,
      lineIndex: index,
    })
    await updateReadingProgress(book.id)
  }, [book.id, chapterIndex, lines, selectSentence, updateReadingProgress])

  const scrollLineIntoSafeArea = useCallback((
    lineIndex: number,
    bottomObstructionPx: number,
    topInsetPx = 16
  ) => {
    const container = containerRef.current
    const element = lineRefsMap.current.get(lineIndex)
    if (!container || !element) return

    const containerRect = container.getBoundingClientRect()
    const elRect = element.getBoundingClientRect()
    const safeTop = containerRect.top + topInsetPx
    const safeBottom = Math.max(safeTop + 60, containerRect.bottom - bottomObstructionPx - 16)

    if (elRect.top < safeTop || elRect.bottom > safeBottom) {
      const targetOffset = (safeBottom - safeTop) * 0.35
      const delta = elRect.top - (safeTop + targetOffset)
      container.scrollBy({ top: delta, behavior: 'smooth' })
    }
  }, [])

  return {
    title,
    lines,
    selectedLineIndex,
    containerRef,
    setLineRef,
    onSelectSentence,
    scrollLineIntoSafeArea,
  }
}
