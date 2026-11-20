'use client'

import DesktopHome from '@/app/_views/desktop/DesktopHome'
import MobileBookshelf from '@/app/_views/mobile/bookshelf/MobileBookshelf'
import { useViewportMode } from '@/hooks/useViewportMode'

export default function HomePage() {
  const { mode, mounted } = useViewportMode()

  if (!mounted) return null

  return mode === 'mobile' ? <MobileBookshelf /> : <DesktopHome />
}
