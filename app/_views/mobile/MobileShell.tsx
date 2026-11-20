'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Preload from '@/app/components/preload'
import { initBackButtonListener, registerBackHandler } from '@/services/platform/backAdapter'

export default function MobileShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    let cleanup: (() => void) | undefined
    let disposed = false

    void initBackButtonListener().then(unlisten => {
      if (disposed) {
        unlisten()
        return
      }
      cleanup = unlisten
    })

    return () => {
      disposed = true
      cleanup?.()
    }
  }, [])

  useEffect(() => {
    return registerBackHandler(10, () => {
      if (pathname.startsWith('/read') || pathname.startsWith('/setting')) {
        router.push('/')
        return true
      }
      return false
    })
  }, [pathname, router])

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)]">
      <Preload />
      <main className="flex-1 min-h-0 overflow-hidden relative">
        {children}
      </main>
    </div>
  )
}
