'use client'

import { useEffect } from 'react'
import DesktopRead from '@/app/_views/desktop/DesktopRead'
import MobileReader from '@/app/_views/mobile/reader/MobileReader'
import { useViewportMode } from '@/hooks/useViewportMode'
import { useReadingProgressStore } from '@/store/useReadingProgress'
import { useSiderStore } from '@/store/useSiderStore'

export default function ReadPage() {
  const { mode, mounted } = useViewportMode()
  const readingId = useSiderStore(state => state.readingId)
  const updateReadingProgress = useReadingProgressStore(state => state.updateReadingProgress)

  useEffect(() => {
    if (readingId) {
      void updateReadingProgress(readingId)
    }
  }, [readingId, updateReadingProgress])

  if (!mounted) return null

  return mode === 'mobile' ? <MobileReader /> : <DesktopRead />
}
