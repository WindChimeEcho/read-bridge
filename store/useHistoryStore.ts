import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { LLMHistory } from '@/types/llm'
import dayjs from 'dayjs'


interface HistoryStore {
  history: LLMHistory | null
  setHistory: (newHistory: LLMHistory | null) => void,
  historys: LLMHistory[]
  deleteHistory: (history: LLMHistory) => void
  updateHistory: (history: LLMHistory) => void
  queryHistory: (keyword: string) => LLMHistory[]
  groupHistoryByTime: () => Array<{
    label: string
    items: LLMHistory[]
  }>
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      history: null,
      setHistory: (newHistory: LLMHistory | null) => set((state) => {
        if (!newHistory) return { history: null }
        const { historys } = state
        const index = historys.findIndex(item => item.id === newHistory.id)
        if (index === -1 && newHistory.messages.length > 0) {
          return { history: newHistory, historys: [...historys, newHistory] }
        } else if (index !== -1 && newHistory.messages.length === 0) {
          historys.splice(index, 1)
          return { history: newHistory }
        } else {
          historys[index] = newHistory
          return { history: newHistory, historys }
        }
      }),
      historys: [],
      deleteHistory: (history) => set((state) => ({ historys: state.historys.filter(item => item.id !== history.id) })),
      updateHistory: (history) => set((state) => {
        const id = history.id
        const index = state.historys.findIndex(item => item.id === id)
        if (index === -1) {
          console.error('该历史记录不存在')
          return state
        }
        state.historys[index] = history
        return state
      }),
      queryHistory: (keyword: string) => {
        const { historys } = get()
        if (!keyword.trim()) return historys
        return historys.filter(item =>
          item.title && item.title.toLowerCase().includes(keyword.toLowerCase())
        )
      },
      groupHistoryByTime: () => {
        const { historys } = get()

        const timeGroups = [
          {
            label: 'Today',
            filter: (date: Date) => dayjs(date).isAfter(dayjs().startOf('day'))
          },
          {
            label: 'Yesterday',
            filter: (date: Date) => dayjs(date).isAfter(dayjs().subtract(1, 'day').startOf('day')) &&
              dayjs(date).isBefore(dayjs().startOf('day'))
          },
          {
            label: 'This Week',
            filter: (date: Date) => dayjs(date).isAfter(dayjs().startOf('week')) &&
              dayjs(date).isBefore(dayjs().subtract(1, 'day').startOf('day'))
          },
          {
            label: 'Last Week',
            filter: (date: Date) => dayjs(date).isAfter(dayjs().subtract(1, 'week').startOf('week')) &&
              dayjs(date).isBefore(dayjs().startOf('week'))
          },
          {
            label: 'This Month',
            filter: (date: Date) => dayjs(date).isAfter(dayjs().startOf('month')) &&
              dayjs(date).isBefore(dayjs().startOf('week'))
          },
          {
            label: 'Earlier',
            filter: (date: Date) => dayjs(date).isBefore(dayjs().startOf('month'))
          }
        ]

        const groups = timeGroups.map(group => ({
          label: group.label,
          items: [] as LLMHistory[]
        }))

        historys.forEach(history => {
          const historyDate = new Date(history.timestamp)
          for (let i = 0; i < timeGroups.length; i++) {
            if (timeGroups[i].filter(historyDate)) {
              groups[i].items.unshift(history)
              break
            }
          }
        })

        return groups.filter(group => group.items.length > 0)
      },
    }),
    {
      name: 'history-storage',
    }
  )
)


