'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  HistoryOutlined,
  PauseOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import MarkdownRendererWrapper from '@/app/components/common/MarkdownRendererWrapper'
import { useChatSession } from '@/hooks/useChatSession'
import { useTranslation } from '@/i18n/useTranslation'
import { registerBackHandler } from '@/services/platform/backAdapter'
import { useReaderSessionStore } from '@/store/useReaderSessionStore'
import type { LLMHistory } from '@/types/llm'
import MobileReasoningCollapse from '../components/MobileReasoningCollapse'

export default function MobileChatSheet() {
  const { t } = useTranslation()
  const activeSheet = useReaderSessionStore(state => state.activeSheet)
  const closeActiveSheet = useReaderSessionStore(state => state.closeActiveSheet)

  const {
    history,
    groupedHistory,
    isGenerating,
    selectedPromptId,
    promptOptions,
    tagOptions,
    quotedSentence,
    sendMessage,
    stopGeneration,
    newChat,
    selectHistory,
    deleteHistory,
    renameHistory,
    changePrompt,
    clearQuote,
  } = useChatSession()

  const [inputText, setInputText] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>(['base_context'])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const scrollEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeSheet !== 'chat') return
    return registerBackHandler(85, () => {
      if (historyOpen) {
        setHistoryOpen(false)
        return true
      }
      closeActiveSheet()
      return true
    })
  }, [activeSheet, closeActiveSheet, historyOpen])

  useEffect(() => {
    if (activeSheet === 'chat') {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeSheet, history.messages])

  if (activeSheet !== 'chat') return null

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => (
      prev.includes(tag) ? prev.filter(item => item !== tag) : [...prev, tag]
    ))
  }

  const handleSend = () => {
    const trimmed = inputText.trim()
    if (!trimmed || isGenerating) return
    setInputText('')
    void sendMessage(trimmed, selectedTags)
  }

  const startRename = (item: LLMHistory) => {
    setEditingId(item.id)
    setEditingTitle(item.title)
  }

  const saveRename = (item: LLMHistory) => {
    const nextTitle = editingTitle.trim()
    if (nextTitle) {
      renameHistory(item, nextTitle)
    }
    setEditingId(null)
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <div
        className="flex-1 bg-black/35"
        onClick={closeActiveSheet}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={t('sider.chat')}
        className="relative z-10 h-[88dvh] w-full flex flex-col rounded-t-3xl bg-[var(--rb-bg-surface)] text-[var(--rb-text-primary)] border-t border-[var(--rb-border)] shadow-2xl overflow-hidden"
      >
        <header className="px-3.5 py-2.5 border-b border-[var(--rb-border)] bg-[var(--rb-bg-chrome)] flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setHistoryOpen(prev => !prev)}
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              historyOpen
                ? 'bg-[var(--rb-highlight-bg)] text-[var(--rb-accent)]'
                : 'active:bg-[var(--rb-bg-muted)]'
            }`}
            aria-label={t('mobile.history')}
          >
            <HistoryOutlined />
          </button>

          <select
            value={selectedPromptId}
            onChange={e => changePrompt(e.target.value)}
            className="min-w-0 flex-1 h-9 px-2.5 rounded-full border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] text-xs font-medium outline-none"
          >
            {promptOptions.map(option => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              newChat()
              setHistoryOpen(false)
            }}
            className="h-8 px-3 rounded-full bg-[var(--rb-accent)] text-white text-xs font-semibold flex items-center gap-1 shrink-0 active:opacity-90"
          >
            <PlusOutlined className="text-[11px]" />
            <span>{t('mobile.newChat')}</span>
          </button>

          <button
            type="button"
            onClick={closeActiveSheet}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--rb-text-secondary)] active:bg-[var(--rb-bg-muted)] shrink-0"
            aria-label={t('common.cancel')}
          >
            <CloseOutlined className="text-xs" />
          </button>
        </header>

        {quotedSentence && (
          <div className="px-4 py-2 border-b border-[var(--rb-border)] bg-[var(--rb-highlight-bg)]/60 flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-semibold text-[var(--rb-accent)] shrink-0">
              {t('mobile.quotedSentence')}:
            </span>
            <span className="text-xs text-[var(--rb-text-primary)] truncate flex-1">
              {quotedSentence}
            </span>
            <button
              type="button"
              onClick={clearQuote}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--rb-accent)] active:bg-[var(--rb-highlight-bg)] shrink-0"
              aria-label={t('common.delete')}
            >
              <CloseOutlined className="text-[10px]" />
            </button>
          </div>
        )}

        <div className="relative flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
            {history.messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[var(--rb-text-secondary)]">
                {t('mobile.inputPlaceholder')}
              </div>
            ) : (
              history.messages.map((msg, index) => {
                const isUser = msg.role === 'user'
                const thinkingLabel = msg.reasoningContent
                  ? msg.thinkingTime == null
                    ? t('mobile.thinkingInProgress')
                    : t('mobile.thinkingDone', { seconds: String(msg.thinkingTime) })
                  : t('mobile.thinkingProcess')

                if (isUser) {
                  return (
                    <div key={`${msg.timestamp}-${index}`} className="flex justify-end">
                      <div className="max-w-[82%] rounded-2xl rounded-br-sm bg-[var(--rb-accent)] text-white px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
                        {msg.content}
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={`${msg.timestamp}-${index}`} className="flex justify-start">
                    <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] px-3.5 py-2.5 space-y-1.5">
                      {msg.name && (
                        <div className="text-[11px] font-medium text-[var(--rb-text-secondary)]">
                          {msg.name}
                        </div>
                      )}
                      <MobileReasoningCollapse
                        content={msg.reasoningContent}
                        label={thinkingLabel}
                      />
                      <MarkdownRendererWrapper content={msg.content} />
                    </div>
                  </div>
                )
              })
            )}
            <div ref={scrollEndRef} />
          </div>

          {historyOpen && (
            <div className="absolute inset-0 z-20 bg-[var(--rb-bg-surface)] overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{t('mobile.history')}</h2>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(false)}
                  className="text-xs text-[var(--rb-accent)] font-medium"
                >
                  {t('common.cancel')}
                </button>
              </div>

              {groupedHistory.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--rb-text-secondary)]">
                  {t('mobile.noHistory')}
                </div>
              ) : (
                groupedHistory.map(group => (
                  <div key={group.label} className="space-y-1.5">
                    <div className="text-xs font-semibold text-[var(--rb-text-secondary)] px-1">
                      {group.label}
                    </div>
                    {group.items.map(item => (
                      <div
                        key={item.id}
                        className={`rounded-xl border px-3 py-2 flex items-center gap-2 ${
                          history.id === item.id
                            ? 'border-[var(--rb-accent)] bg-[var(--rb-highlight-bg)]'
                            : 'border-[var(--rb-border)] bg-[var(--rb-bg-canvas)]'
                        }`}
                      >
                        {editingId === item.id ? (
                          <>
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={e => setEditingTitle(e.target.value)}
                              className="flex-1 min-w-0 h-8 px-2 rounded-lg border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] text-xs outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => saveRename(item)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--rb-accent)]"
                              aria-label={t('common.confirm')}
                            >
                              <CheckOutlined className="text-xs" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--rb-text-secondary)]"
                              aria-label={t('common.cancel')}
                            >
                              <CloseOutlined className="text-xs" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                selectHistory(item.id)
                                setHistoryOpen(false)
                              }}
                              className="min-w-0 flex-1 text-left text-xs font-medium truncate"
                            >
                              {item.title}
                            </button>
                            <button
                              type="button"
                              onClick={() => startRename(item)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--rb-text-secondary)]"
                              aria-label={t('common.edit')}
                            >
                              <EditOutlined className="text-xs" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteHistory(item)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-red-500"
                              aria-label={t('common.delete')}
                            >
                              <DeleteOutlined className="text-xs" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[var(--rb-border)] bg-[var(--rb-bg-chrome)] px-3 py-2.5 pb-safe space-y-2">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {tagOptions.map(tag => {
              const active = selectedTags.includes(tag.value)
              return (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleTag(tag.value)}
                  className={`h-7 px-2.5 rounded-full text-[11px] font-medium border shrink-0 transition-colors ${
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
              rows={1}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={t('mobile.inputPlaceholder')}
              className="flex-1 max-h-24 px-3.5 py-2 rounded-2xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] text-sm outline-none focus:border-[var(--rb-accent)] resize-none"
            />
            <button
              type="button"
              onClick={isGenerating ? stopGeneration : handleSend}
              disabled={!isGenerating && !inputText.trim()}
              className="w-9 h-9 rounded-full bg-[var(--rb-accent)] text-white flex items-center justify-center shrink-0 disabled:opacity-40 active:opacity-90"
              aria-label={isGenerating ? t('common.cancel') : t('sider.chat')}
            >
              {isGenerating ? <PauseOutlined className="text-xs" /> : <ArrowUpOutlined className="text-xs" />}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
