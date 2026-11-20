import { describe, expect, it, vi, afterEach } from 'vitest'
import { generateCacheKey } from '../utils/cache'
import type { CacheKeyParams } from '../types/cache'

const baseParams: CacheKeyParams = {
  bookId: 'book-1',
  sentence: 'A sentence.',
  ruleId: 'rule-1',
  rulePrompt: 'Explain this sentence.',
  outputType: 'TEXT',
  providerId: 'openai',
  modelId: 'model-a',
  thinkingMode: 'default',
  reasoningEffort: 'medium',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AI result cache keys', () => {
  it('is stable for the same effective request', async () => {
    expect(await generateCacheKey(baseParams)).toBe(await generateCacheKey({ ...baseParams }))
  })

  it('produces identical keys with and without subtle crypto fallback', async () => {
    const nativeKey = await generateCacheKey(baseParams)
    vi.stubGlobal('crypto', { subtle: undefined })
    const fallbackKey = await generateCacheKey(baseParams)

    expect(fallbackKey).toBe(nativeKey)
    expect(fallbackKey).toMatch(/^v2:[0-9a-f]{64}$/)
  })

  it.each([
    ['prompt', { rulePrompt: 'A changed prompt.' }],
    ['output type', { outputType: 'MD' as const }],
    ['provider', { providerId: 'provider-b' }],
    ['model', { modelId: 'model-b' }],
    ['thinking mode', { thinkingMode: 'enabled' as const }],
    ['reasoning effort', { reasoningEffort: 'high' as const }],
    ['contextBefore', { contextBefore: 'Previous line.' }],
    ['contextAfter', { contextAfter: 'Next line.' }],
  ])('changes when the %s changes', async (_, change) => {
    expect(await generateCacheKey({ ...baseParams, ...change })).not.toBe(await generateCacheKey(baseParams))
  })
})
