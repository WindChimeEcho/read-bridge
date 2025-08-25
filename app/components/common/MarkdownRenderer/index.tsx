'use client'

import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkBreaks from 'remark-breaks'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import type { ChatMarkdownProps } from './types'
import './index.css'
import 'katex/dist/katex.min.css'

export default function ChatMarkdown({ content, theme, className = '' }: ChatMarkdownProps) {
  // Plugin configuration with memoization for performance
  const remarkPlugins = useMemo(() => [
    remarkGfm,      // GitHub Flavored Markdown
    remarkMath,     // Math syntax parsing
    remarkBreaks    // Line breaks support
  ], [])

  const rehypePlugins = useMemo(() => [
    rehypeRaw,      // HTML tags support
    rehypeKatex     // KaTeX math formula rendering
  ], [])

  // Custom component mapping
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const components = useMemo(() => ({
    // Code block optimization
    pre: ({ style, ...props }: any) => <pre style={{ overflow: 'visible', ...style }} {...props} />,
    
    // Image paragraph optimization  
    p: ({ node, ...props }: any) => {
      const hasImage = node?.children?.some((child: any) => child.tagName === 'img')
      return hasImage ? <div {...props} /> : <p {...props} />
    },
    
    // Inline code styling
    code: ({ children, className, ...rest }: any) => {
      const match = /language-(\w+)/.exec(className || '')
      return match ? (
        <code className={className} {...rest}>{children}</code>
      ) : (
        <code className="inline-code" {...rest}>{children}</code>
      )
    }
  }), [])
  /* eslint-enable @typescript-eslint/no-explicit-any */

  // LaTeX format preprocessing
  const processedContent = useMemo(() => {
    // Convert \(...\) → $...$ and \[...\] → $$...$$
    return content
      .replace(/\\\(/g, '$')
      .replace(/\\\)/g, '$')
      .replace(/\\\[/g, '$$')
      .replace(/\\\]/g, '$$')
  }, [content])

  // Theme class selection
  const themeClass = useMemo(() => 
    theme === 'dark' ? 'markdown-dark' : 'markdown-light'
  , [theme])

  return (
    <div className={`markdown ${themeClass} ${className} w-full h-full overflow-auto`}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
        disallowedElements={['iframe']}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}