import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  collectSentenceBatch,
  collectSurroundingContext,
  runSentenceRules,
  runSingleSentenceRule,
} from '../services/analysis/sentenceController'
import { reorderChapters } from '../services/ChapterUtils'
import {
  clearBackHandlersForTest,
  dispatchBackEvent,
  registerBackHandler,
} from '../services/platform/backAdapter'
import { resetNotifyAdapter, setNotifyAdapter } from '../services/platform/notify'
import { useHistoryStore } from '../store/useHistoryStore'
import { useOutputOptions } from '../store/useOutputOptions'
import { DEFAULT_DARK_TEXT_COLOR, DEFAULT_LIGHT_TEXT_COLOR, mergeStyleState, useStyleStore } from '../store/useStyleStore'
import { isMobileWeb } from '../utils/platform'
import type { SentenceAnalysis } from '../types/ai'
import type { Book } from '../types/book'
import type { CacheItemValue, CacheKeyParams } from '../types/cache'
import type { Model, OutputOption, Provider, ThinkingConfig } from '../types/llm'

const testProvider: Provider = {
  id: 'openai',
  name: 'OpenAI',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: 'test-key',
  protocol: 'openai',
  models: [{ id: 'gpt-test', name: 'GPT Test', providerId: 'openai' }],
}

const testModel: Model = testProvider.models[0]
const testThinking: ThinkingConfig = { mode: 'default', effort: 'medium' }

const testOptions: OutputOption[] = [
  { id: 'rule-1', name: 'Rule 1', type: 'MD', rulePrompt: 'Prompt 1' },
  { id: 'rule-2', name: 'Rule 2', type: 'TEXT', rulePrompt: 'Prompt 2' },
]

afterEach(() => {
  resetNotifyAdapter()
  clearBackHandlersForTest()
})

describe('sentenceController concurrency, cancellation, and caching', () => {
  it('prevents aborted requests from writing cache and isolates rapid consecutive runs', async () => {
    const controller1 = new AbortController()
    const controller2 = new AbortController()
    const setCache = vi.fn(async (_params: CacheKeyParams, _values: CacheItemValue) => {})
    const clearCache = vi.fn(async () => {})
    const stateByRun: Record<string, Partial<SentenceAnalysis>[]> = { run1: [], run2: [] }

    let releaseRun1!: () => void
    const run1Gate = new Promise<void>(resolve => {
      releaseRun1 = resolve
    })

    const generate = vi.fn(async (req: Parameters<typeof import('../services/ai/generate').generateAnalysis>[0]) => {
      const prompt = req.messages.map(m => String(m.content)).join('\n')
      if (prompt.includes('First sentence')) {
        await run1Gate
        req.onResult?.({ type: req.outputType, content: 'stale partial result' } as never)
        return {
          result: { type: req.outputType, content: 'stale final result' } as never,
          reasoning: '',
        }
      }
      req.onResult?.({ type: req.outputType, content: 'fresh result' } as never)
      return {
        result: { type: req.outputType, content: 'fresh final result' } as never,
        reasoning: 'fresh reasoning',
      }
    })

    const run1Promise = runSentenceRules({
      bookId: 'book-1',
      sentence: 'First sentence.',
      options: [testOptions[0]],
      provider: testProvider,
      model: testModel,
      thinking: testThinking,
      abortSignal: controller1.signal,
      onUpdate: (_, patch) => stateByRun.run1.push(patch),
      deps: {
        getCache: async () => null,
        setCache,
        clearCache,
        generate: generate as never,
      },
    })

    controller1.abort()

    const run2Promise = runSentenceRules({
      bookId: 'book-1',
      sentence: 'Second sentence.',
      options: [testOptions[0]],
      provider: testProvider,
      model: testModel,
      thinking: testThinking,
      abortSignal: controller2.signal,
      onUpdate: (_, patch) => stateByRun.run2.push(patch),
      deps: {
        getCache: async () => null,
        setCache,
        clearCache,
        generate: generate as never,
      },
    })

    await run2Promise
    releaseRun1()
    await run1Promise

    expect(stateByRun.run1.at(-1)?.status).toBe('cancelled')
    expect(stateByRun.run2.at(-1)?.status).toBe('complete')
    expect(setCache).toHaveBeenCalledTimes(1)
    expect(setCache.mock.calls[0]?.[0]).toMatchObject({ sentence: 'Second sentence.' })
  })

  it('does not write cache on generation errors and supports single-rule retry bypassing cache', async () => {
    const controller = new AbortController()
    const getCache = vi.fn(async () => ({
      schemaVersion: 2 as const,
      outputType: 'MD' as const,
      result: { type: 'MD' as const, content: 'cached text' },
      reasoning: '',
      createTime: new Date().toISOString(),
    }))
    const setCache = vi.fn(async () => {})
    const updates: Partial<SentenceAnalysis>[] = []

    const failingGenerate = vi.fn(async () => {
      throw new Error('upstream 500')
    })

    await runSingleSentenceRule({
      bookId: 'book-1',
      sentence: 'Retry sentence.',
      option: testOptions[0],
      provider: testProvider,
      model: testModel,
      thinking: testThinking,
      abortSignal: controller.signal,
      skipCache: true,
      onUpdate: (_, patch) => updates.push(patch),
      deps: { getCache, setCache, generate: failingGenerate as never },
    })

    expect(getCache).not.toHaveBeenCalled()
    expect(setCache).not.toHaveBeenCalled()
    expect(updates.at(-1)).toEqual({ status: 'error', error: 'upstream 500' })
  })

  it('collects sentence batches and surrounding context windows accurately', () => {
    const chapter = ['Line 0.', '', 'Line 2.', 'Line 3.', 'Line 4.', 'Line 5.']
    const { batch, lastIndex } = collectSentenceBatch(chapter, 2, 2)
    expect(batch).toBe('Line 2.\nLine 3.')
    expect(lastIndex).toBe(3)

    const context = collectSurroundingContext(chapter, 2, lastIndex, 2)
    expect(context).toEqual({
      before: 'Line 0.',
      after: 'Line 4.\nLine 5.',
    })
  })
})

describe('store immutability, reordering, and notify adapter', () => {
  it('reorders output options and uses notify adapter without Antd crash in Node', () => {
    const warnings: string[] = []
    setNotifyAdapter({
      success: () => {},
      error: () => {},
      warning: (msg) => warnings.push(msg),
      info: () => {},
    })

    const initial = useOutputOptions.getState().sentenceOptions
    const firstId = initial[0].id
    const secondId = initial[1].id

    useOutputOptions.getState().reorderSentenceOptions(0, 1)
    const reordered = useOutputOptions.getState().sentenceOptions
    expect(reordered[0].id).toBe(secondId)
    expect(reordered[1].id).toBe(firstId)

    useOutputOptions.getState().resetSentenceOptions()
    useOutputOptions.getState().deletePromptOptions(useOutputOptions.getState().promptOptions[0])
    expect(warnings).toContain('至少保留一个提示词')
  })

  it('keeps useHistoryStore immutable and avoids writing historys[-1] on empty new chat', () => {
    useHistoryStore.setState({ history: null, historys: [] })

    const emptyChat = {
      id: 'empty-1',
      title: 'New Chat',
      timestamp: Date.now(),
      prompt: 'test',
      messages: [],
    }
    useHistoryStore.getState().setHistory(emptyChat)

    let state = useHistoryStore.getState()
    expect(state.history?.id).toBe('empty-1')
    expect(state.historys).toHaveLength(0)

    const populated = {
      ...emptyChat,
      messages: [{ role: 'user' as const, content: 'Hi', timestamp: 1 }],
    }
    useHistoryStore.getState().setHistory(populated)
    const prevArrayRef = useHistoryStore.getState().historys

    useHistoryStore.getState().updateHistory({ ...populated, title: 'Renamed' })
    state = useHistoryStore.getState()
    expect(state.historys).not.toBe(prevArrayRef)
    expect(state.historys[0].title).toBe('Renamed')
    expect(state.history?.title).toBe('Renamed')
  })
})

describe('ChapterUtils.reorderChapters', () => {
  it('preserves chapter paragraphs by index even when chapter titles collide', () => {
    const book: Book = {
      id: 'b1',
      title: 'Test Book',
      fileHash: 'hash',
      createTime: 1,
      metadata: { title: 'Test Book', language: 'en' },
      chapterList: [
        { title: 'Chapter', paragraphs: ['Body Zero'] },
        { title: 'Chapter', paragraphs: ['Body One'] },
        { title: 'Chapter', paragraphs: ['Body Two'] },
      ],
      toc: [
        { title: 'Chapter', index: 0 },
        { title: 'Chapter', index: 1 },
        { title: 'Chapter', index: 2 },
      ],
    }

    const reordered = reorderChapters(book, 2, 0)
    expect(reordered.chapterList.map(c => c.paragraphs[0])).toEqual([
      'Body Two',
      'Body Zero',
      'Body One',
    ])
    expect(reordered.toc.map(item => item.index)).toEqual([0, 1, 2])
    expect(book.chapterList[0].paragraphs[0]).toBe('Body Zero')
  })
})

describe('backAdapter priority stack', () => {
  it('runs higher-priority handlers first, short-circuits on true, and supports unsubscribe', () => {
    const calls: string[] = []
    const unsubLow = registerBackHandler(10, () => {
      calls.push('low')
      return true
    })
    const unsubHigh = registerBackHandler(100, () => {
      calls.push('high')
      return true
    })
    registerBackHandler(50, () => {
      calls.push('mid-pass')
      return false
    })

    expect(dispatchBackEvent()).toBe(true)
    expect(calls).toEqual(['high'])

    calls.length = 0
    unsubHigh()

    expect(dispatchBackEvent()).toBe(true)
    expect(calls).toEqual(['mid-pass', 'low'])

    calls.length = 0
    unsubLow()
    expect(dispatchBackEvent()).toBe(false)
    expect(calls).toEqual(['mid-pass'])
  })

  it('uses LIFO order for handlers registered with equal priority', () => {
    const calls: string[] = []
    registerBackHandler(50, () => {
      calls.push('older')
      return false
    })
    registerBackHandler(50, () => {
      calls.push('newer')
      return true
    })

    expect(dispatchBackEvent()).toBe(true)
    expect(calls).toEqual(['newer'])
  })
})

describe('useStyleStore legacy migration and platform helpers', () => {
  it('preserves legacy custom text colors during persist merge when useCustomTextColor was absent', () => {
    const currentState = useStyleStore.getState()
    const customMigrated = mergeStyleState(
      {
        lightModeTextColor: '#123456',
        darkModeTextColor: DEFAULT_DARK_TEXT_COLOR,
        fontSize: 'large',
      },
      currentState
    )
    expect(customMigrated.useCustomTextColor).toBe(true)
    expect(customMigrated.lightModeTextColor).toBe('#123456')
    expect(customMigrated.readingTheme).toBe('light')
    expect(customMigrated.themeInitialized).toBe(false)

    const defaultMigrated = mergeStyleState(
      {
        lightModeTextColor: DEFAULT_LIGHT_TEXT_COLOR,
        darkModeTextColor: DEFAULT_DARK_TEXT_COLOR,
      },
      currentState
    )
    expect(defaultMigrated.useCustomTextColor).toBe(false)
  })

  it('detects mobile web user agents without crashing in Node', () => {
    expect(isMobileWeb()).toBe(false)
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    })
    try {
      expect(isMobileWeb()).toBe(true)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
