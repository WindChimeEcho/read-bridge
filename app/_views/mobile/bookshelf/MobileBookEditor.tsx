'use client'

import { useEffect, useState } from 'react'
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  LoadingOutlined,
  MenuOutlined,
  PictureOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { COMMON_LANGUAGES } from '@/constants/book'
import { useBookManage } from '@/hooks/useBookManage'
import { useTranslation } from '@/i18n/useTranslation'
import {
  addChapter,
  deleteChapter,
  renameChapter,
  reorderChapters,
  updateChapterParagraphs,
} from '@/services/ChapterUtils'
import { registerBackHandler } from '@/services/platform/backAdapter'
import { fileAdapter } from '@/services/platform/fileAdapter'
import { notify } from '@/services/platform/notify'
import type { Book } from '@/types/book'
import MobileCoverImage from '../components/MobileCoverImage'
import MobileSelect from '../components/MobileSelect'

interface MobileBookEditorProps {
  bookId: string
  onClose: () => void
}

export default function MobileBookEditor({ bookId, onClose }: MobileBookEditorProps) {
  const { t } = useTranslation()
  const { book, loading, saving, saveBookChanges } = useBookManage(bookId, { enabled: true })
  const [draft, setDraft] = useState<Book | null>(null)
  const [editingChapterIndex, setEditingChapterIndex] = useState<number | null>(null)
  const [chapterTitleInput, setChapterTitleInput] = useState('')
  const [chapterContentInput, setChapterContentInput] = useState('')

  useEffect(() => {
    if (book) {
      setDraft({
        ...book,
        metadata: { ...book.metadata },
        chapterList: book.chapterList.map(chapter => ({
          title: chapter.title,
          paragraphs: [...chapter.paragraphs],
        })),
        toc: book.toc.map(item => ({ ...item })),
      })
    }
  }, [book])

  useEffect(() => {
    return registerBackHandler(65, () => {
      if (editingChapterIndex !== null) {
        setEditingChapterIndex(null)
        return true
      }
      onClose()
      return true
    })
  }, [editingChapterIndex, onClose])

  const handlePickCover = async () => {
    if (!draft) return
    const files = await fileAdapter.pickFiles({
      extensions: ['png', 'jpg', 'jpeg', 'webp'],
      multiple: false,
    })
    const file = files[0]
    if (!file) return

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ''))
      reader.onerror = () => reject(new Error('Failed to read image'))
      reader.readAsDataURL(file)
    }).catch(() => '')

    const [, base64] = dataUrl.split(',')
    if (!base64) return

    setDraft(prev => {
      if (!prev) return prev
      return {
        ...prev,
        metadata: {
          ...prev.metadata,
          cover: {
            data: base64,
            mediaType: file.type || 'image/jpeg',
          },
        },
      }
    })
  }

  const handleSave = async () => {
    if (!draft || saving) return
    const saved = await saveBookChanges(draft)
    if (saved) {
      onClose()
    }
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !draft) return
    const { index: src } = result.source
    const { index: dst } = result.destination
    if (src === dst) return
    setDraft(reorderChapters(draft, src, dst))
  }

  const handleAddChapter = () => {
    if (!draft) return
    const title = `${t('book.chapter')} ${draft.chapterList.length + 1}`
    const { book: nextBook } = addChapter(draft, title)
    setDraft(nextBook)
  }

  const handleDeleteChapter = (chapterIndex: number) => {
    if (!draft) return
    const nextBook = deleteChapter(draft, chapterIndex)
    if (!nextBook) {
      notify.warning(t('book.atLeastOneChapter'))
      return
    }
    setDraft(nextBook)
  }

  const openChapterEditor = (chapterIndex: number) => {
    const target = draft?.chapterList[chapterIndex]
    if (!target) return
    setEditingChapterIndex(chapterIndex)
    setChapterTitleInput(target.title)
    setChapterContentInput(target.paragraphs.join('\n'))
  }

  const applyChapterEdit = () => {
    if (!draft || editingChapterIndex === null) return
    const renamed = renameChapter(draft, editingChapterIndex, chapterTitleInput.trim() || t('mobile.untitled'))
    const updated = updateChapterParagraphs(
      renamed,
      editingChapterIndex,
      chapterContentInput.split('\n')
    )
    setDraft(updated)
    setEditingChapterIndex(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)]">
      <header className="pt-safe shrink-0 border-b border-[var(--rb-border)] bg-[var(--rb-bg-chrome)]">
        <div className="h-14 px-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:bg-[var(--rb-bg-muted)]"
              aria-label={t('common.back')}
            >
              <ArrowLeftOutlined className="text-base" />
            </button>
            <h1 className="text-base font-semibold truncate">{t('mobile.editBook')}</h1>
          </div>

          <button
            type="button"
            disabled={!draft || saving}
            onClick={() => {
              void handleSave()
            }}
            className="h-8 px-4 rounded-full bg-[var(--rb-accent)] text-white text-xs font-semibold disabled:opacity-50"
          >
            {saving ? t('mobile.saving') : t('mobile.save')}
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-safe-4 space-y-5">
        {loading || !draft ? (
          <div className="py-16 flex items-center justify-center text-[var(--rb-text-secondary)]">
            <LoadingOutlined className="text-2xl" />
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] p-4 space-y-3.5 shadow-sm">
              <div className="flex items-center gap-4">
                <MobileCoverImage
                  cover={draft.metadata.cover}
                  title={draft.title}
                  className="w-16 h-24 rounded-xl shrink-0"
                />
                <button
                  type="button"
                  onClick={() => {
                    void handlePickCover()
                  }}
                  className="px-3.5 py-2 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] text-xs font-medium flex items-center gap-2 active:bg-[var(--rb-bg-muted)]"
                >
                  <PictureOutlined />
                  <span>{t('mobile.changeCover')}</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--rb-text-secondary)] mb-1">
                  {t('book.title')}
                </label>
                <input
                  type="text"
                  value={draft.title}
                  onChange={e => {
                    const title = e.target.value
                    setDraft(prev => prev ? {
                      ...prev,
                      title,
                      metadata: { ...prev.metadata, title },
                    } : prev)
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] text-sm outline-none focus:border-[var(--rb-accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--rb-text-secondary)] mb-1">
                  {t('book.author')}
                </label>
                <input
                  type="text"
                  value={draft.author ?? draft.metadata.author ?? ''}
                  onChange={e => {
                    const author = e.target.value
                    setDraft(prev => prev ? {
                      ...prev,
                      author,
                      metadata: { ...prev.metadata, author },
                    } : prev)
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] text-sm outline-none focus:border-[var(--rb-accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--rb-text-secondary)] mb-1">
                  {t('book.language')}
                </label>
                <MobileSelect
                  variant="field"
                  surface="canvas"
                  title={t('book.language')}
                  value={draft.metadata.language || 'en'}
                  onChange={language => {
                    setDraft(prev => prev ? {
                      ...prev,
                      metadata: { ...prev.metadata, language },
                    } : prev)
                  }}
                  options={COMMON_LANGUAGES.map(lang => ({
                    value: lang.code,
                    label: lang.name,
                  }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--rb-text-secondary)] mb-1">
                  {t('mobile.description')}
                </label>
                <textarea
                  rows={3}
                  value={typeof draft.metadata.description === 'string' ? draft.metadata.description : ''}
                  onChange={e => {
                    const description = e.target.value
                    setDraft(prev => prev ? {
                      ...prev,
                      metadata: { ...prev.metadata, description },
                    } : prev)
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] text-sm outline-none focus:border-[var(--rb-accent)] resize-none"
                />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">
                    {t('mobile.chapterManage')} ({draft.chapterList.length})
                  </h2>
                  <p className="text-[11px] text-[var(--rb-text-secondary)] mt-0.5">
                    {t('mobile.dragToReorder')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddChapter}
                  className="h-8 px-3 rounded-full bg-[var(--rb-highlight-bg)] text-[var(--rb-accent)] text-xs font-medium flex items-center gap-1"
                >
                  <PlusOutlined />
                  <span>{t('mobile.addChapter')}</span>
                </button>
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="mobile-chapter-list">
                  {provided => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2"
                    >
                      {draft.chapterList.map((chapter, index) => (
                        <Draggable
                          key={`mobile-chapter-${index}`}
                          draggableId={`mobile-chapter-${index}`}
                          index={index}
                        >
                          {(dragProvided, snapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className={`rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] px-3 py-2.5 flex items-center gap-2 ${
                                snapshot.isDragging ? 'shadow-lg border-[var(--rb-accent)]' : ''
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium truncate">
                                  {index + 1}. {chapter.title || t('mobile.untitled')}
                                </div>
                                <div className="text-[11px] text-[var(--rb-text-secondary)]">
                                  {chapter.paragraphs.filter(p => p.trim().length > 0).length} ¶
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => openChapterEditor(index)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--rb-text-secondary)] active:bg-[var(--rb-bg-muted)]"
                                aria-label={t('common.edit')}
                              >
                                <EditOutlined />
                              </button>

                              <button
                                type="button"
                                disabled={draft.chapterList.length <= 1}
                                onClick={() => handleDeleteChapter(index)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 disabled:opacity-30 active:bg-red-500/10"
                                aria-label={t('common.delete')}
                              >
                                <DeleteOutlined />
                              </button>

                              <button
                                type="button"
                                {...dragProvided.dragHandleProps}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--rb-text-secondary)] touch-none cursor-grab active:cursor-grabbing"
                                aria-label={t('mobile.dragToReorder')}
                              >
                                <MenuOutlined />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </section>
          </>
        )}
      </div>

      {editingChapterIndex !== null && (
        <div className="fixed inset-0 z-10 flex flex-col bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)]">
          <header className="pt-safe shrink-0 border-b border-[var(--rb-border)] bg-[var(--rb-bg-chrome)]">
            <div className="h-14 px-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setEditingChapterIndex(null)}
                className="w-9 h-9 rounded-full flex items-center justify-center active:bg-[var(--rb-bg-muted)]"
                aria-label={t('common.back')}
              >
                <ArrowLeftOutlined className="text-base" />
              </button>
              <span className="text-sm font-semibold truncate flex-1">{t('mobile.chapterManage')}</span>
              <button
                type="button"
                onClick={applyChapterEdit}
                className="h-8 px-4 rounded-full bg-[var(--rb-accent)] text-white text-xs font-semibold"
              >
                {t('common.confirm')}
              </button>
            </div>
          </header>

          <div className="flex-1 min-h-0 flex flex-col px-4 pt-4 pb-safe-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--rb-text-secondary)] mb-1">
                {t('mobile.chapterTitle')}
              </label>
              <input
                type="text"
                value={chapterTitleInput}
                onChange={e => setChapterTitleInput(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] text-sm outline-none focus:border-[var(--rb-accent)]"
              />
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <label className="block text-xs font-medium text-[var(--rb-text-secondary)] mb-1">
                {t('mobile.chapterContent')}
              </label>
              <textarea
                value={chapterContentInput}
                onChange={e => setChapterContentInput(e.target.value)}
                className="flex-1 min-h-0 w-full p-3 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] text-sm leading-relaxed outline-none focus:border-[var(--rb-accent)] resize-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
