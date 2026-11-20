'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { assemblePrompt, INPUT_PROMPT, OUTPUT_PROMPT } from '@/constants/prompt'
import { generateAnalysis, getGenerationErrorMessage } from '@/services/ai/generate'
import { findModelProvider } from '@/services/analysis/sentenceController'
import { createTTSController } from '@/services/ttsService'
import { useLLMStore } from '@/store/useLLMStore'
import { useOutputOptions } from '@/store/useOutputOptions'
import { useReaderSessionStore } from '@/store/useReaderSessionStore'
import { useTTSStore } from '@/store/useTTSStore'

export function useWordLookup(sentenceOverride?: string) {
  const { wordOptions, selectedWordId } = useOutputOptions()
  const { parseModel, parseThinking, providers } = useLLMStore()
  const { ttsProvider, ttsConfig, ttsGlobalConfig } = useTTSStore()
  const selectedWord = useReaderSessionStore(state => state.selectedWord)
  const selectedSentenceText = useReaderSessionStore(state => state.selectedSentenceText)
  const selectWordInSentence = useReaderSessionStore(state => state.selectWordInSentence)
  const clearWordSelection = useReaderSessionStore(state => state.clearWordSelection)

  const effectiveSentence = sentenceOverride ?? selectedSentenceText

  const [wordDetails, setWordDetails] = useState('')
  const [wordReasoning, setWordReasoning] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPlayingTTS, setIsPlayingTTS] = useState(false)

  const wordControllerRef = useRef<AbortController | null>(null)
  const wordRequestIdRef = useRef(0)
  const currentWordRef = useRef('')
  const hasErrorRef = useRef(false)

  const parseProvider = useMemo(
    () => findModelProvider(providers, parseModel),
    [providers, parseModel]
  )

  const wordOption = useMemo(() => (
    wordOptions.find(option => option.id === selectedWordId) ?? wordOptions[0] ?? {
      id: 'default-word-details',
      name: 'default',
      rulePrompt: INPUT_PROMPT.WORD_QUICK_LOOK,
    }
  ), [wordOptions, selectedWordId])

  const ttsController = useMemo(
    () => createTTSController(ttsProvider, ttsConfig),
    [ttsProvider, ttsConfig]
  )

  useEffect(() => {
    setIsPlayingTTS(ttsController.getStatus().isSpeaking)
    return ttsController.subscribeStatus(status => {
      setIsPlayingTTS(status.isSpeaking)
    })
  }, [ttsController])

  const abortWordLookup = useCallback(() => {
    wordControllerRef.current?.abort()
    wordControllerRef.current = null
    wordRequestIdRef.current += 1
  }, [])

  useEffect(() => {
    return () => {
      abortWordLookup()
    }
  }, [abortWordLookup])

  useEffect(() => {
    if (!selectedWord) {
      abortWordLookup()
      currentWordRef.current = ''
      hasErrorRef.current = false
      setWordDetails('')
      setWordReasoning('')
      setLoading(false)
      setError(null)
    }
  }, [selectedWord, abortWordLookup])

  const lookupWord = useCallback(async (targetWord: string) => {
    const trimmed = targetWord.trim()
    if (!trimmed) return

    selectWordInSentence(trimmed)

    if (ttsGlobalConfig.autoWordTTS) {
      void ttsController.speak(trimmed)
    }

    if (currentWordRef.current === trimmed && !hasErrorRef.current) {
      return
    }

    currentWordRef.current = trimmed
    hasErrorRef.current = false
    setWordDetails('')
    setWordReasoning('')
    setError(null)

    abortWordLookup()
    const controller = new AbortController()
    wordControllerRef.current = controller
    const requestId = wordRequestIdRef.current

    if (!parseModel || !parseProvider) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      await generateAnalysis({
        provider: parseProvider,
        model: parseModel,
        outputType: 'MD',
        instructions: assemblePrompt(wordOption.rulePrompt, OUTPUT_PROMPT.MD_WORD),
        messages: [{ role: 'user', content: `word: ${trimmed}\nsentence: ${effectiveSentence}` }],
        thinking: parseThinking,
        abortSignal: controller.signal,
        onResult: result => {
          if (wordRequestIdRef.current === requestId && result.type === 'MD') {
            setWordDetails(result.content)
          }
        },
        onReasoning: reasoning => {
          if (wordRequestIdRef.current === requestId) {
            setWordReasoning(reasoning)
          }
        },
      })
    } catch (err) {
      if (!controller.signal.aborted && wordRequestIdRef.current === requestId) {
        hasErrorRef.current = true
        setError(getGenerationErrorMessage(err))
        console.error('Word analysis failed:', err)
      }
    } finally {
      if (wordRequestIdRef.current === requestId) {
        setLoading(false)
      }
    }
  }, [
    abortWordLookup,
    effectiveSentence,
    parseModel,
    parseProvider,
    parseThinking,
    selectWordInSentence,
    ttsController,
    ttsGlobalConfig.autoWordTTS,
    wordOption.rulePrompt,
  ])

  const speakWord = useCallback((wordOverride?: string) => {
    const target = wordOverride ?? selectedWord
    if (!target) return
    void ttsController.speak(target)
  }, [selectedWord, ttsController])

  const stopTTS = useCallback(() => {
    void ttsController.stop()
  }, [ttsController])

  const clearWord = useCallback(() => {
    clearWordSelection()
  }, [clearWordSelection])

  return {
    word: selectedWord,
    wordDetails,
    wordReasoning,
    loading,
    error,
    isPlayingTTS,
    canRun: Boolean(parseModel && parseProvider),
    lookupWord,
    speakWord,
    stopTTS,
    clearWord,
  }
}
