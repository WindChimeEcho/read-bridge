import { create } from 'zustand'

export type MobileSheetType = 'none' | 'analysis' | 'chat'
export type AnalysisSheetTab = 'sentence' | 'word'
export type SheetDetent = 'peek' | 'expanded'

const DEFAULT_FONT_PREVIEW_DURATION_MS = 2800

export interface ReaderSessionState {
  selectedLineIndex: number | null
  selectedSentenceText: string
  selectedWord: string
  selectionSeq: number
  jumpSeq: number

  tocDrawerOpen: boolean
  tocDrawerTab: 'toc' | 'bookmark'
  activeSheet: MobileSheetType
  analysisTab: AnalysisSheetTab
  sheetDetent: SheetDetent

  chatQuotedSentence: string | null

  fontPreviewVisible: boolean
  fontPreviewTimerId: ReturnType<typeof setTimeout> | null

  selectSentence: (lineIndex: number, text: string, openSheet?: boolean) => void
  selectWordInSentence: (word: string) => void
  clearWordSelection: () => void
  triggerChapterJump: () => void
  openTocDrawer: (tab?: 'toc' | 'bookmark') => void
  closeTocDrawer: () => void
  openChatSheet: (quotedSentence?: string | null) => void
  clearChatQuote: () => void
  closeActiveSheet: () => void
  setSheetDetent: (detent: SheetDetent) => void
  setAnalysisTab: (tab: AnalysisSheetTab) => void
  triggerFontPreview: (durationMs?: number) => void
  hideFontPreview: () => void
  resetSession: () => void
}

function clearPreviewTimer(timerId: ReturnType<typeof setTimeout> | null) {
  if (timerId !== null) {
    clearTimeout(timerId)
  }
}

export const useReaderSessionStore = create<ReaderSessionState>((set, get) => ({
  selectedLineIndex: null,
  selectedSentenceText: '',
  selectedWord: '',
  selectionSeq: 0,
  jumpSeq: 0,

  tocDrawerOpen: false,
  tocDrawerTab: 'toc',
  activeSheet: 'none',
  analysisTab: 'sentence',
  sheetDetent: 'peek',

  chatQuotedSentence: null,

  fontPreviewVisible: false,
  fontPreviewTimerId: null,

  selectSentence: (lineIndex, text, openSheet = false) => set((state) => ({
    selectedLineIndex: lineIndex,
    selectedSentenceText: text,
    selectedWord: '',
    selectionSeq: state.selectionSeq + 1,
    activeSheet: openSheet ? 'analysis' : state.activeSheet,
    analysisTab: 'sentence',
    sheetDetent: openSheet ? 'peek' : state.sheetDetent,
  })),

  selectWordInSentence: (word) => set({
    selectedWord: word,
    analysisTab: 'word',
  }),

  clearWordSelection: () => set({
    selectedWord: '',
    analysisTab: 'sentence',
  }),

  triggerChapterJump: () => set((state) => ({
    jumpSeq: state.jumpSeq + 1,
    selectedLineIndex: null,
    selectedSentenceText: '',
    selectedWord: '',
    analysisTab: 'sentence',
  })),

  openTocDrawer: (tab) => set((state) => ({
    tocDrawerOpen: true,
    tocDrawerTab: tab ?? state.tocDrawerTab,
  })),

  closeTocDrawer: () => {
    clearPreviewTimer(get().fontPreviewTimerId)
    set({
      tocDrawerOpen: false,
      fontPreviewVisible: false,
      fontPreviewTimerId: null,
    })
  },

  openChatSheet: (quotedSentence) => set({
    activeSheet: 'chat',
    chatQuotedSentence: quotedSentence ?? null,
  }),

  clearChatQuote: () => set({
    chatQuotedSentence: null,
  }),

  closeActiveSheet: () => set({
    activeSheet: 'none',
  }),

  setSheetDetent: (detent) => set({
    sheetDetent: detent,
  }),

  setAnalysisTab: (tab) => set({
    analysisTab: tab,
  }),

  triggerFontPreview: (durationMs = DEFAULT_FONT_PREVIEW_DURATION_MS) => {
    clearPreviewTimer(get().fontPreviewTimerId)
    const timerId = setTimeout(() => {
      set({
        fontPreviewVisible: false,
        fontPreviewTimerId: null,
      })
    }, durationMs)
    set({
      fontPreviewVisible: true,
      fontPreviewTimerId: timerId,
    })
  },

  hideFontPreview: () => {
    clearPreviewTimer(get().fontPreviewTimerId)
    set({
      fontPreviewVisible: false,
      fontPreviewTimerId: null,
    })
  },

  resetSession: () => {
    clearPreviewTimer(get().fontPreviewTimerId)
    set({
      selectedLineIndex: null,
      selectedSentenceText: '',
      selectedWord: '',
      selectionSeq: 0,
      jumpSeq: 0,
      tocDrawerOpen: false,
      tocDrawerTab: 'toc',
      activeSheet: 'none',
      analysisTab: 'sentence',
      sheetDetent: 'peek',
      chatQuotedSentence: null,
      fontPreviewVisible: false,
      fontPreviewTimerId: null,
    })
  },
}))
