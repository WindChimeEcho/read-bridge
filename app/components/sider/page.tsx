'use client'

import { useReadingProgressStore } from '@/store/useReadingProgress'
import { useReaderSessionStore } from '@/store/useReaderSessionStore'
import { useSiderStore } from '@/store/useSiderStore'
import { usePathname } from 'next/navigation'
import React, { useEffect } from 'react'
import SiderContent from '@/app/components/sider/components/SiderContent'
import SiderChat from '@/app/components/sider/components/SiderChat'

export default function Sider() {
  const { readingId, setSiderCollapsed } = useSiderStore()
  const { updateReadingProgress } = useReadingProgressStore()
  const selectionSeq = useReaderSessionStore(state => state.selectionSeq)
  const pathname = usePathname()

  useEffect(() => {
    if (pathname === '/' || pathname === '/home') {
      setSiderCollapsed(true)
    } else if (pathname.includes('/read')) {
      setSiderCollapsed(false)
      if (readingId) {
        void updateReadingProgress(readingId)
      }
    }
  }, [updateReadingProgress, pathname, readingId, setSiderCollapsed])

  useEffect(() => {
    if (selectionSeq > 0) {
      setSiderCollapsed(false)
    }
  }, [selectionSeq, setSiderCollapsed])

  return (
    <div className="w-full h-full flex flex-col">
      <SiderContent />
      <SiderChat />
    </div>
  )
}
