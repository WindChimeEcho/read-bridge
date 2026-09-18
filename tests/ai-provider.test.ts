import { describe, expect, it } from 'vitest'
import { createLanguageModel, resolveProviderProtocol } from '../services/ai/provider'
import type { Model, Provider, ProviderProtocol } from '../types/llm'

const model: Model = {
  id: 'test-model',
  name: 'Test model',
  providerId: 'provider',
  temperature: 0.5,
  topP: 1,
}

describe('AI provider factory', () => {
  it.each([
    ['openai', 'https://api.openai.com/v1'],
    ['anthropic', ''],
    ['google', ''],
    ['openai-compatible', 'https://example.com/v1'],
  ] as Array<[ProviderProtocol, string]>)('creates a %s model without making a request', async (protocol, baseUrl) => {
    const provider: Provider = {
      id: 'provider',
      name: 'Provider',
      protocol,
      baseUrl,
      apiKey: 'test-key',
      models: [model],
    }

    const languageModel = await createLanguageModel(provider, model)

    expect(languageModel.specificationVersion).toBe('v4')
    expect(languageModel.modelId).toBe(model.id)
  })

  it('migrates legacy provider records by inference', () => {
    expect(resolveProviderProtocol({
      id: 'legacy-provider',
      name: 'Legacy provider',
      baseUrl: 'https://example.com/v1',
      apiKey: 'test-key',
      models: [],
    })).toBe('openai-compatible')
  })
})
