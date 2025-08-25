'use client'

import { useMemo } from 'react'
import { Spin } from 'antd'
import { useTheme } from 'next-themes'
import ChatMarkdown from '../ChatMarkdown'
import { useStyleStore } from '@/store/useStyleStore'
import type { ChatMarkdownWrapperProps } from './types'
import './index.css'

export default function ChatMarkdownWrapper({ 
  content, 
  loading = false, 
  className = '' 
}: ChatMarkdownWrapperProps) {
  const { theme } = useTheme()
  const { fontSize, lightModeTextColor, darkModeTextColor } = useStyleStore()
  
  // Get current text color based on theme
  const currentTextColor = useMemo(() => {
    return theme === 'dark' ? darkModeTextColor : lightModeTextColor
  }, [theme, darkModeTextColor, lightModeTextColor])
  
  // Build font size class
  const fontSizeClass = `markdown-wrapper-${fontSize}`
  
  // Build combined class name
  const wrapperClassName = `${fontSizeClass} ${className}`
  
  // Loading state
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
      style={{ 
        color: currentTextColor
      } as React.CSSProperties}
    >
      <ChatMarkdown 
        content={content} 
        theme={theme as 'light' | 'dark'} 
        className="w-full h-full"
      />
    </div>
  )
}

ChatMarkdownWrapper.displayName = 'ChatMarkdownWrapper'