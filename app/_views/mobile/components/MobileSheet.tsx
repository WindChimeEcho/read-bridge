'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { registerBackHandler } from '@/services/platform/backAdapter'

interface EscapeEntry {
  id: number
  priority: number
  handle: () => void
}

const escapeStack: EscapeEntry[] = []
let nextEscapeId = 1

function handleGlobalKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || escapeStack.length === 0) return

  const top = escapeStack.reduce<EscapeEntry | undefined>((best, entry) => {
    if (!best) return entry
    if (entry.priority !== best.priority) {
      return entry.priority > best.priority ? entry : best
    }
    return entry.id > best.id ? entry : best
  }, undefined)

  if (top) {
    event.preventDefault()
    top.handle()
  }
}

function registerEscapeHandler(priority: number, handle: () => void): () => void {
  const entry: EscapeEntry = {
    id: nextEscapeId++,
    priority,
    handle,
  }
  const wasEmpty = escapeStack.length === 0
  escapeStack.push(entry)
  if (wasEmpty && typeof window !== 'undefined') {
    window.addEventListener('keydown', handleGlobalKeyDown)
  }

  return () => {
    const idx = escapeStack.findIndex(item => item.id === entry.id)
    if (idx !== -1) {
      escapeStack.splice(idx, 1)
    }
    if (escapeStack.length === 0 && typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }
}

export interface MobileSheetProps {
  open: boolean
  onClose: () => void
  ariaLabel: string
  height?: 'full' | 'auto'
  zIndexClass?: string
  backdropClassName?: string
  backPriority?: number
  onBack?: () => boolean
  closeOnEscape?: boolean
  portal?: boolean
  panelClassName?: string
  children: ReactNode
}

export default function MobileSheet({
  open,
  onClose,
  ariaLabel,
  height = 'auto',
  zIndexClass = 'z-40',
  backdropClassName = 'bg-black/35',
  backPriority,
  onBack,
  closeOnEscape = true,
  portal = false,
  panelClassName = '',
  children,
}: MobileSheetProps) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const onBackRef = useRef(onBack)
  onBackRef.current = onBack

  useEffect(() => {
    if (!open || backPriority === undefined) return
    return registerBackHandler(backPriority, () => {
      if (onBackRef.current) {
        return onBackRef.current()
      }
      onCloseRef.current()
      return true
    })
  }, [open, backPriority])

  useEffect(() => {
    if (!open || !closeOnEscape) return
    return registerEscapeHandler(backPriority ?? 0, () => {
      if (onBackRef.current) {
        onBackRef.current()
        return
      }
      onCloseRef.current()
    })
  }, [open, closeOnEscape, backPriority])

  if (!open) return null

  const content = (
    <div className={`fixed inset-0 ${zIndexClass} flex flex-col justify-end`}>
      <div className={`absolute inset-0 ${backdropClassName}`} onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`relative z-10 w-full flex flex-col rounded-t-3xl bg-[var(--rb-bg-surface)] text-[var(--rb-text-primary)] border-t border-[var(--rb-border)] shadow-2xl overflow-hidden ${
          height === 'full' ? 'h-[88dvh]' : 'max-h-[75dvh]'
        } ${panelClassName}`}
      >
        {children}
      </section>
    </div>
  )

  if (portal && typeof document !== 'undefined') {
    return createPortal(content, document.body)
  }

  return content
}
