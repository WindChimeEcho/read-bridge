'use client'

import type React from 'react'
import { useEffect, useMemo, useRef } from 'react'
import nlp from 'compromise'
import {
  BookFilled,
  BookOutlined,
  CloseOutlined,
  CommentOutlined,
  LoadingOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  SoundOutlined,
} from '@ant-design/icons'
import MarkdownRendererWrapper from '@/app/components/common/MarkdownRendererWrapper'
import { useSentenceAnalysis } from '@/hooks/useSentenceAnalysis'
import { useWordLookup } from '@/hooks/useWordLookup'
import { useTranslation } from '@/i18n/useTranslation'
import { registerBackHandler } from '@/services/platform/backAdapter'
import { useReaderSessionStore } from '@/store/useReaderSessionStore'
import type { AnalysisResult, SentenceAnalysis } from '@/types/ai'
import MobileReasoningCollapse from '../components/MobileReasoningCollapse'

interface CompromisedTerm {
  text: string
}

function cleanLookupToken(raw: string): string {
  const cleaned = raw.replace(/^[^\p{L}\p{N}'-]+|[^\p{L}\p{N}'-]+$/gu, '')
  return cleaned || raw.trim()
}

export default function MobileAnalysisSheet() {
  const { t } = useTranslation()
  const activeSheet = useReaderSessionStore(state => state.activeSheet)
  const analysisTab = useReaderSessionStore(state => state.analysisTab)
  const sheetDetent = useReaderSessionStore(state => state.sheetDetent)
  const closeActiveSheet = useReaderSessionStore(state => state.closeActiveSheet)
  const setSheetDetent = useReaderSessionStore(state => state.setSheetDetent)
  const setAnalysisTab = useReaderSessionStore(state => state.setAnalysisTab)
  const openChatSheet = useReaderSessionStore(state => state.openChatSheet)

  const {
    sentence,
    analyses,
    isBookmarked,
    isPlayingTTS,
    retryRule,
    toggleBookmark,
    speakSentence,
    stopTTS,
  } = useSentenceAnalysis()

  const {
    word,
    wordDetails,
    wordReasoning,
    loading: wordLoading,
    error: wordError,
    isPlayingTTS: isWordPlayingTTS,
    lookupWord,
    speakWord,
    stopTTS: stopWordTTS,
  } = useWordLookup(sentence)

  const dragStartYRef = useRef<number | null>(null)
  const dragDeltaYRef = useRef(0)

  useEffect(() => {
    if (activeSheet !== 'analysis') return
    return registerBackHandler(80, () => {
      closeActiveSheet()
      return true
    })
  }, [activeSheet, closeActiveSheet])

  const terms = useMemo<CompromisedTerm[]>(() => {
    if (!sentence) return []
    const parsed = nlp(sentence).terms().json() as CompromisedTerm[]
    return Array.isArray(parsed) ? parsed : []
  }, [sentence])

  if (activeSheet !== 'analysis') return null

  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStartYRef.current = e.clientY
    dragDeltaYRef.current = 0
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartYRef.current === null) return
    dragDeltaYRef.current = e.clientY - dragStartYRef.current
  }

  const handleDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartYRef.current === null) return
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }

    const deltaY = dragDeltaYRef.current
    dragStartYRef.current = null
    dragDeltaYRef.current = 0

    if (deltaY < -40) {
      setSheetDetent('expanded')
      return
    }
    if (deltaY > 70 && sheetDetent === 'peek') {
      closeActiveSheet()
      return
    }
    if (deltaY > 40 && sheetDetent === 'expanded') {
      setSheetDetent('peek')
      return
    }
    if (Math.abs(deltaY) < 6) {
      setSheetDetent(sheetDetent === 'peek' ? 'expanded' : 'peek')
    }
  }

  const normalizedSelectedWord = word.trim().toLowerCase()

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end pointer-events-none">
      <div
        className="flex-1 bg-black/20 pointer-events-auto"
        onClick={closeActiveSheet}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={t('mobile.sentenceAnalysis')}
        className={`pointer-events-auto w-full flex flex-col rounded-t-3xl bg-[var(--rb-bg-surface)] text-[var(--rb-text-primary)] border-t border-[var(--rb-border)] shadow-2xl transition-[height] duration-200 ease-out pb-safe ${
          sheetDetent === 'expanded' ? 'h-[88dvh]' : 'h-[55dvh]'
        }`}
      >
        <div
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
          className="pt-2.5 pb-2 flex justify-center touch-none cursor-grab active:cursor-grabbing shrink-0"
        >
          <div className="w-10 h-1 rounded-full bg-[var(--rb-border)]" />
        </div>

        <div className="px-4 pb-2.5 shrink-0 border-b border-[var(--rb-border)] space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isPlayingTTS) {
                    stopTTS()
                  } else {
                    void speakSentence()
                  }
                }}
                className="h-8 px-3 rounded-full border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] text-xs font-medium flex items-center gap-1.5 active:bg-[var(--rb-bg-muted)]"
                aria-label={isPlayingTTS ? t('mobile.stopSpeak') : t('mobile.speak')}
              >
                {isPlayingTTS ? <PauseCircleOutlined /> : <SoundOutlined />}
                <span>{isPlayingTTS ? t('mobile.stopSpeak') : t('mobile.speak')}</span>
              </button>

              <button
                type="button"
                onClick={toggleBookmark}
                className={`h-8 px-3 rounded-full border text-xs font-medium flex items-center gap-1.5 ${
                  isBookmarked
                    ? 'border-[var(--rb-accent)] bg-[var(--rb-highlight-bg)] text-[var(--rb-accent)]'
                    : 'border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)] active:bg-[var(--rb-bg-muted)]'
                }`}
                aria-label={t('mobile.bookmark')}
              >
                {isBookmarked ? <BookFilled /> : <BookOutlined />}
                <span>{t('mobile.bookmark')}</span>
              </button>

              <button
                type="button"
                onClick={() => openChatSheet(sentence)}
                className="h-8 px-3 rounded-full bg-[var(--rb-highlight-bg)] text-[var(--rb-accent)] text-xs font-semibold flex items-center gap-1.5 active:opacity-80"
              >
                <CommentOutlined />
                <span>{t('mobile.askFollowUp')}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={closeActiveSheet}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--rb-text-secondary)] active:bg-[var(--rb-bg-muted)]"
              aria-label={t('common.cancel')}
            >
              <CloseOutlined className="text-xs" />
            </button>
          </div>

          <div className="max-h-20 overflow-y-auto text-sm leading-relaxed rb-serif">
            {terms.length > 0 ? (
              <p className="flex flex-wrap gap-x-1 gap-y-0.5">
                {terms.map((term, index) => {
                  const clean = cleanLookupToken(term.text)
                  const isActiveWord =
                    normalizedSelectedWord.length > 0 &&
                    clean.toLowerCase() === normalizedSelectedWord
                  return (
                    <button
                      key={`${index}-${term.text}`}
                      type="button"
                      onClick={() => {
                        void lookupWord(clean)
                      }}
                      className={`rounded px-0.5 text-left transition-colors ${
                        isActiveWord
                          ? 'bg-[var(--rb-highlight-bg)] text-[var(--rb-accent)] font-semibold underline decoration-[var(--rb-accent)] underline-offset-2'
                          : 'underline decoration-dotted decoration-[var(--rb-border)] underline-offset-4 active:bg-[var(--rb-highlight-bg)]'
                      }`}
                    >
                      {term.text}
                    </button>
                  )
                })}
              </p>
            ) : (
              <p>{sentence}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--rb-bg-muted)]">
            <button
              type="button"
              onClick={() => setAnalysisTab('sentence')}
              className={`h-8 rounded-lg text-xs font-semibold transition-colors ${
                analysisTab === 'sentence'
                  ? 'bg-[var(--rb-bg-surface)] text-[var(--rb-text-primary)] shadow-sm'
                  : 'text-[var(--rb-text-secondary)]'
              }`}
            >
              {t('mobile.sentenceAnalysis')}
            </button>
            <button
              type="button"
              onClick={() => setAnalysisTab('word')}
              className={`h-8 rounded-lg text-xs font-semibold transition-colors ${
                analysisTab === 'word'
                  ? 'bg-[var(--rb-bg-surface)] text-[var(--rb-text-primary)] shadow-sm'
                  : 'text-[var(--rb-text-secondary)]'
              }`}
            >
              {t('mobile.wordLookup')}
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
          {analysisTab === 'sentence' ? (
            analyses.length === 0 ? (
              <div className="py-10 text-center text-xs text-[var(--rb-text-secondary)]">
                {t('sider.selectSentence')}
              </div>
            ) : (
              analyses.map(item => (
                <MobileAnalysisCard
                  key={item.id}
                  analysis={item}
                  onRetry={() => retryRule(item.id)}
                  retryLabel={t('mobile.retryRule')}
                  reasoningLabel={t('mobile.thinkingProcess')}
                />
              ))
            )
          ) : !word ? (
            <div className="py-12 text-center text-xs text-[var(--rb-text-secondary)]">
              {t('mobile.selectWordHint')}
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-bold">{word}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (isWordPlayingTTS) {
                      stopWordTTS()
                    } else {
                      void speakWord()
                    }
                  }}
                  className="w-8 h-8 rounded-full border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] flex items-center justify-center active:bg-[var(--rb-bg-muted)]"
                  aria-label={t('mobile.speak')}
                >
                  {isWordPlayingTTS ? <PauseCircleOutlined /> : <SoundOutlined />}
                </button>
              </div>

              <MobileReasoningCollapse
                content={wordReasoning}
                label={t('mobile.thinkingProcess')}
              />

              {wordError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400">
                  {wordError}
                </div>
              )}

              {wordLoading && !wordDetails ? (
                <div className="py-4 flex items-center gap-2 text-xs text-[var(--rb-text-secondary)]">
                  <LoadingOutlined />
                  <span>{t('mobile.analysisPending')}</span>
                </div>
              ) : (
                <MarkdownRendererWrapper content={wordDetails} />
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function MobileAnalysisCard({
  analysis,
  onRetry,
  retryLabel,
  reasoningLabel,
}: {
  analysis: SentenceAnalysis
  onRetry: () => void
  retryLabel: string
  reasoningLabel: string
}) {
  const showTitle = analysis.result.type !== 'MD'
  const contentEmpty = !hasResultContent(analysis.result)

  return (
    <div className="rounded-2xl border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] p-3.5 space-y-2">
      {showTitle && (
        <div className="text-xs font-semibold text-[var(--rb-text-secondary)]">
          {analysis.name}
        </div>
      )}

      <MobileReasoningCollapse content={analysis.reasoning} label={reasoningLabel} />

      {analysis.error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-2.5 flex items-center justify-between gap-2 text-xs text-red-600 dark:text-red-400">
          <span className="min-w-0 flex-1 break-words">{analysis.error}</span>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 h-7 px-2.5 rounded-lg bg-red-500/15 font-semibold flex items-center gap-1"
          >
            <ReloadOutlined className="text-[11px]" />
            <span>{retryLabel}</span>
          </button>
        </div>
      )}

      {analysis.status === 'streaming' && contentEmpty && (
        <div className="py-1 flex items-center gap-2 text-xs text-[var(--rb-text-secondary)]">
          <LoadingOutlined />
        </div>
      )}

      <MobileResultContent result={analysis.result} />
    </div>
  )
}

function MobileResultContent({ result }: { result: AnalysisResult }) {
  switch (result.type) {
    case 'TEXT':
      return <div className="text-sm leading-relaxed whitespace-pre-wrap">{result.content}</div>
    case 'MD':
      return <MarkdownRendererWrapper content={result.content} />
    case 'SIMPLE_LIST':
      return (
        <ul className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
          {result.items.map((item, idx) => (
            <li key={`${idx}-${item}`}>{item}</li>
          ))}
        </ul>
      )
    case 'KEY_VALUE_LIST':
      return (
        <div className="space-y-1.5 text-sm leading-relaxed">
          {result.items.map((item, idx) => (
            <div key={`${idx}-${item.label}`}>
              <span className="font-semibold">{item.label}</span>
              {item.label && item.description ? ': ' : ''}
              <span>{item.description}</span>
            </div>
          ))}
        </div>
      )
  }
}

function hasResultContent(result: AnalysisResult): boolean {
  switch (result.type) {
    case 'TEXT':
    case 'MD':
      return result.content.trim().length > 0
    case 'SIMPLE_LIST':
    case 'KEY_VALUE_LIST':
      return result.items.length > 0
  }
}
