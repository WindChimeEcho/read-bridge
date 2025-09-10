import { message, Modal, Button } from "antd"

import { useHistoryStore } from "@/store/useHistoryStore"
import { LLMHistory } from "@/types/llm"

import { useCallback, useMemo, useState, useRef, useEffect } from "react"
import { useLLMStore } from "@/store/useLLMStore"
import { createLLMClient } from "@/services/llm"
import dayjs from "dayjs"
import { getNewHistory } from "@/store/useOutputOptions"
import { ChatTools, ChatContent, ChatInput, ChatHistory } from "./cpns"
import { ChatCompletionMessageParam } from "openai/resources/index.mjs"
import { useOutputOptions } from "@/store/useOutputOptions"
import { useTranslation } from "@/i18n/useTranslation"
import { useReadingProgressStore } from "@/store/useReadingProgress"
import { CommentOutlined } from "@ant-design/icons"
import { useSiderStore } from "@/store/useSiderStore"
import KeyboardShortcut from "@/app/components/KeyboardShortcut"

export default function StandardChat() {
  const { t } = useTranslation()
  const { readingProgress } = useReadingProgressStore()
  const { selectedId, promptOptions, setSelectedId } = useOutputOptions()
  const { chatShortcut } = useSiderStore()
  const [history, setHistory] = useState<LLMHistory>(() => getNewHistory(promptOptions, selectedId))
  const { setHistory: setStoreHistory, historys } = useHistoryStore()
  const { chatModel } = useLLMStore()
  const chatLLMClient = useMemo(() => {
    return chatModel
      ? createLLMClient(chatModel)
      : null
  }, [chatModel])

  const [isGenerating, setIsGenerating] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [focusTrigger, setFocusTrigger] = useState(0)

  const handleOpenModal = () => {
    handlePlus()
    setIsModalOpen(true)
    setFocusTrigger(prev => prev + 1)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  // 快捷键监听
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const shortcutParts = chatShortcut.toLowerCase().split('+')
      const isCtrlPressed = shortcutParts.includes('ctrl') && event.ctrlKey
      const isAltPressed = shortcutParts.includes('alt') && event.altKey
      const isShiftPressed = shortcutParts.includes('shift') && event.shiftKey
      const key = shortcutParts[shortcutParts.length - 1]

      if (event.key.toLowerCase() === key &&
        (shortcutParts.includes('ctrl') ? isCtrlPressed : !event.ctrlKey) &&
        (shortcutParts.includes('alt') ? isAltPressed : !event.altKey) &&
        (shortcutParts.includes('shift') ? isShiftPressed : !event.shiftKey)) {
        event.preventDefault()
        handleOpenModal()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [chatShortcut])

  // ESC键监听 - 关闭modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isModalOpen) {
        event.preventDefault()
        handleCloseModal()
      }
    }

    document.addEventListener('keydown', handleEscapeKey)
    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isModalOpen])

  function handlePlus() {
    if (!history) return
    setHistory(getNewHistory(promptOptions, selectedId))
    setStoreHistory(null)
  }

  const handleSelectHistory = useCallback((id: string) => {
    const history = historys.find(item => item.id === id)
    if (!history) return
    setHistory(history)
    setStoreHistory(history)
  }, [historys, setHistory, setStoreHistory])

  const tagOptions = useMemo(() => [
    {
      label: t('sider.surroundingText'),
      value: 'base_context'
    },
    {
      label: t('sider.currentChapter'),
      value: 'current_chapter'
    }
  ], [t])

  const handleMessage = useCallback((messages: LLMHistory['messages'], chunk: string, name: string, isThinking: boolean, thinkingTime: number | null) => {
    const endMessage = messages[messages.length - 1]
    let updateMessage = { ...endMessage }
    if (endMessage?.role === 'assistant') {
      if (isThinking) updateMessage.reasoningContent += chunk
      else updateMessage.content += chunk
      if (thinkingTime) updateMessage.thinkingTime = thinkingTime
      return [...messages.slice(0, -1), updateMessage]
    } else {
      updateMessage = { role: 'assistant' as const, content: '', reasoningContent: '', timestamp: dayjs().unix(), name }
      if (isThinking) updateMessage.reasoningContent = chunk
      else updateMessage.content = chunk
      return [...messages, updateMessage]
    }
  }, [])

  const handleTags = useCallback((tags: string[]): ChatCompletionMessageParam[] => {
    const { sentenceChapters = [], currentLocation = { chapterIndex: 0, lineIndex: 0 } } = readingProgress
    const { chapterIndex = 0, lineIndex = 0 } = currentLocation
    const currentChapter = sentenceChapters[chapterIndex] || []
    const selectedLine = currentChapter[lineIndex]
    const tagContext = tags.map(tag => {
      if (currentChapter.length === 0) return null
      switch (tag) {
        case 'base_context':
          if (tags.includes('current_chapter')) return null
          const bookContext = currentChapter.length > 0 ? currentChapter.slice(Math.max(lineIndex - 20, 0), Math.min(lineIndex + 20, currentChapter.length)).join('\n\n') : ''
          return {
            role: 'user',
            content: `I'm providing the following excerpt from a book as context:\n\n${bookContext}\n\nThe selected line is:\n\n${selectedLine}\n\nBased on this context, please answer: [user question]`
          }
        case 'current_chapter':
          return {
            role: 'user',
            content: `I'm providing the following excerpt from a book as context:\n\n${currentChapter.join('\n\n')}\n\nThe selected line is:\n\n${selectedLine}\n\nBased on this context, please answer: [user question]`
          }
      }
    })
    const filteredContext = tagContext.filter(Boolean) as ChatCompletionMessageParam[]
    const finalContext: ChatCompletionMessageParam[] = []
    filteredContext.forEach(ctx => {
      finalContext.push(ctx);
      finalContext.push({
        role: 'assistant',
        content: 'I\'ve received the context. Ready for your question.'
      });
    });
    return finalContext
  }, [readingProgress])

  const handleChat = useCallback(async (newHistory: LLMHistory, tags: string[]) => {
    if (!newHistory) throw new Error('newHistory is undefined')
    if (!chatLLMClient) throw new Error('chatLLMClient is undefined')
    if (newHistory.messages.length === 0) throw new Error('newHistory.messages is empty')

    setIsGenerating(true)

    // 中断控制
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    // 处理tag
    const tagContext = tags.length > 0 ? handleTags(tags) : []

    const messages = [...tagContext, ...newHistory.messages.map((msg) => ({
      role: msg.role,
      content: msg.content
    }))]
    const prompt = newHistory.prompt
    let isThinking = false
    let thinkingStartTime: number | null = null
    let thinkingTime: number | null = null
    try {
      const responseGenerator = chatLLMClient.completionsGenerator(messages, prompt, signal)
      let currentMessages = handleMessage(newHistory.messages, '', chatLLMClient.name, false, null)
      setHistory(prev => {
        const newHistory = {
          ...prev,
          messages: currentMessages
        }
        return newHistory
      })

      for await (const chunk of responseGenerator) {
        if (chunk === '<think>') {
          isThinking = true
          thinkingStartTime = dayjs().unix()
          continue
        }
        if (chunk === '</think>') {
          isThinking = false
          thinkingTime = thinkingStartTime ? (dayjs().unix() - thinkingStartTime) : null
          continue
        }
        currentMessages = handleMessage(currentMessages, chunk, chatLLMClient.name, isThinking, thinkingTime);
        thinkingTime = null
        setHistory(prev => ({
          ...prev,
          messages: currentMessages
        }));
      }
    } catch (error) {
      console.error('Chat generation error:', error)
      message.error('聊天生成出错')
    } finally {
      const wasAborted = abortControllerRef.current?.signal.aborted || false;

      if (wasAborted) {
        message.info('已中断聊天生成')
        setHistory(prev => {
          const newHistory = {
            ...prev,
            messages: handleMessage(prev.messages, '已中断聊天生成', chatLLMClient.name, false, thinkingStartTime ? (dayjs().unix() - thinkingStartTime) : null)
          }

          return newHistory
        });
      } else {
        setHistory(prev => {
          return prev
        });
      }
      setTimeout(() => {
        setHistory(prev => {
          setStoreHistory(prev)
          return prev
        })
      }, 0)
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }, [chatLLMClient, setHistory, setStoreHistory, handleMessage, handleTags])

  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  const handleSend = useCallback(async (input: string, tags: string[]) => {
    if (input.length === 0) return
    if (!chatLLMClient) {
      message.warning('请在设置中选择聊天模型')
      return
    }

    const newHistory = await new Promise<LLMHistory>(resolve => {
      setHistory((prev) => {
        const newHistory = {
          ...prev,
          title: input.length > 10 ? input.slice(0, 10) + '...' : input,
          messages: [...prev.messages, { role: 'user', content: input, timestamp: dayjs().unix() }]
        } as LLMHistory
        resolve(newHistory)
        return newHistory
      })
    })
    handleChat(newHistory, tags)
  }, [chatLLMClient, setHistory, handleChat])

  // history
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const handleHistory = useCallback(() => {
    setIsHistoryModalOpen(true)
  }, [setIsHistoryModalOpen])
  const handleCloseHistory = useCallback(() => {
    setIsHistoryModalOpen(false)
  }, [setIsHistoryModalOpen])


  function handleChangePrompt(id: string) {
    const promptItem = promptOptions.find(option => option.id === id)
    if (!promptItem) return
    const prompt = promptItem.prompt || ''
    setHistory(prev => {
      if (prompt === prev.prompt) return prev
      setSelectedId(id)
      return {
        ...prev,
        prompt
      }
    })
  }

  return (
    <>
      <Button
        icon={<CommentOutlined />}
        onClick={handleOpenModal}
        className="m-2 mt-0 h-[32px]"
      >
        <span className="flex items-center gap-2">
          {t('sider.chat')}
          <KeyboardShortcut shortcut={chatShortcut} />
        </span>
      </Button>

      <Modal
        open={isModalOpen}
        onCancel={handleCloseModal}
        title={null}
        footer={null}
        closeIcon={null}
        width={800}
        destroyOnClose={false}
      >
        <div className="w-full h-full flex flex-col text-[var(--ant-color-text)]">
          <ChatTools isGenerating={isGenerating} onPlus={handlePlus} onChangePrompt={handleChangePrompt} onHistory={handleHistory} onCloseModal={handleCloseModal} />
          <ChatContent history={history} />
          <ChatInput
            onSent={handleSend}
            tagOptions={tagOptions}
            isGenerating={isGenerating}
            onStopGeneration={handleStopGeneration}
            shouldFocus={focusTrigger}
          />
          <ChatHistory isModalOpen={isHistoryModalOpen} onClose={handleCloseHistory} onSelect={handleSelectHistory} />
        </div>
      </Modal>
    </>
  )
}

