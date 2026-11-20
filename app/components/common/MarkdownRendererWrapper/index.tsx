'use client'

import { useMemo } from 'react'
import { Spin } from 'antd'
import ChatMarkdown from '../MarkdownRenderer'
import { useStyleStore } from '@/store/useStyleStore'
import { getEffectiveTextColor } from '@/config/theme'
import type { ChatMarkdownWrapperProps } from './types'
import './index.css'

export default function ChatMarkdownWrapper({
  content,
  loading = false,
  className = '',
}: ChatMarkdownWrapperProps) {
  const {
    readingTheme,
    fontSize,
    lightModeTextColor,
    darkModeTextColor,
    useCustomTextColor,
  } = useStyleStore()

  const currentTextColor = useMemo(
    () => getEffectiveTextColor(readingTheme, lightModeTextColor, darkModeTextColor, useCustomTextColor),
    [readingTheme, lightModeTextColor, darkModeTextColor, useCustomTextColor]
  )

  const wrapperClassName = `markdown-wrapper-${fontSize} ${className}`

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div
      className={wrapperClassName}
      style={{ color: currentTextColor }}
    >
      <ChatMarkdown
        content={content}
        theme={readingTheme}
        className="w-full h-full"
      />
    </div>
  )
}

ChatMarkdownWrapper.displayName = 'ChatMarkdownWrapper'
