import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SiderStore {
  readingId: string | null
  setReadingId: (id: string | null) => void
  siderWidth: number
  setSiderWidth: (width: number) => void
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  thinkingExpanded: boolean
  setThinkingExpanded: (expanded: boolean) => void
  chatShortcut: string
  setChatShortcut: (shortcut: string) => void
  siderCollapsed: boolean
  setSiderCollapsed: (collapsed: boolean) => void
  toggleSiderCollapsed: () => void
}

export const useSiderStore = create<SiderStore>()(
  persist(
    (set) => ({
      readingId: null,
      setReadingId: (id) => set({ readingId: id }),
      siderWidth: 400,
      setSiderWidth: (width) => set({ siderWidth: width }),
      collapsed: false,
      setCollapsed: (collapsed) => set({ collapsed }),
      thinkingExpanded: true,
      setThinkingExpanded: (expanded) => set({ thinkingExpanded: expanded }),
      chatShortcut: 'Ctrl+Shift+A',
      setChatShortcut: (shortcut) => set({ chatShortcut: shortcut }),
      siderCollapsed: true,
      setSiderCollapsed: (siderCollapsed) => set({ siderCollapsed }),
      toggleSiderCollapsed: () => set((state) => ({ siderCollapsed: !state.siderCollapsed })),
    }),
    {
      name: 'sider-storage',
    }
  )
) 