'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ModelMessage } from 'ai'
import dayjs from 'dayjs'
import { useTranslation } from '@/i18n/useTranslation'
import { generateAnalysis } from '@/services/ai/generate'
import { notify } from '@/services/platform/notify'
import { useHistoryStore } from '@/store/useHistoryStore'
import { useLLMStore } from '@/store/useLLMStore'
import { getNewHistory, useOutputOptions } from '@/store/useOutputOptions'
import { useReaderSessionStore } from '@/store/useReaderSessionStore'
import { useReadingProgressStore } from '@/store/useReadingProgress'
import type { LLMHistory } from '@/types/llm'

export function useChatSession() {
  const { t } = useTranslation()
  const { readingProgress } = useReadingProgressStore()
  const { selectedId, promptOptions, setSelectedId } = useOutputOptions()
  const {
    historys,
    setHistory: setStoreHistory,
    deleteHistory: deleteStoreHistory,
    updateHistory: updateStoreHistory,
    groupHistoryByTime,
  } = useHistoryStore()
  const { chatModel, chatThinking, providers } = useLLMStore()
  const chatQuotedSentence = useReaderSessionStore(state => state.chatQuotedSentence)
  const clearChatQuote = useReaderSessionStore(state => state.clearChatQuote)

  const [history, setHistory] = useState<LLMHistory>(() => getNewHistory(promptOptions, selectedId))
  const [isGenerating, setIsGenerating] = useState(false)

  const historyRef = useRef(history)
  historyRef.current = history

  const abortControllerRef = useRef<AbortController | null>(null)
  const generationIdRef = useRef(0)

  const chatProvider = useMemo(() => (
    chatModel ? providers.find(provider => provider.id === chatModel.providerId) ?? null : null
  ), [chatModel, providers])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      generationIdRef.current += 1
    }
  }, [])

  const tagOptions = useMemo(() => [
    {
      label: t('sider.surroundingText'),
      value: 'base_context',
    },
    {
      label: t('sider.currentChapter'),
      value: 'current_chapter',
    },
  ], [t])

  const buildTagContext = useCallback((tags: string[]): ModelMessage[] => {
    const { sentenceChapters = [], currentLocation = { chapterIndex: 0, lineIndex: 0 } } = readingProgress
    const { chapterIndex = 0, lineIndex = 0 } = currentLocation
    const currentChapter = sentenceChapters[chapterIndex] || []
    const selectedLine = currentChapter[lineIndex]
    const finalContext: ModelMessage[] = []

    if (chatQuotedSentence) {
      finalContext.push({
        role: 'user',
        content: `I'm focusing on this quoted sentence:\n\n${chatQuotedSentence}`,
      })
      finalContext.push({
        role: 'assistant',
        content: 'I\'ve received the quoted sentence. Ready for your question.',
      })
    }

    if (currentChapter.length === 0) {
      return finalContext
    }

    const tagMessages = tags.map((tag): ModelMessage | null => {
      switch (tag) {
        case 'base_context': {
          if (tags.includes('current_chapter')) return null
          const bookContext = currentChapter
            .slice(Math.max(lineIndex - 20, 0), Math.min(lineIndex + 20, currentChapter.length))
            .join('\n\n')
          return {
            role: 'user',
            content: `I'm providing the following excerpt from a book as context:\n\n${bookContext}\n\nThe selected line is:\n\n${selectedLine}\n\nBased on this context, please answer: [user question]`,
          }
        }
        case 'current_chapter':
          return {
            role: 'user',
            content: `I'm providing the following excerpt from a book as context:\n\n${currentChapter.join('\n\n')}\n\nThe selected line is:\n\n${selectedLine}\n\nBased on this context, please answer: [user question]`,
          }
        default:
          return null
      }
    }).filter((item): item is ModelMessage => item !== null)

    tagMessages.forEach(ctx => {
      finalContext.push(ctx)
      finalContext.push({
        role: 'assistant',
        content: 'I\'ve received the context. Ready for your question.',
      })
    })

    return finalContext
  }, [chatQuotedSentence, readingProgress])

  const runChat = useCallback(async (nextHistory: LLMHistory, tags: string[]) => {
    if (!chatModel || !chatProvider) throw new Error('Chat model is not configured')
    if (nextHistory.messages.length === 0) throw new Error('newHistory.messages is empty')

    setIsGenerating(true)

    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller
    const generationId = ++generationIdRef.current

    const tagContext = (tags.length > 0 || chatQuotedSentence) ? buildTagContext(tags) : []
    const messages: ModelMessage[] = [
      ...tagContext,
      ...nextHistory.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ]

    const assistantMessage = {
      role: 'assistant' as const,
      content: '',
      reasoningContent: '',
      timestamp: dayjs().unix(),
      name: chatModel.name,
    }
    let currentMessages = [...nextHistory.messages, assistantMessage]
    let content = ''
    let reasoning = ''
    let reasoningStartedAt: number | null = null
    let generationFinished = false

    const updateAssistantMessage = () => {
      if (generationIdRef.current !== generationId) return
      const thinkingTime = reasoningStartedAt && (content || generationFinished)
        ? Math.max(1, dayjs().unix() - reasoningStartedAt)
        : undefined
      currentMessages = [
        ...currentMessages.slice(0, -1),
        { ...assistantMessage, content, reasoningContent: reasoning, thinkingTime },
      ]
      setHistory(current => ({ ...current, messages: currentMessages }))
    }

    try {
      setHistory(current => ({ ...current, messages: currentMessages }))
      await generateAnalysis({
        provider: chatProvider,
        model: chatModel,
        outputType: 'MD',
        instructions: nextHistory.prompt,
        messages,
        thinking: chatThinking,
        abortSignal: controller.signal,
        onResult: result => {
          if (result.type !== 'MD') return
          content = result.content
          updateAssistantMessage()
        },
        onReasoning: value => {
          if (reasoningStartedAt === null) reasoningStartedAt = dayjs().unix()
          reasoning = value
          updateAssistantMessage()
        },
      })
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('Chat generation error:', error)
        notify.error('聊天生成出错')
      }
    } finally {
      if (generationIdRef.current !== generationId) return
      generationFinished = true
      if (controller.signal.aborted) {
        notify.info('已中断聊天生成')
      }
      updateAssistantMessage()
      const completedHistory: LLMHistory = {
        ...nextHistory,
        messages: currentMessages,
      }
      setHistory(completedHistory)
      setStoreHistory(completedHistory)
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }, [buildTagContext, chatModel, chatProvider, chatQuotedSentence, chatThinking, setStoreHistory])

  const sendMessage = useCallback(async (input: string, tags: string[] = []) => {
    if (input.length === 0) return
    if (!chatModel || !chatProvider) {
      notify.warning('请在设置中选择聊天模型')
      return
    }

    const baseHistory = historyRef.current
    const nextHistory: LLMHistory = {
      ...baseHistory,
      title: input.length > 10 ? `${input.slice(0, 10)}...` : input,
      messages: [
        ...baseHistory.messages,
        { role: 'user', content: input, timestamp: dayjs().unix() },
      ],
    }

    setHistory(nextHistory)
    await runChat(nextHistory, tags)
  }, [chatModel, chatProvider, runChat])

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const newChat = useCallback(() => {
    abortControllerRef.current?.abort()
    generationIdRef.current += 1
    setIsGenerating(false)
    const fresh = getNewHistory(promptOptions, selectedId)
    setHistory(fresh)
    setStoreHistory(null)
  }, [promptOptions, selectedId, setStoreHistory])

  const selectHistory = useCallback((id: string) => {
    const selectedHistory = historys.find(item => item.id === id)
    if (!selectedHistory) return
    abortControllerRef.current?.abort()
    generationIdRef.current += 1
    setIsGenerating(false)
    setHistory(selectedHistory)
    setStoreHistory(selectedHistory)
  }, [historys, setStoreHistory])

  const deleteHistory = useCallback((item: LLMHistory) => {
    deleteStoreHistory(item)
    if (historyRef.current.id === item.id) {
      abortControllerRef.current?.abort()
      generationIdRef.current += 1
      setIsGenerating(false)
      const fresh = getNewHistory(promptOptions, selectedId)
      setHistory(fresh)
      setStoreHistory(null)
    }
  }, [deleteStoreHistory, promptOptions, selectedId, setStoreHistory])

  const renameHistory = useCallback((item: LLMHistory, title: string) => {
    const updated = { ...item, title }
    updateStoreHistory(updated)
    if (historyRef.current.id === item.id) {
      setHistory(updated)
    }
  }, [updateStoreHistory])

  const changePrompt = useCallback((id: string) => {
    const promptItem = promptOptions.find(option => option.id === id)
    if (!promptItem) return
    const prompt = promptItem.prompt || ''
    setSelectedId(id)
    setHistory(prev => (prev.prompt === prompt ? prev : { ...prev, prompt }))
  }, [promptOptions, setSelectedId])

  return {
    history,
    historyList: historys,
    groupedHistory: groupHistoryByTime(),
    isGenerating,
    selectedPromptId: selectedId,
    promptOptions,
    tagOptions,
    quotedSentence: chatQuotedSentence,
    canChat: Boolean(chatModel && chatProvider),
    sendMessage,
    stopGeneration,
    newChat,
    selectHistory,
    deleteHistory,
    renameHistory,
    changePrompt,
    clearQuote: clearChatQuote,
  }
}
