'use client'

import DesktopSetting from '@/app/_views/desktop/DesktopSetting'
import MobileSettingTemp from '@/app/_views/mobile/MobileSettingTemp'
import { useViewportMode } from '@/hooks/useViewportMode'

export default function SettingPage() {
  const { mode, mounted } = useViewportMode()

  if (!mounted) return null

  return mode === 'mobile' ? <MobileSettingTemp /> : <DesktopSetting />
}
