'use client'

import type { ReactNode } from 'react'
import DesktopShell from '@/app/_views/desktop/DesktopShell'
import MobileShell from '@/app/_views/mobile/MobileShell'
import { useViewportMode } from '@/hooks/useViewportMode'

export default function StructureLayout({ children }: { children: ReactNode }) {
  const { mode, mounted } = useViewportMode()

  if (!mounted) {
    return <div className="h-[100dvh] w-full bg-[var(--rb-bg-canvas)]" />
  }

  return mode === 'mobile' ? (
    <MobileShell>{children}</MobileShell>
  ) : (
    <DesktopShell>{children}</DesktopShell>
  )
}
