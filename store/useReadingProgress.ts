import db from '@/services/DB'
import { ReadingProgress } from '@/types/book'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SENTENCE_FORMAT_VERSION } from '@/services/SentenceService'

interface ReadingProgressStore {
  readingProgress: ReadingProgress
  setReadingProgress: (readingProgress: ReadingProgress) => void
  updateReadingProgress: (bookId: string) => Promise<ReadingProgress>
}

export const useReadingProgressStore = create<ReadingProgressStore>()(
  persist(
    (set) => ({
      readingProgress: {
        bookId: '',
        lastReadTime: 0,
        currentLocation: {
          chapterIndex: 0,
          lineIndex: 0
        },
        sentenceChapters: {},
        sentenceFormatVersion: SENTENCE_FORMAT_VERSION,
      },
      setReadingProgress: (readingProgress) => set({ readingProgress }),
      updateReadingProgress: async (bookId) => {
        const res = await db.getCurrentLocation(bookId)
        set({ readingProgress: res })
        return res
      },
    }),
    {
      name: 'reading-progress-storage',
    }
  )
)
