import { Divider, Empty } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CurrentSentence, MenuLine, Sentences, WordDetails } from './cpns'
import { EVENT_NAMES, EventEmitter } from '@/services/EventService'
import { cacheService } from '@/services/CacheService'
import { generateAnalysis, getGenerationErrorMessage } from '@/services/ai/generate'
import { useBookmarkStore } from '@/store/useBookmarkStore'
import { useLLMStore } from '@/store/useLLMStore'
import { useOutputOptions } from '@/store/useOutputOptions'
import { useTTSStore } from '@/store/useTTSStore'
import { createTTSSpeak } from '@/services/ttsService'
import { assemblePrompt, contextMessages, INPUT_PROMPT, OUTPUT_PROMPT } from '@/constants/prompt'
import { useTranslation } from '@/i18n/useTranslation'
import type { AnalysisResult, SentenceAnalysis } from '@/types/ai'
import type { ReadingProgress } from '@/types/book'
import type { Model, OutputOption, Provider } from '@/types/llm'

type BookmarkInfo = {
  bookId: string
  sentence: string
  chapterIndex: number
  lineIndex: number
}

export default function SiderContent() {
  const { t } = useTranslation()
  const { sentenceOptions, batchProcessingSize, wordOptions, selectedWordId } = useOutputOptions()
  const { parseModel, providers } = useLLMStore()
  const { ttsProvider, ttsGlobalConfig, ttsConfig } = useTTSStore()
  const { addBookmark, removeBookmark, getBookmarksByBookId } = useBookmarkStore()

  const [sentence, setSentence] = useState('')
  const [sentenceAnalyses, setSentenceAnalyses] = useState<SentenceAnalysis[]>([])
  const [selectedTab, setSelectedTab] = useState('sentence-analysis')
  const [word, setWord] = useState('')
  const [wordDetails, setWordDetails] = useState('')
  const [wordReasoning, setWordReasoning] = useState('')
  const [bookmarkInfo, setBookmarkInfo] = useState<BookmarkInfo | null>(null)

  const sentenceController = useRef<AbortController | null>(null)
  const wordController = useRef<AbortController | null>(null)
  const sentenceRequestId = useRef(0)
  const wordRequestId = useRef(0)
  const currentSentence = useRef('')
  const currentWord = useRef('')

  const parseProvider = useMemo(
    () => findModelProvider(providers, parseModel),
    [providers, parseModel]
  )

  const wordOption = useMemo(() => (
    wordOptions.find(option => option.id === selectedWordId) ?? wordOptions[0] ?? {
      id: 'default-word-details',
      name: 'default',
      rulePrompt: INPUT_PROMPT.FUNC_WORD_DETAILS,
    }
  ), [wordOptions, selectedWordId])

  const speak = useMemo(() => {
    const ttsEnabled = ttsGlobalConfig.autoSentenceTTS || ttsGlobalConfig.autoWordTTS
    return ttsEnabled ? createTTSSpeak(ttsProvider, ttsConfig) : null
  }, [ttsProvider, ttsConfig, ttsGlobalConfig.autoSentenceTTS, ttsGlobalConfig.autoWordTTS])

  const updateAnalysis = useCallback((requestId: number, optionId: string, patch: Partial<SentenceAnalysis>) => {
    if (sentenceRequestId.current !== requestId) return
    setSentenceAnalyses(current => current.map(item => (
      item.id === optionId ? { ...item, ...patch } : item
    )))
  }, [])

  const processSentence = useCallback((text: string, bookId: string) => {
    if (speak && text && ttsGlobalConfig.autoSentenceTTS) speak(text)
    if (currentSentence.current === text) return

    currentSentence.current = text
    setSentence(text)
    setSelectedTab('sentence-analysis')
    setWord('')
    setWordDetails('')
    setWordReasoning('')
    currentWord.current = ''
    wordController.current?.abort()
    wordRequestId.current += 1

    sentenceController.current?.abort()
    const controller = new AbortController()
    sentenceController.current = controller
    const requestId = ++sentenceRequestId.current

    if (!text || !parseModel || !parseProvider) {
      setSentenceAnalyses([])
      return
    }

    setSentenceAnalyses(sentenceOptions.map(option => ({
      id: option.id,
      name: option.name,
      input: text,
      outputType: option.type,
      status: 'streaming',
      result: emptyResult(option),
      reasoning: '',
    })))

    const tasks = sentenceOptions.map(async option => {
      const cacheParams = createCacheParams(bookId, text, option, parseProvider, parseModel)

      try {
        const cached = await cacheService.get(cacheParams)
        if (cached) {
          updateAnalysis(requestId, option.id, {
            result: cached.result,
            reasoning: cached.reasoning,
            status: 'complete',
            fromCache: true,
          })
          return
        }

        const response = await generateAnalysis({
          provider: parseProvider,
          model: parseModel,
          outputType: option.type,
          instructions: assemblePrompt(option.rulePrompt, OUTPUT_PROMPT[option.type]),
          messages: contextMessages(text),
          abortSignal: controller.signal,
          onResult: result => updateAnalysis(requestId, option.id, { result }),
          onReasoning: reasoning => updateAnalysis(requestId, option.id, { reasoning }),
        })

        if (controller.signal.aborted) {
          updateAnalysis(requestId, option.id, { status: 'cancelled' })
          return
        }

        updateAnalysis(requestId, option.id, {
          ...response,
          status: 'complete',
        })

        if (isCacheable(response.result)) {
          await cacheService.set(cacheParams, {
            schemaVersion: 2,
            outputType: option.type,
            result: response.result,
            reasoning: response.reasoning,
          })
        }
      } catch (error) {
        updateAnalysis(requestId, option.id, controller.signal.aborted
          ? { status: 'cancelled' }
          : { status: 'error', error: getGenerationErrorMessage(error) })
      }
    })

    void Promise.allSettled(tasks).then(() => cacheService.clearCacheOnTriggerEvents())
  }, [parseModel, parseProvider, sentenceOptions, speak, ttsGlobalConfig.autoSentenceTTS, updateAnalysis])

  const handleLineIndex = useCallback((progress: ReadingProgress) => {
    const { chapterIndex, lineIndex } = progress.currentLocation
    const chapter = progress.sentenceChapters[chapterIndex] ?? []
    const selectedSentence = chapter[lineIndex] ?? ''
    const batch = collectSentenceBatch(chapter, lineIndex, batchProcessingSize)

    setBookmarkInfo({
      bookId: progress.bookId,
      sentence: selectedSentence,
      chapterIndex,
      lineIndex,
    })
    processSentence(batch, progress.bookId)
  }, [batchProcessingSize, processSentence])

  useEffect(() => {
    const unsubscribe = EventEmitter.on(EVENT_NAMES.SEND_MESSAGE, handleLineIndex)
    return () => {
      unsubscribe()
      sentenceController.current?.abort()
      wordController.current?.abort()
    }
  }, [handleLineIndex])

  const handleBookmarkToggle = useCallback(() => {
    if (!bookmarkInfo) return

    const bookmarks = getBookmarksByBookId(bookmarkInfo.bookId)
    const existing = bookmarks.find(item => (
      item.chapterIndex === bookmarkInfo.chapterIndex && item.lineIndex === bookmarkInfo.lineIndex
    ))

    if (existing) {
      removeBookmark(bookmarkInfo.bookId, existing.id)
    } else {
      addBookmark(bookmarkInfo)
    }
  }, [bookmarkInfo, addBookmark, removeBookmark, getBookmarksByBookId])

  const handleWord = useCallback(async (selectedWord: string) => {
    if (speak && selectedWord && ttsGlobalConfig.autoWordTTS) speak(selectedWord)
    if (currentWord.current === selectedWord) return

    currentWord.current = selectedWord
    setWord(selectedWord)
    setWordDetails('')
    setWordReasoning('')
    setSelectedTab('word-details')

    wordController.current?.abort()
    const controller = new AbortController()
    wordController.current = controller
    const requestId = ++wordRequestId.current
    if (!parseModel || !parseProvider) return

    try {
      await generateAnalysis({
        provider: parseProvider,
        model: parseModel,
        outputType: 'MD',
        instructions: assemblePrompt(wordOption.rulePrompt, OUTPUT_PROMPT.MD_WORD),
        messages: [{ role: 'user', content: `word: ${selectedWord}\nsentence: ${sentence}` }],
        abortSignal: controller.signal,
        onResult: result => {
          if (wordRequestId.current === requestId && result.type === 'MD') {
            setWordDetails(result.content)
          }
        },
        onReasoning: reasoning => {
          if (wordRequestId.current === requestId) setWordReasoning(reasoning)
        },
      })
    } catch (error) {
      if (!controller.signal.aborted) console.error('Word analysis failed:', error)
    }
  }, [parseModel, parseProvider, sentence, speak, ttsGlobalConfig.autoWordTTS, wordOption.rulePrompt])

  const handleEditComplete = useCallback((text: string) => {
    currentSentence.current = ''
    setBookmarkInfo(null)
    processSentence(text, '')
  }, [processSentence])

  const menuItems = useMemo(() => [
    { label: t('sider.sentenceAnalysis'), key: 'sentence-analysis' },
    { label: t('sider.wordDetails'), key: 'word-details', disabled: !word },
  ], [t, word])

  return (
    <div className="w-full h-[calc(100%-32px)] flex flex-col">
      <CurrentSentence
        sentence={sentence}
        handleWord={handleWord}
        onEditComplete={handleEditComplete}
        currentBookmarkInfo={bookmarkInfo}
        onBookmarkToggle={handleBookmarkToggle}
      />
      <Divider className="my-0" />
      <MenuLine selectedTab={selectedTab} items={menuItems} onTabChange={setSelectedTab} />
      <div className={selectedTab === 'sentence-analysis' ? 'flex flex-col flex-1 min-h-0' : 'hidden'}>
        {sentenceAnalyses.length > 0
          ? <Sentences sentenceProcessingList={sentenceAnalyses} />
          : <Empty description={parseModel ? t('sider.noSentenceSelected') : t('sider.noAnalysisModelSelected')} className="flex flex-col items-center justify-center h-[262px]" />}
      </div>
      <div className={selectedTab === 'word-details' ? 'flex flex-col flex-1 min-h-0' : 'hidden'}>
        {word && parseModel
          ? <WordDetails wordDetails={wordDetails} reasoning={wordReasoning} />
          : <Empty description={parseModel ? t('sider.noWordSelected') : t('sider.noAnalysisModelSelected')} className="flex flex-col items-center justify-center h-[262px]" />}
      </div>
      <Divider className="my-0" />
    </div>
  )
}

function findModelProvider(providers: Provider[], model: Model | null): Provider | null {
  if (!model) return null
  return providers.find(provider => provider.id === model.providerId) ?? null
}

function emptyResult(option: OutputOption): AnalysisResult {
  switch (option.type) {
    case 'SIMPLE_LIST':
      return { type: option.type, items: [] }
    case 'KEY_VALUE_LIST':
      return { type: option.type, items: [] }
    default:
      return { type: option.type, content: '' }
  }
}

function createCacheParams(
  bookId: string,
  sentence: string,
  option: OutputOption,
  provider: Provider,
  model: Model
) {
  return {
    bookId,
    sentence,
    ruleId: option.id,
    rulePrompt: option.rulePrompt,
    outputType: option.type,
    providerId: provider.id,
    modelId: model.id,
    temperature: model.temperature,
    topP: model.topP,
  }
}

function collectSentenceBatch(chapter: string[], startIndex: number, batchSize: number): string {
  const selected: string[] = []

  for (let index = startIndex; index < chapter.length && selected.length < batchSize; index += 1) {
    const text = chapter[index]
    if (text?.trim()) selected.push(text)
  }

  return selected.join('\n')
}

function isCacheable(result: AnalysisResult): boolean {
  switch (result.type) {
    case 'TEXT':
    case 'MD':
      return result.content.trim().length >= 5
    case 'SIMPLE_LIST':
    case 'KEY_VALUE_LIST':
      return result.items.length > 0
  }
}
