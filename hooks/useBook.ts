'use client'

import db from '@/services/DB'
import { useSiderStore } from '@/store/useSiderStore'
import { Book } from '@/types/book'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useRef, useState } from 'react'

export function useBook() {
  const { readingId } = useSiderStore()
  const [book, setBook] = useState<Book | null>(null)
  const requestIdRef = useRef(0)

  const updateBook = useCallback(async (): Promise<void> => {
    const requestId = ++requestIdRef.current
    if (!readingId) {
      setBook(null)
      return
    }
    setBook(prev => (prev?.id === readingId ? prev : null))
    try {
      const res = await db.getBook(readingId)
      if (requestIdRef.current !== requestId) return
      setBook(res)
    } catch (error) {
      if (requestIdRef.current !== requestId) return
      console.error('Error updating book:', error)
    }
  }, [readingId])

  useEffect(() => {
    void updateBook()
  }, [updateBook])

  return [book, setBook, updateBook] as const
}

export function useBookshelf() {
  const books = useLiveQuery(() => db.getAllBooksPreview(), []) ?? []
  const recentReading = useLiveQuery(() => db.getRecentReadingSummary(), []) ?? null
  return {
    books,
    recentReading,
  }
}
