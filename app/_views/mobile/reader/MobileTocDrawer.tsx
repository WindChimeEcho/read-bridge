'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftOutlined,
  CloseOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import type { ReadingTheme } from '@/config/theme'
import { useTranslation } from '@/i18n/useTranslation'
import { registerBackHandler } from '@/services/platform/backAdapter'
import { useReaderSessionStore } from '@/store/useReaderSessionStore'
import { type FontSize, useStyleStore } from '@/store/useStyleStore'
import type { Book, Bookmark } from '@/types/book'
import MobileCoverImage from '../components/MobileCoverImage'

interface MobileTocDrawerProps {
  book: Book
  currentChapter: number
  bookmarks: Bookmark[]
  onSelectChapter: (index: number) => Promise<void> | void
  onSelectBookmark: (bookmark: Bookmark) => Promise<void> | void
  onDeleteBookmark: (bookmarkId: string) => void
}

const FONT_SIZE_ORDER: FontSize[] = ['small', 'medium', 'large']

const PREVIEW_SIZE_CLASS: Record<FontSize, string> = {
  small: 'text-[15px]',
  medium: 'text-[18px]',
  large: 'text-[21px]',
}

const THEME_SWATCHES: Array<{ key: ReadingTheme; label: string; bg: string; ringBorder: string }> = [
  { key: 'paper', label: 'Paper', bg: '#FAF8F5', ringBorder: '#D8D1C2' },
  { key: 'light', label: 'White', bg: '#FFFFFF', ringBorder: '#D4D4D8' },
  { key: 'dark', label: 'Dark', bg: '#16161A', ringBorder: '#3F3F46' },
]

export default function MobileTocDrawer({
  book,
  currentChapter,
  bookmarks,
  onSelectChapter,
  onSelectBookmark,
  onDeleteBookmark,
}: MobileTocDrawerProps) {
  const router = useRouter()
  const { t } = useTranslation()
  const tocDrawerOpen = useReaderSessionStore(state => state.tocDrawerOpen)
  const tocDrawerTab = useReaderSessionStore(state => state.tocDrawerTab)
  const fontPreviewVisible = useReaderSessionStore(state => state.fontPreviewVisible)
  const closeTocDrawer = useReaderSessionStore(state => state.closeTocDrawer)
  const openTocDrawer = useReaderSessionStore(state => state.openTocDrawer)
  const triggerFontPreview = useReaderSessionStore(state => state.triggerFontPreview)

  const fontSize = useStyleStore(state => state.fontSize)
  const setFontSize = useStyleStore(state => state.setFontSize)
  const readingTheme = useStyleStore(state => state.readingTheme)
  const setReadingTheme = useStyleStore(state => state.setReadingTheme)

  useEffect(() => {
    if (!tocDrawerOpen) return
    return registerBackHandler(70, () => {
      closeTocDrawer()
      return true
    })
  }, [tocDrawerOpen, closeTocDrawer])

  if (!tocDrawerOpen) return null

  const tocItems = book.toc.length > 0
    ? book.toc
    : book.chapterList.map((chapter, index) => ({ title: chapter.title, index }))
  const totalChapters = Math.max(book.chapterList.length, 1)
  const authorLabel = book.author || book.metadata.author || t('mobile.unknownAuthor')

  const fontLabel: Record<FontSize, string> = {
    small: t('mobile.fontSmall'),
    medium: t('mobile.fontMedium'),
    large: t('mobile.fontLarge'),
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div
        className="absolute inset-0 bg-black/45 transition-opacity"
        onClick={closeTocDrawer}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t('mobile.toc')}
        className="relative z-10 w-[80vw] max-w-[340px] h-full flex flex-col pt-safe bg-[var(--rb-bg-chrome)] text-[var(--rb-text-primary)] border-r border-[var(--rb-border)] shadow-2xl"
      >
        <div className="px-4 pt-3 pb-3 flex items-center gap-3">
          <MobileCoverImage
            cover={book.metadata.cover}
            title={book.title}
            className="w-11 h-16 rounded-lg shrink-0 shadow-sm"
            showTitleFallback={false}
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold leading-snug line-clamp-2">{book.title}</h2>
            <p className="text-xs text-[var(--rb-text-secondary)] truncate mt-1">
              {authorLabel} · {t('mobile.chapterProgress', {
                current: String(currentChapter + 1),
                total: String(totalChapters),
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={closeTocDrawer}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--rb-text-secondary)] active:bg-[var(--rb-bg-muted)] shrink-0"
            aria-label={t('common.cancel')}
          >
            <CloseOutlined className="text-sm" />
          </button>
        </div>

        <div className="px-4 pb-3">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--rb-bg-muted)]">
            <button
              type="button"
              onClick={() => openTocDrawer('toc')}
              className={`h-8 rounded-lg text-xs font-semibold transition-colors ${
                tocDrawerTab === 'toc'
                  ? 'bg-[var(--rb-bg-surface)] text-[var(--rb-text-primary)] shadow-sm'
                  : 'text-[var(--rb-text-secondary)]'
              }`}
            >
              {t('mobile.toc')}
            </button>
            <button
              type="button"
              onClick={() => openTocDrawer('bookmark')}
              className={`h-8 rounded-lg text-xs font-semibold transition-colors ${
                tocDrawerTab === 'bookmark'
                  ? 'bg-[var(--rb-bg-surface)] text-[var(--rb-text-primary)] shadow-sm'
                  : 'text-[var(--rb-text-secondary)]'
              }`}
            >
              {t('mobile.bookmarks')} ({bookmarks.length})
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3">
          {tocDrawerTab === 'toc' ? (
            <div className="space-y-1">
              {tocItems.map((item, idx) => {
                const isActive = item.index === currentChapter
                return (
                  <button
                    key={`${item.index}-${idx}`}
                    type="button"
                    onClick={() => {
                      void onSelectChapter(item.index)
                      closeTocDrawer()
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-left transition-colors ${
                      isActive
                        ? 'bg-[var(--rb-highlight-bg)] text-[var(--rb-accent)] font-semibold'
                        : 'text-[var(--rb-text-primary)] active:bg-[var(--rb-bg-muted)]'
                    }`}
                  >
                    <span
                      className={`w-1 h-4 rounded-full shrink-0 ${
                        isActive ? 'bg-[var(--rb-accent)]' : 'bg-transparent'
                      }`}
                    />
                    <span className="text-sm truncate flex-1">
                      {item.title || `${t('book.chapter')} ${item.index + 1}`}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="py-12 px-4 text-center text-xs text-[var(--rb-text-secondary)]">
              {t('mobile.noBookmarks')}
            </div>
          ) : (
            <div className="space-y-2">
              {bookmarks.map(bookmark => (
                <div
                  key={bookmark.id}
                  onClick={() => {
                    void onSelectBookmark(bookmark)
                    closeTocDrawer()
                  }}
                  className="rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] p-3 flex items-start gap-2 cursor-pointer active:opacity-80"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-relaxed line-clamp-2 text-[var(--rb-text-primary)]">
                      {bookmark.sentence}
                    </p>
                    <p className="text-[11px] text-[var(--rb-text-secondary)] mt-1">
                      {t('book.chapter')} {bookmark.chapterIndex + 1} · {bookmark.createTime}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      onDeleteBookmark(bookmark.id)
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--rb-text-secondary)] hover:text-red-500 active:bg-[var(--rb-bg-muted)] shrink-0"
                    aria-label={t('common.delete')}
                  >
                    <DeleteOutlined className="text-xs" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[var(--rb-border)] p-4 pb-safe space-y-3 bg-[var(--rb-bg-chrome)]">
          {fontPreviewVisible && (
            <div className="rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] px-3 py-2 flex items-baseline justify-between gap-2">
              <span className={`rb-serif truncate ${PREVIEW_SIZE_CLASS[fontSize]}`}>
                {t('mobile.fontPreviewSample')}
              </span>
              <span className="text-[11px] text-[var(--rb-text-secondary)] shrink-0">
                · {t('mobile.fontPreviewHint')}
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--rb-bg-muted)]">
            {FONT_SIZE_ORDER.map(size => {
              const active = fontSize === size
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    setFontSize(size)
                    triggerFontPreview()
                  }}
                  className={`h-8 rounded-lg text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[var(--rb-bg-surface)] text-[var(--rb-text-primary)] shadow-sm'
                      : 'text-[var(--rb-text-secondary)]'
                  }`}
                >
                  {fontLabel[size]}
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-around py-0.5">
            {THEME_SWATCHES.map(swatch => {
              const active = readingTheme === swatch.key
              return (
                <button
                  key={swatch.key}
                  type="button"
                  onClick={() => setReadingTheme(swatch.key)}
                  className="flex flex-col items-center gap-1"
                  aria-label={swatch.label}
                >
                  <span
                    className={`w-8 h-8 rounded-full border transition-transform ${
                      active
                        ? 'ring-2 ring-[var(--rb-accent)] ring-offset-2 ring-offset-[var(--rb-bg-chrome)] scale-105'
                        : ''
                    }`}
                    style={{
                      backgroundColor: swatch.bg,
                      borderColor: swatch.ringBorder,
                    }}
                  />
                  <span className="text-[11px] text-[var(--rb-text-secondary)]">{swatch.label}</span>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              closeTocDrawer()
              router.push('/')
            }}
            className="w-full h-10 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] text-xs font-semibold flex items-center justify-center gap-2 active:bg-[var(--rb-bg-muted)]"
          >
            <ArrowLeftOutlined />
            <span>{t('mobile.backToBookshelf')}</span>
          </button>
        </div>
      </aside>
    </div>
  )
}
