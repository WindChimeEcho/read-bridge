import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useReaderSessionStore } from '../store/useReaderSessionStore'

describe('useReaderSessionStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useReaderSessionStore.getState().resetSession()
  })

  afterEach(() => {
    useReaderSessionStore.getState().resetSession()
    vi.useRealTimers()
  })

  it('tracks sentence selection, word lookup, and chat quote sheets cleanly', () => {
    const store = useReaderSessionStore.getState()

    store.selectSentence(4, 'Hello world.', true)
    let state = useReaderSessionStore.getState()
    expect(state.selectedLineIndex).toBe(4)
    expect(state.selectedSentenceText).toBe('Hello world.')
    expect(state.selectionSeq).toBe(1)
    expect(state.activeSheet).toBe('analysis')
    expect(state.analysisTab).toBe('sentence')

    store.selectWordInSentence('Hello')
    state = useReaderSessionStore.getState()
    expect(state.selectedWord).toBe('Hello')
    expect(state.analysisTab).toBe('word')

    store.openChatSheet('Hello world.')
    state = useReaderSessionStore.getState()
    expect(state.activeSheet).toBe('chat')
    expect(state.chatQuotedSentence).toBe('Hello world.')

    store.clearChatQuote()
    expect(useReaderSessionStore.getState().chatQuotedSentence).toBeNull()

    store.closeActiveSheet()
    expect(useReaderSessionStore.getState().activeSheet).toBe('none')
  })

  it('hides font preview after 2800ms and resets timer on repeated clicks', () => {
    const store = useReaderSessionStore.getState()

    store.openTocDrawer('toc')
    store.triggerFontPreview(2800)
    expect(useReaderSessionStore.getState().fontPreviewVisible).toBe(true)

    vi.advanceTimersByTime(2000)
    expect(useReaderSessionStore.getState().fontPreviewVisible).toBe(true)

    // Re-trigger resets the 2800ms countdown
    store.triggerFontPreview(2800)
    vi.advanceTimersByTime(2000)
    expect(useReaderSessionStore.getState().fontPreviewVisible).toBe(true)

    vi.advanceTimersByTime(800)
    expect(useReaderSessionStore.getState().fontPreviewVisible).toBe(false)
    expect(useReaderSessionStore.getState().fontPreviewTimerId).toBeNull()
  })

  it('clears font preview timer immediately on closeTocDrawer or resetSession', () => {
    const store = useReaderSessionStore.getState()

    store.openTocDrawer('bookmark')
    store.triggerFontPreview(2800)
    expect(useReaderSessionStore.getState().fontPreviewVisible).toBe(true)
    expect(useReaderSessionStore.getState().fontPreviewTimerId).not.toBeNull()

    store.closeTocDrawer()
    expect(useReaderSessionStore.getState().tocDrawerOpen).toBe(false)
    expect(useReaderSessionStore.getState().fontPreviewVisible).toBe(false)
    expect(useReaderSessionStore.getState().fontPreviewTimerId).toBeNull()

    store.triggerFontPreview(2800)
    store.selectSentence(2, 'Reset test', true)
    store.resetSession()

    const state = useReaderSessionStore.getState()
    expect(state.selectedLineIndex).toBeNull()
    expect(state.selectedSentenceText).toBe('')
    expect(state.selectionSeq).toBe(0)
    expect(state.activeSheet).toBe('none')
    expect(state.fontPreviewVisible).toBe(false)
    expect(state.fontPreviewTimerId).toBeNull()
  })

  it('resets sentence and word selection on triggerChapterJump', () => {
    const store = useReaderSessionStore.getState()
    store.selectSentence(7, 'Some line')
    store.selectWordInSentence('Some')

    store.triggerChapterJump()
    const state = useReaderSessionStore.getState()
    expect(state.jumpSeq).toBe(1)
    expect(state.selectedLineIndex).toBeNull()
    expect(state.selectedSentenceText).toBe('')
    expect(state.selectedWord).toBe('')
    expect(state.analysisTab).toBe('sentence')
  })
})
