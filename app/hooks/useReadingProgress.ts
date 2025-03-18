'use client'

import db from "@/services/DB";
import { useSiderStore } from "@/store/useSiderStore";
import { ReadingProgress } from "@/types/book";
import { useEffect, useState } from "react";

export function useReadingProgress() {

  const { readingId } = useSiderStore()

  const [readingProgress, setReadingProgress] = useState<ReadingProgress>({
    bookId: '',
    lastReadTime: 0,
    currentLocation: {
      chapterIndex: 0,
      lineIndex: 0
    },
    sentenceChapters: {}
  })

  useEffect(() => {
    if (!readingId) return
    updateReadingProgress()
  }, [readingId])

  function updateReadingProgress() {
    if (!readingId) return
    db.getCurrentLocation(readingId).then(
      (res) => {
        setReadingProgress(res)
      }
    )
  }
  return [readingProgress, updateReadingProgress] as const
}

