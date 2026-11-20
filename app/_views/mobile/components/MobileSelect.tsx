'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckOutlined, CloseOutlined, DownOutlined } from '@ant-design/icons'
import { useTranslation } from '@/i18n/useTranslation'
import { MobileIconButton } from './MobileButtons'
import MobileSheet from './MobileSheet'

export interface MobileSelectOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export interface MobileSelectGroup {
  label: string
  options: MobileSelectOption[]
}

export interface MobileSelectProps {
  value: string
  onChange: (value: string) => void
  options?: MobileSelectOption[]
  groups?: MobileSelectGroup[]
  title: string
  placeholder?: string
  clearLabel?: string
  variant?: 'pill' | 'field'
  surface?: 'canvas' | 'surface'
  disabled?: boolean
  className?: string
  ariaLabel?: string
  id?: string
}

export default function MobileSelect({
  value,
  onChange,
  options = [],
  groups = [],
  title,
  placeholder,
  clearLabel,
  variant = 'field',
  surface = 'canvas',
  disabled = false,
  className = '',
  ariaLabel,
  id,
}: MobileSelectProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const selectedOptionRef = useRef<HTMLButtonElement | null>(null)

  const allOptions = useMemo(() => {
    const list: MobileSelectOption[] = [...options]
    groups.forEach(group => {
      list.push(...group.options)
    })
    return list
  }, [options, groups])

  const matched = useMemo(
    () => allOptions.find(opt => opt.value === value),
    [allOptions, value]
  )

  const hasUnknownValue = Boolean(value) && !matched
  const displayLabel = matched
    ? matched.label
    : value
      ? value
      : (placeholder ?? clearLabel ?? '')
  const isPlaceholder = !matched && !value

  useEffect(() => {
    if (!open) {
      selectedOptionRef.current = null
      return
    }
    selectedOptionRef.current?.scrollIntoView({ block: 'nearest' })
  }, [open])

  const handleSelect = (nextValue: string) => {
    onChange(nextValue)
    setOpen(false)
  }

  const triggerVariantClasses =
    variant === 'pill'
      ? 'h-9 px-3 rounded-full bg-[var(--rb-bg-surface)] text-xs font-medium'
      : `w-full h-10 px-3 rounded-xl ${
          surface === 'surface' ? 'bg-[var(--rb-bg-surface)]' : 'bg-[var(--rb-bg-canvas)]'
        } text-sm`

  const visibleGroups = groups.filter(group => group.options.length > 0)
  const hasAnyOption =
    Boolean(clearLabel) ||
    hasUnknownValue ||
    options.length > 0 ||
    visibleGroups.length > 0

  const renderOption = (opt: MobileSelectOption, key: string) => {
    const isSelected = opt.value === value
    return (
      <button
        key={key}
        ref={isSelected ? selectedOptionRef : undefined}
        type="button"
        role="option"
        aria-selected={isSelected}
        disabled={opt.disabled}
        onClick={() => handleSelect(opt.value)}
        className={`min-h-[44px] w-full px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 text-left transition-colors disabled:opacity-40 ${
          isSelected
            ? 'bg-[var(--rb-highlight-bg)] text-[var(--rb-accent)] font-semibold'
            : 'text-[var(--rb-text-primary)] active:bg-[var(--rb-bg-muted)]'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="text-sm leading-snug break-words">{opt.label}</div>
          {opt.description && (
            <div className="text-[11px] text-[var(--rb-text-secondary)] truncate mt-0.5 font-normal">
              {opt.description}
            </div>
          )}
        </div>
        {isSelected && <CheckOutlined className="text-xs text-[var(--rb-accent)] shrink-0" />}
      </button>
    )
  }

  return (
    <>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel || title}
        onClick={() => {
          if (!disabled) setOpen(true)
        }}
        className={`flex items-center justify-between gap-2 border border-[var(--rb-border)] outline-none transition-colors focus-visible:border-[var(--rb-accent)] disabled:opacity-45 ${triggerVariantClasses} ${className}`}
      >
        <span
          className={`min-w-0 flex-1 truncate text-left leading-normal ${
            isPlaceholder ? 'text-[var(--rb-text-secondary)]' : 'text-[var(--rb-text-primary)]'
          }`}
        >
          {displayLabel}
        </span>
        <DownOutlined className="text-[10px] text-[var(--rb-text-secondary)] shrink-0 inline-flex items-center" />
      </button>

      <MobileSheet
        open={open}
        onClose={() => setOpen(false)}
        ariaLabel={title}
        height="auto"
        zIndexClass="z-[60]"
        backdropClassName="bg-black/45"
        backPriority={95}
        portal={true}
      >
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full bg-[var(--rb-border)]" />
        </div>

        <div className="px-4 pt-1 pb-2.5 border-b border-[var(--rb-border)] flex items-center justify-between gap-2 shrink-0">
          <h2 className="text-sm font-semibold truncate">{title}</h2>
          <MobileIconButton
            size="sm"
            variant="ghost"
            onClick={() => setOpen(false)}
            aria-label={t('common.cancel')}
          >
            <CloseOutlined />
          </MobileIconButton>
        </div>

        <div
          role="listbox"
          aria-label={title}
          className="flex-1 min-h-0 overflow-y-auto px-3 pt-2 pb-safe-4 space-y-1"
        >
          {!hasAnyOption ? (
            <div className="py-8 text-center text-xs text-[var(--rb-text-secondary)]">
              {placeholder || t('mobileSettings.notConfigured')}
            </div>
          ) : (
            <>
              {clearLabel &&
                renderOption(
                  { value: '', label: clearLabel },
                  '__clear__'
                )}

              {hasUnknownValue &&
                renderOption(
                  { value, label: value },
                  `__unknown__-${value}`
                )}

              {options.map((opt, idx) => renderOption(opt, `opt-${opt.value}-${idx}`))}

              {visibleGroups.map(group => (
                <div key={group.label} className="space-y-1">
                  <div className="px-2.5 pt-2.5 pb-1 text-[11px] font-semibold text-[var(--rb-text-secondary)]">
                    {group.label}
                  </div>
                  {group.options.map((opt, idx) =>
                    renderOption(opt, `grp-${group.label}-${opt.value}-${idx}`)
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </MobileSheet>
    </>
  )
}
