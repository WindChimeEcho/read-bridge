'use client'

import { useEffect, useState } from 'react'

export type ViewportMode = 'desktop' | 'mobile'

const MOBILE_MEDIA_QUERY = '(max-width: 767px)'

export function useViewportMode() {
  const [mode, setMode] = useState<ViewportMode>('desktop')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(MOBILE_MEDIA_QUERY)
    const sync = () => {
      setMode(media.matches ? 'mobile' : 'desktop')
    }

    sync()
    setMounted(true)

    media.addEventListener('change', sync)
    return () => {
      media.removeEventListener('change', sync)
    }
  }, [])

  return {
    mode,
    isMobile: mode === 'mobile',
    mounted,
  }
}
