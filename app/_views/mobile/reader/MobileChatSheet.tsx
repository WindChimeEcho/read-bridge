'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  HistoryOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import MarkdownRendererWrapper from '@/app/components/common/MarkdownRendererWrapper'
import { useChatSession } from '@/hooks/useChatSession'
import { useTranslation } from '@/i18n/useTranslation'
import { useReaderSessionStore } from '@/store/useReaderSessionStore'
import type { LLMHistory } from '@/types/llm'
import { MobileIconButton, MobilePillButton } from '../components/MobileButtons'
import MobileChatComposer from '../components/MobileChatComposer'
import MobileReasoningCollapse from '../components/MobileReasoningCollapse'
import MobileSelect from '../components/MobileSelect'
import MobileSheet from '../components/MobileSheet'

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
    if (activeSheet === 'chat') {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeSheet, history.messages])

  const handleBack = () => {
    if (historyOpen) {
      setHistoryOpen(false)
      return true
    }
    closeActiveSheet()
    return true
  }

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
    <MobileSheet
      open={activeSheet === 'chat'}
      onClose={closeActiveSheet}
      ariaLabel={t('sider.chat')}
      height="full"
      zIndexClass="z-40"
      backPriority={85}
      onBack={handleBack}
    >
      <header className="px-3 py-2.5 border-b border-[var(--rb-border)] bg-[var(--rb-bg-chrome)] flex items-center gap-2 shrink-0">
        <MobileIconButton
          size="md"
          variant="ghost"
          active={historyOpen}
          onClick={() => setHistoryOpen(prev => !prev)}
          aria-label={t('mobile.history')}
        >
          <HistoryOutlined />
        </MobileIconButton>

        <MobileSelect
          variant="pill"
          title={t('mobile.selectPrompt')}
          value={selectedPromptId}
          onChange={changePrompt}
          options={promptOptions.map(option => ({
            value: option.id,
            label: option.name,
          }))}
          className="min-w-0 flex-1"
        />

        <MobilePillButton
          size="md"
          variant="primary"
          onClick={() => {
            newChat()
            setHistoryOpen(false)
          }}
        >
          <PlusOutlined className="text-[11px]" />
          <span>{t('mobile.newChat')}</span>
        </MobilePillButton>

        <MobileIconButton
          size="md"
          variant="ghost"
          onClick={closeActiveSheet}
          aria-label={t('common.cancel')}
        >
          <CloseOutlined className="text-xs" />
        </MobileIconButton>
      </header>

      {quotedSentence && (
        <div className="px-4 py-2 border-b border-[var(--rb-border)] bg-[var(--rb-highlight-bg)]/60 flex items-center gap-2 shrink-0">
          <span className="text-xs leading-5 font-semibold text-[var(--rb-accent)] shrink-0">
            {t('mobile.quotedSentence')}:
          </span>
          <span className="text-xs leading-5 text-[var(--rb-text-primary)] truncate flex-1">
            {quotedSentence}
          </span>
          <MobileIconButton
            size="xs"
            variant="ghost"
            onClick={clearQuote}
            className="text-[var(--rb-accent)] active:bg-[var(--rb-highlight-bg)]"
            aria-label={t('common.delete')}
          >
            <CloseOutlined className="text-[10px]" />
          </MobileIconButton>
        </div>
      )}

      <div className="relative flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col">
          {history.messages.length === 0 ? (
            <div className="flex-1 min-h-full flex items-center justify-center text-xs text-[var(--rb-text-secondary)]">
              {t('mobile.inputPlaceholder')}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {history.messages.map((msg, index) => {
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
                })}
              </div>
              <div ref={scrollEndRef} />
            </>
          )}
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

      <MobileChatComposer
        value={inputText}
        onChange={setInputText}
        onSend={handleSend}
        onStop={stopGeneration}
        isGenerating={isGenerating}
        placeholder={t('mobile.inputPlaceholder')}
        sendAriaLabel={t('sider.chat')}
        stopAriaLabel={t('common.cancel')}
        tagOptions={tagOptions}
        selectedTags={selectedTags}
        onToggleTag={toggleTag}
      />
    </MobileSheet>
  )
}
