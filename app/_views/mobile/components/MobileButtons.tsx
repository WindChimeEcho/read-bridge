'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type MobileButtonSize = 'md' | 'sm' | 'xs'
export type MobileButtonVariant = 'ghost' | 'outline' | 'primary' | 'soft' | 'danger'

const BASE_CLASSES =
  'inline-flex items-center justify-center shrink-0 rounded-full leading-none transition-colors disabled:opacity-40 [&_.anticon]:inline-flex [&_.anticon]:items-center'

const ICON_SIZE_CLASSES: Record<MobileButtonSize, string> = {
  md: 'w-9 h-9 text-sm',
  sm: 'w-8 h-8 text-xs',
  xs: 'w-7 h-7 text-[11px]',
}

const PILL_SIZE_CLASSES: Record<MobileButtonSize, string> = {
  md: 'h-9 px-3 text-xs gap-1.5 font-medium whitespace-nowrap',
  sm: 'h-8 px-3 text-xs gap-1.5 font-medium whitespace-nowrap',
  xs: 'h-7 px-2.5 text-[11px] gap-1 font-medium whitespace-nowrap',
}

function getVariantClasses(variant: MobileButtonVariant, active?: boolean): string {
  switch (variant) {
    case 'ghost':
      return active
        ? 'bg-[var(--rb-highlight-bg)] text-[var(--rb-accent)]'
        : 'text-[var(--rb-text-secondary)] active:bg-[var(--rb-bg-muted)]'
    case 'outline':
      return active
        ? 'border border-[var(--rb-accent)] bg-[var(--rb-highlight-bg)] text-[var(--rb-accent)]'
        : 'border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)] active:bg-[var(--rb-bg-muted)]'
    case 'primary':
      return 'bg-[var(--rb-accent)] text-white font-semibold active:opacity-90'
    case 'soft':
      return 'bg-[var(--rb-highlight-bg)] text-[var(--rb-accent)] font-semibold active:opacity-80'
    case 'danger':
      return active
        ? 'bg-red-500 text-white font-semibold'
        : 'bg-red-500/10 text-red-600 dark:text-red-400 active:bg-red-500/20'
  }
}

export interface MobileButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: MobileButtonSize
  variant?: MobileButtonVariant
  active?: boolean
  children: ReactNode
}

export function MobileIconButton({
  size = 'md',
  variant = 'ghost',
  active = false,
  type = 'button',
  className = '',
  children,
  ...rest
}: MobileButtonProps) {
  return (
    <button
      type={type}
      className={`${BASE_CLASSES} ${ICON_SIZE_CLASSES[size]} ${getVariantClasses(variant, active)} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function MobilePillButton({
  size = 'md',
  variant = 'outline',
  active = false,
  type = 'button',
  className = '',
  children,
  ...rest
}: MobileButtonProps) {
  return (
    <button
      type={type}
      className={`${BASE_CLASSES} ${PILL_SIZE_CLASSES[size]} ${getVariantClasses(variant, active)} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
