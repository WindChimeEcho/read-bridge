'use client'

import React, { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkBreaks from 'remark-breaks'
import rehypeRaw from 'rehype-raw'
import rehypeKatex from 'rehype-katex'
import type { ChatMarkdownProps } from './types'
import { preprocessMarkdown } from './preprocess'
import './index.css'
import 'katex/dist/katex.min.css'

export { preprocessMarkdown }

function hasExplicitOpenProp(openProp: unknown): boolean {
  return openProp === true || openProp === '' || openProp === 'true' || openProp === 'open'
}

interface CustomFoldProps {
  title?: string
  summary?: string
  label?: string
  open?: unknown
  children?: React.ReactNode
}

function CustomFold({ title, summary, label, open, children }: CustomFoldProps) {
  const [isOpen, setIsOpen] = useState(() => hasExplicitOpenProp(open))
  const headerText = title || summary || label || 'Click to expand'

  return (
    <details className="md-fold" open={isOpen}>
      <summary
        className="md-fold-summary"
        onClick={(e) => {
          e.preventDefault()
          setIsOpen((prev) => !prev)
        }}
      >
        {headerText}
      </summary>
      <div className="md-fold-content">{children}</div>
    </details>
  )
}

function DetailsBlock({ open, children, className = '', ...rest }: Record<string, unknown>) {
  const [isOpen, setIsOpen] = useState(() => hasExplicitOpenProp(open))
  const childArray = React.Children.toArray(children as React.ReactNode)
  const restProps = { ...rest }
  delete restProps.node

  let summaryElement: React.ReactNode = null
  const bodyChildren: React.ReactNode[] = []

  for (const child of childArray) {
    const childProps = React.isValidElement(child)
      ? (child.props as Record<string, unknown>)
      : undefined
    const childNode = childProps?.node as { tagName?: string } | undefined

    if (
      !summaryElement &&
      React.isValidElement(child) &&
      ((child.type as unknown) === 'summary' ||
        childProps?.['data-md-summary'] === true ||
        childNode?.tagName === 'summary')
    ) {
      summaryElement = React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
        onClick: (e: React.MouseEvent) => {
          e.preventDefault()
          setIsOpen((prev) => !prev)
        },
      })
    } else {
      bodyChildren.push(child)
    }
  }

  if (!summaryElement) {
    summaryElement = (
      <summary
        className="md-fold-summary"
        onClick={(e) => {
          e.preventDefault()
          setIsOpen((prev) => !prev)
        }}
      >
        Click to expand
      </summary>
    )
  }

  return (
    <details className={`md-fold ${String(className)}`.trim()} {...restProps} open={isOpen}>
      {summaryElement}
      <div className="md-fold-content">{bodyChildren}</div>
    </details>
  )
}

export default function ChatMarkdown({ content, theme, className = '' }: ChatMarkdownProps) {
  // Plugin configuration with memoization for performance
  const remarkPlugins = useMemo(
    () => [
      remarkGfm, // GitHub Flavored Markdown
      remarkMath, // Math syntax parsing
      remarkBreaks, // Line breaks support
    ],
    []
  )

  const rehypePlugins = useMemo(
    () => [
      rehypeRaw, // Raw HTML and custom tag AST support
      rehypeKatex, // KaTeX math formula rendering
    ],
    []
  )

  // Custom component mapping
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const components = useMemo(
    () =>
      ({
        // Code block optimization
        pre: ({ style, ...props }: any) => <pre style={{ overflow: 'visible', ...style }} {...props} />,

        // Image paragraph optimization
        p: ({ node, ...props }: any) => {
          const hasImage = node?.children?.some((child: any) => child.tagName === 'img')
          return hasImage ? <div {...props} /> : <p {...props} />
        },

        // Inline code styling
        code: ({ children, className: codeClassName, ...rest }: any) => {
          const match = /language-(\w+)/.exec(codeClassName || '')
          return match ? (
            <code className={codeClassName} {...rest}>
              {children}
            </code>
          ) : (
            <code className="inline-code" {...rest}>
              {children}
            </code>
          )
        },

        // Native <details> & <summary> (collapsed by default)
        details: (props: any) => <DetailsBlock {...props} />,
        summary: ({ className: sumClass = '', children, ...props }: any) => (
          <summary
            data-md-summary={true}
            className={`md-fold-summary ${sumClass}`.trim()}
            {...props}
          >
            {children}
          </summary>
        ),

        // Custom folding tags (<fold title="..."> and <explain title="...">)
        fold: (props: any) => <CustomFold {...props} />,
        explain: (props: any) => <CustomFold {...props} />,
      }) as Record<string, React.ComponentType<any>>,
    []
  )
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const processedContent = useMemo(() => preprocessMarkdown(content), [content])

  const themeClass = useMemo(() => {
    if (theme === 'dark') return 'markdown-dark'
    if (theme === 'paper') return 'markdown-paper'
    return 'markdown-light'
  }, [theme])

  return (
    <div className={`markdown ${themeClass} ${className} w-full h-full overflow-auto`}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
        disallowedElements={['iframe', 'script', 'style', 'object', 'embed']}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}
