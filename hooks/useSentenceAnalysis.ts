'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  collectSentenceBatch,
  collectSurroundingContext,
  createInitialAnalyses,
  findModelProvider,
  runSentenceRules,
  runSingleSentenceRule,
} from '@/services/analysis/sentenceController'
import { createTTSController } from '@/services/ttsService'
import { useBookmarkStore } from '@/store/useBookmarkStore'
import { useLLMStore } from '@/store/useLLMStore'
import { useOutputOptions } from '@/store/useOutputOptions'
import { useReaderSessionStore } from '@/store/useReaderSessionStore'
import { useReadingProgressStore } from '@/store/useReadingProgress'
import { useTTSStore } from '@/store/useTTSStore'
import type { SentenceAnalysis } from '@/types/ai'
import { emptyAnalysisResult } from '@/types/ai'

export type BookmarkInfo = {
  bookId: string
  sentence: string
  chapterIndex: number
  lineIndex: number
}

export function useSentenceAnalysis() {
  const { sentenceOptions, batchProcessingSize } = useOutputOptions()
  const { parseModel, parseThinking, providers } = useLLMStore()
  const { ttsProvider, ttsGlobalConfig, ttsConfig } = useTTSStore()
  const { bookmarksByBook, addBookmark, removeBookmark } = useBookmarkStore()
  const { readingProgress } = useReadingProgressStore()
  const selectedLineIndex = useReaderSessionStore(state => state.selectedLineIndex)
  const selectedSentenceText = useReaderSessionStore(state => state.selectedSentenceText)
  const selectionSeq = useReaderSessionStore(state => state.selectionSeq)
  const jumpSeq = useReaderSessionStore(state => state.jumpSeq)
  const clearWordSelection = useReaderSessionStore(state => state.clearWordSelection)

  const [sentence, setSentence] = useState('')
  const [analyses, setAnalyses] = useState<SentenceAnalysis[]>([])
  const [bookmarkInfo, setBookmarkInfo] = useState<BookmarkInfo | null>(null)
  const [isPlayingTTS, setIsPlayingTTS] = useState(false)

  const sentenceControllerRef = useRef<AbortController | null>(null)
  const retryControllersRef = useRef<Set<AbortController>>(new Set())
  const sentenceRequestIdRef = useRef(0)
  const currentSentenceRef = useRef('')
  const contextRef = useRef<{ bookId: string; before?: string; after?: string }>({ bookId: '' })

  const parseProvider = useMemo(
    () => findModelProvider(providers, parseModel),
    [providers, parseModel]
  )

  const ttsController = useMemo(
    () => createTTSController(ttsProvider, ttsConfig),
    [ttsProvider, ttsConfig]
  )

  const ttsControllerRef = useRef(ttsController)
  ttsControllerRef.current = ttsController

  useEffect(() => {
    setIsPlayingTTS(ttsController.getStatus().isSpeaking)
    return ttsController.subscribeStatus(status => {
      setIsPlayingTTS(status.isSpeaking)
    })
  }, [ttsController])

  const abortAllRequests = useCallback(() => {
    sentenceControllerRef.current?.abort()
    sentenceControllerRef.current = null
    retryControllersRef.current.forEach(controller => controller.abort())
    retryControllersRef.current.clear()
    sentenceRequestIdRef.current += 1
  }, [])

  useEffect(() => {
    return () => {
      void ttsController.stop()
    }
  }, [ttsController])

  useEffect(() => {
    return () => {
      abortAllRequests()
    }
  }, [abortAllRequests])

  const prevSelectionSeqRef = useRef(0)
  const prevJumpSeqRef = useRef(jumpSeq)
  const prevBookIdRef = useRef(readingProgress.bookId)

  useEffect(() => {
    const bookChanged = prevBookIdRef.current !== readingProgress.bookId
    const sessionReset = prevSelectionSeqRef.current !== 0 && selectionSeq === 0
    const jumped = prevJumpSeqRef.current !== jumpSeq
    prevBookIdRef.current = readingProgress.bookId
    prevSelectionSeqRef.current = selectionSeq
    prevJumpSeqRef.current = jumpSeq

    if (!bookChanged && !sessionReset && !jumped) return

    abortAllRequests()
    void ttsControllerRef.current.stop()
    currentSentenceRef.current = ''
    contextRef.current = { bookId: readingProgress.bookId }
    setSentence('')
    setAnalyses([])
    setBookmarkInfo(null)
  }, [readingProgress.bookId, selectionSeq, jumpSeq, abortAllRequests])

  const updateAnalysis = useCallback((requestId: number, optionId: string, patch: Partial<SentenceAnalysis>) => {
    if (sentenceRequestIdRef.current !== requestId) return
    setAnalyses(current => current.map(item => (
      item.id === optionId ? { ...item, ...patch } : item
    )))
  }, [])

  const processSentence = useCallback((
    text: string,
    bookId: string,
    contextBefore?: string,
    contextAfter?: string
  ) => {
    if (
      currentSentenceRef.current === text &&
      contextRef.current.bookId === bookId &&
      contextRef.current.before === contextBefore &&
      contextRef.current.after === contextAfter
    ) {
      return
    }

    currentSentenceRef.current = text
    contextRef.current = { bookId, before: contextBefore, after: contextAfter }
    setSentence(text)

    abortAllRequests()
    const controller = new AbortController()
    sentenceControllerRef.current = controller
    const requestId = sentenceRequestIdRef.current

    if (!text || !parseModel || !parseProvider) {
      setAnalyses([])
      return
    }

    setAnalyses(createInitialAnalyses(text, sentenceOptions))

    void runSentenceRules({
      bookId,
      sentence: text,
      contextBefore,
      contextAfter,
      options: sentenceOptions,
      provider: parseProvider,
      model: parseModel,
      thinking: parseThinking,
      abortSignal: controller.signal,
      onUpdate: (optionId, patch) => updateAnalysis(requestId, optionId, patch),
    })
  }, [abortAllRequests, parseModel, parseProvider, parseThinking, sentenceOptions, updateAnalysis])

  useEffect(() => {
    if (selectionSeq === 0 || selectedLineIndex === null || !readingProgress.bookId) return

    const { chapterIndex } = readingProgress.currentLocation
    const chapter = readingProgress.sentenceChapters[chapterIndex] ?? []
    const lineSentence = chapter[selectedLineIndex] ?? selectedSentenceText
    const { batch, lastIndex } = collectSentenceBatch(chapter, selectedLineIndex, batchProcessingSize)
    const { before, after } = collectSurroundingContext(chapter, selectedLineIndex, lastIndex)

    setBookmarkInfo({
      bookId: readingProgress.bookId,
      sentence: lineSentence,
      chapterIndex,
      lineIndex: selectedLineIndex,
    })

    if (batch && ttsGlobalConfig.autoSentenceTTS) {
      void ttsController.speak(batch)
    }

    processSentence(batch, readingProgress.bookId, before, after)
    // Intentionally react to explicit sentence selection sequence updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionSeq])

  const editSentence = useCallback((text: string) => {
    currentSentenceRef.current = ''
    setBookmarkInfo(null)
    clearWordSelection()
    processSentence(text, '')
  }, [clearWordSelection, processSentence])

  const retryRule = useCallback((optionId: string) => {
    const option = sentenceOptions.find(item => item.id === optionId)
    if (!option || !sentence || !parseModel || !parseProvider) return

    const requestId = sentenceRequestIdRef.current
    const controller = new AbortController()
    retryControllersRef.current.add(controller)

    updateAnalysis(requestId, optionId, {
      status: 'streaming',
      result: emptyAnalysisResult(option.type),
      reasoning: '',
      error: undefined,
      fromCache: false,
    })

    void runSingleSentenceRule({
      bookId: contextRef.current.bookId,
      sentence,
      contextBefore: contextRef.current.before,
      contextAfter: contextRef.current.after,
      option,
      provider: parseProvider,
      model: parseModel,
      thinking: parseThinking,
      abortSignal: controller.signal,
      skipCache: true,
      onUpdate: (targetId, patch) => updateAnalysis(requestId, targetId, patch),
    }).finally(() => {
      retryControllersRef.current.delete(controller)
    })
  }, [parseModel, parseProvider, parseThinking, sentence, sentenceOptions, updateAnalysis])

  const isBookmarked = useMemo(() => {
    if (!bookmarkInfo) return false
    const bookBookmarks = bookmarksByBook[bookmarkInfo.bookId] ?? []
    return bookBookmarks.some(item => (
      item.chapterIndex === bookmarkInfo.chapterIndex && item.lineIndex === bookmarkInfo.lineIndex
    ))
  }, [bookmarkInfo, bookmarksByBook])

  const toggleBookmark = useCallback(() => {
    if (!bookmarkInfo) return
    const bookBookmarks = bookmarksByBook[bookmarkInfo.bookId] ?? []
    const existing = bookBookmarks.find(item => (
      item.chapterIndex === bookmarkInfo.chapterIndex && item.lineIndex === bookmarkInfo.lineIndex
    ))

    if (existing) {
      removeBookmark(bookmarkInfo.bookId, existing.id)
    } else {
      addBookmark(bookmarkInfo)
    }
  }, [addBookmark, bookmarkInfo, bookmarksByBook, removeBookmark])

  const speakSentence = useCallback((textOverride?: string) => {
    const text = textOverride ?? sentence
    if (!text) return
    void ttsController.speak(text)
  }, [sentence, ttsController])

  const stopTTS = useCallback(() => {
    void ttsController.stop()
  }, [ttsController])

  return {
    sentence,
    analyses,
    bookmarkInfo,
    isBookmarked,
    isPlayingTTS,
    canRun: Boolean(parseModel && parseProvider),
    retryRule,
    editSentence,
    toggleBookmark,
    speakSentence,
    stopTTS,
  }
}
