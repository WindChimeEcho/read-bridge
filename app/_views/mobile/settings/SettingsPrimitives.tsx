'use client'

import type { ReactNode } from 'react'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useTranslation } from '@/i18n/useTranslation'

interface SubpageHeaderProps {
  title: string
  onBack: () => void
  rightSlot?: ReactNode
}

export function SubpageHeader({ title, onBack, rightSlot }: SubpageHeaderProps) {
  const { t } = useTranslation()

  return (
    <header className="pt-safe shrink-0 border-b border-[var(--rb-border)] bg-[var(--rb-bg-chrome)]">
      <div className="h-14 px-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:bg-[var(--rb-bg-muted)]"
            aria-label={t('common.back')}
          >
            <ArrowLeftOutlined className="text-base" />
          </button>
          <h1 className="text-base font-semibold truncate">{title}</h1>
        </div>
        {rightSlot && <div className="shrink-0 flex items-center gap-2">{rightSlot}</div>}
      </div>
    </header>
  )
}

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  ariaLabel?: string
}

export function ToggleSwitch({ checked, onChange, ariaLabel }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${
        checked ? 'bg-[var(--rb-accent)]' : 'bg-[var(--rb-bg-muted)] border border-[var(--rb-border)]'
      }`}
    >
      <span
        className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export function SectionCard({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] p-4 ${className}`}
    >
      {children}
    </section>
  )
}
