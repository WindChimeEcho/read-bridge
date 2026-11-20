'use client'

import { useState } from 'react'
import { DownOutlined, RightOutlined } from '@ant-design/icons'

interface MobileReasoningCollapseProps {
  content?: string
  label?: string
  defaultOpen?: boolean
}

export default function MobileReasoningCollapse({
  content,
  label = 'Reasoning',
  defaultOpen = false,
}: MobileReasoningCollapseProps) {
  const [open, setOpen] = useState(defaultOpen)

  if (!content) return null

  return (
    <div className="mb-2 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full px-3 py-2 flex items-center justify-between text-xs font-medium text-[var(--rb-text-secondary)] active:opacity-70"
      >
        <span className="truncate">{label}</span>
        {open ? <DownOutlined className="text-[10px]" /> : <RightOutlined className="text-[10px]" />}
      </button>
      {open && (
        <div className="px-3 pb-2.5 pt-0.5 text-xs leading-relaxed text-[var(--rb-text-secondary)] whitespace-pre-wrap border-t border-[var(--rb-border)]">
          {content}
        </div>
      )}
    </div>
  )
}
