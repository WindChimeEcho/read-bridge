'use client'

import { BookOutlined } from '@ant-design/icons'
import type { Resource } from '@/types/book'
import { formatCoverDataUrl } from '@/utils/book'

interface MobileCoverImageProps {
  cover?: Resource
  title: string
  className?: string
  showTitleFallback?: boolean
}

export default function MobileCoverImage({
  cover,
  title,
  className = '',
  showTitleFallback = true,
}: MobileCoverImageProps) {
  const coverUrl = formatCoverDataUrl(cover)

  if (coverUrl) {
    return (
      <div className={`overflow-hidden bg-[var(--rb-bg-muted)] ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverUrl}
          alt={title}
          className="w-full h-full object-cover select-none pointer-events-none"
          draggable={false}
        />
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col items-center justify-center p-2 text-center bg-gradient-to-br from-[var(--rb-bg-muted)] to-[var(--rb-bg-chrome)] border border-[var(--rb-border)] text-[var(--rb-text-secondary)] ${className}`}
    >
      <BookOutlined className="text-lg opacity-70 mb-1" />
      {showTitleFallback && (
        <span className="text-[11px] font-medium leading-tight line-clamp-3 text-[var(--rb-text-primary)]">
          {title}
        </span>
      )}
    </div>
  )
}
