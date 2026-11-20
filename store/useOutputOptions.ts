import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { OutputOption, PromptOption, WordOption } from '@/types/llm'
import { OUTPUT_TYPE, INPUT_PROMPT } from '@/constants/prompt'
import { notify } from '@/services/platform/notify'
import generateUUID from '@/utils/uuid'

function defaultSentenceOutputOption(): OutputOption[] {
  return [
    {
      id: generateUUID(),
      name: 'Smart Breakdown',
      type: OUTPUT_TYPE.MD,
      rulePrompt: INPUT_PROMPT.SENTENCE_SMART_BREAKDOWN,
    },
    {
      id: generateUUID(),
      name: 'Expressions & Vibe',
      type: OUTPUT_TYPE.MD,
      rulePrompt: INPUT_PROMPT.SENTENCE_EXPRESSIONS_VIBE,
    },
  ]
}

function defaultWordOutputOption(): WordOption[] {
  return [
    {
      id: generateUUID(),
      name: '语境快查 (短语感知)',
      rulePrompt: INPUT_PROMPT.WORD_QUICK_LOOK,
    },
    {
      id: generateUUID(),
      name: '核心画面与多义',
      rulePrompt: INPUT_PROMPT.WORD_DEEP_PICTURE,
    },
  ]
}

function defaultPromptOutputOption(): PromptOption[] {
  return [
    {
      id: generateUUID(),
      name: 'default chat',
      prompt: INPUT_PROMPT.CHAT_PROMPT,
    },
  ]
}

function reorderList<T>(list: T[], sourceIndex: number, destinationIndex: number): T[] {
  if (
    sourceIndex === destinationIndex ||
    sourceIndex < 0 ||
    destinationIndex < 0 ||
    sourceIndex >= list.length ||
    destinationIndex >= list.length
  ) {
    return list
  }
  const next = [...list]
  const [moved] = next.splice(sourceIndex, 1)
  next.splice(destinationIndex, 0, moved)
  return next
}

interface OutputOptionsStore {
  sentenceOptions: OutputOption[]
  addSentenceOptions: (newOption: OutputOption) => void
  deleteSentenceOptions: (targetOption: OutputOption) => void
  updateSentenceOptions: (updatedOption: OutputOption) => void
  reorderSentenceOptions: (sourceIndex: number, destinationIndex: number) => void
  resetSentenceOptions: () => void
  batchProcessingSize: number
  setBatchProcessingSize: (size: number) => void

  promptOptions: PromptOption[]
  addPromptOptions: (newPrompt: PromptOption) => void
  deletePromptOptions: (targetPrompt: PromptOption) => void
  updatePromptOptions: (updatedPrompt: PromptOption) => void
  reorderPromptOptions: (sourceIndex: number, destinationIndex: number) => void
  resetPromptOptions: () => void
  selectedId: string
  setSelectedId: (id: string) => void

  wordOptions: WordOption[]
  addWordOptions: (newOption: WordOption) => void
  deleteWordOptions: (targetOption: WordOption) => void
  updateWordOptions: (updatedOption: WordOption) => void
  reorderWordOptions: (sourceIndex: number, destinationIndex: number) => void
  resetWordOptions: () => void
  selectedWordId: string
  setSelectedWordId: (id: string) => void
}

export const useOutputOptions = create<OutputOptionsStore>()(
  persist(
    (set) => ({
      sentenceOptions: defaultSentenceOutputOption(),
      addSentenceOptions: (newOption) => set((state) => ({
        sentenceOptions: [...state.sentenceOptions, {
          ...newOption,
          id: generateUUID(),
        }],
      })),
      deleteSentenceOptions: (targetOption) => set((state) => ({
        sentenceOptions: state.sentenceOptions.filter((option) => option.id !== targetOption.id),
      })),
      updateSentenceOptions: (updatedOption) => set((state) => ({
        sentenceOptions: state.sentenceOptions.map((option) =>
          option.id === updatedOption.id ? updatedOption : option
        ),
      })),
      reorderSentenceOptions: (sourceIndex, destinationIndex) => set((state) => ({
        sentenceOptions: reorderList(state.sentenceOptions, sourceIndex, destinationIndex),
      })),
      resetSentenceOptions: () => set(() => ({
        sentenceOptions: defaultSentenceOutputOption(),
      })),
      batchProcessingSize: 1,
      setBatchProcessingSize: (size) => set({ batchProcessingSize: size }),

      promptOptions: defaultPromptOutputOption(),
      addPromptOptions: (newPrompt) => set((state) => ({
        promptOptions: [...state.promptOptions, {
          ...newPrompt,
          id: generateUUID(),
        }],
      })),
      deletePromptOptions: (targetPrompt) => set((state) => {
        if (state.promptOptions.length === 1) {
          notify.warning('至少保留一个提示词')
          return { promptOptions: state.promptOptions }
        }
        const newPromptOptions = state.promptOptions.filter((option) => option.id !== targetPrompt.id)
        const nextSelectedId = state.selectedId === targetPrompt.id
          ? (newPromptOptions[0]?.id ?? '')
          : state.selectedId
        notify.success('删除成功')
        return {
          promptOptions: newPromptOptions,
          selectedId: nextSelectedId,
        }
      }),
      updatePromptOptions: (updatedPrompt) => set((state) => ({
        promptOptions: state.promptOptions.map((option) =>
          option.id === updatedPrompt.id ? updatedPrompt : option
        ),
      })),
      reorderPromptOptions: (sourceIndex, destinationIndex) => set((state) => ({
        promptOptions: reorderList(state.promptOptions, sourceIndex, destinationIndex),
      })),
      resetPromptOptions: () => set(() => {
        const next = defaultPromptOutputOption()
        return {
          promptOptions: next,
          selectedId: next[0].id,
        }
      }),
      selectedId: defaultPromptOutputOption()[0].id,
      setSelectedId: (id) => set({ selectedId: id }),

      wordOptions: defaultWordOutputOption(),
      addWordOptions: (newOption) => set((state) => ({
        wordOptions: [...state.wordOptions, {
          ...newOption,
          id: generateUUID(),
        }],
      })),
      deleteWordOptions: (targetOption) => set((state) => {
        if (state.wordOptions.length === 1) {
          notify.warning('至少保留一个单词配置')
          return { wordOptions: state.wordOptions }
        }
        const newWordOptions = state.wordOptions.filter((option) => option.id !== targetOption.id)
        const isSelectedWordDeleted = state.selectedWordId === targetOption.id

        notify.success('删除成功')
        return {
          wordOptions: newWordOptions,
          ...(isSelectedWordDeleted && newWordOptions.length > 0 ? { selectedWordId: newWordOptions[0].id } : {}),
        }
      }),
      updateWordOptions: (updatedOption) => set((state) => ({
        wordOptions: state.wordOptions.map((option) =>
          option.id === updatedOption.id ? updatedOption : option
        ),
      })),
      reorderWordOptions: (sourceIndex, destinationIndex) => set((state) => ({
        wordOptions: reorderList(state.wordOptions, sourceIndex, destinationIndex),
      })),
      resetWordOptions: () => set(() => {
        const newWordOptions = defaultWordOutputOption()
        return {
          wordOptions: newWordOptions,
          selectedWordId: newWordOptions[0].id,
        }
      }),
      selectedWordId: '',
      setSelectedWordId: (id) => set({ selectedWordId: id }),
    }),
    {
      name: 'output-options-storage',
      onRehydrateStorage: () => (state) => {
        if (state && (!state.selectedWordId || state.selectedWordId === '') && state.wordOptions && state.wordOptions.length > 0) {
          state.selectedWordId = state.wordOptions[0].id
        }
      },
    }
  )
)

export const getNewHistory = (promptOptions: PromptOption[], selectedId: string) => {
  return {
    id: generateUUID(),
    title: 'New Chat',
    timestamp: new Date().getTime(),
    prompt: promptOptions.find(option => option.id === selectedId)?.prompt || '',
    messages: [],
  }
}
