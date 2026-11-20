'use client'

import DesktopSetting from '@/app/_views/desktop/DesktopSetting'
import MobileSettingsHome from '@/app/_views/mobile/settings/MobileSettingsHome'
import { useViewportMode } from '@/hooks/useViewportMode'

export default function SettingPage() {
  const { mode, mounted } = useViewportMode()

  if (!mounted) return null

  return mode === 'mobile' ? <MobileSettingsHome /> : <DesktopSetting />
}
