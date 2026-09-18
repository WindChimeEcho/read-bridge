import { describe, expect, it } from 'vitest'
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
  temperature: 0.5,
  topP: 1,
}

describe('AI result cache keys', () => {
  it('is stable for the same effective request', async () => {
    expect(await generateCacheKey(baseParams)).toBe(await generateCacheKey({ ...baseParams }))
  })

  it.each([
    ['prompt', { rulePrompt: 'A changed prompt.' }],
    ['output type', { outputType: 'MD' as const }],
    ['provider', { providerId: 'provider-b' }],
    ['model', { modelId: 'model-b' }],
    ['temperature', { temperature: 0.7 }],
  ])('changes when the %s changes', async (_, change) => {
    expect(await generateCacheKey({ ...baseParams, ...change })).not.toBe(await generateCacheKey(baseParams))
  })
})
