'use client'

import { useEffect, useRef } from 'react'
import { ArrowUpOutlined, PauseOutlined } from '@ant-design/icons'

export interface MobileChatComposerProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onStop: () => void
  isGenerating: boolean
  placeholder: string
  sendAriaLabel: string
  stopAriaLabel: string
  tagOptions: Array<{ label: string; value: string }>
  selectedTags: string[]
  onToggleTag: (tag: string) => void
}

const SINGLE_LINE_HEIGHT = 40
const MAX_TEXTAREA_HEIGHT = 112

export default function MobileChatComposer({
  value,
  onChange,
  onSend,
  onStop,
  isGenerating,
  placeholder,
  sendAriaLabel,
  stopAriaLabel,
  tagOptions,
  selectedTags,
  onToggleTag,
}: MobileChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return

    if (!value) {
      el.style.height = `${SINGLE_LINE_HEIGHT}px`
      el.style.overflowY = 'hidden'
      return
    }

    el.style.height = '0px'
    const borderY = el.offsetHeight - el.clientHeight
    const contentHeight = el.scrollHeight + borderY
    const nextHeight = Math.min(Math.max(contentHeight, SINGLE_LINE_HEIGHT), MAX_TEXTAREA_HEIGHT)
    el.style.height = `${nextHeight}px`
    el.style.overflowY = contentHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden'
  }, [value])

  return (
    <div className="shrink-0 border-t border-[var(--rb-border)] bg-[var(--rb-bg-chrome)] px-3 pt-2.5 pb-safe-3 space-y-2">
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {tagOptions.map(tag => {
          const active = selectedTags.includes(tag.value)
          return (
            <button
              key={tag.value}
              type="button"
              onClick={() => onToggleTag(tag.value)}
              className={`h-7 px-2.5 rounded-full text-[11px] font-medium leading-none border inline-flex items-center shrink-0 transition-colors ${
                active
                  ? 'border-[var(--rb-accent)] bg-[var(--rb-highlight-bg)] text-[var(--rb-accent)]'
                  : 'border-[var(--rb-border)] bg-[var(--rb-bg-surface)] text-[var(--rb-text-secondary)]'
              }`}
            >
              {tag.label}
            </button>
          )
        })}
      </div>

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              onSend()
            }
          }}
          placeholder={placeholder}
          className="block m-0 flex-1 min-w-0 min-h-[40px] max-h-28 px-3.5 py-[9px] rounded-2xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] text-sm leading-5 text-[var(--rb-text-primary)] placeholder:text-[var(--rb-text-secondary)] outline-none focus:border-[var(--rb-accent)] resize-none"
        />

        <button
          type="button"
          onClick={isGenerating ? onStop : onSend}
          disabled={!isGenerating && !value.trim()}
          className="w-10 h-10 rounded-full bg-[var(--rb-accent)] text-white inline-flex items-center justify-center shrink-0 leading-none disabled:opacity-40 active:opacity-90 [&_.anticon]:inline-flex [&_.anticon]:items-center"
          aria-label={isGenerating ? stopAriaLabel : sendAriaLabel}
        >
          {isGenerating ? <PauseOutlined className="text-xs" /> : <ArrowUpOutlined className="text-xs" />}
        </button>
      </div>
    </div>
  )
}
