import type { Model, Provider, ProviderProtocol } from '@/types/llm'

export function resolveProviderProtocol(provider: Provider): ProviderProtocol {
  if (provider.protocol) return provider.protocol
  return provider.id === 'openai' ? 'openai' : 'openai-compatible'
}

export async function createLanguageModel(provider: Provider, model: Model) {
  const settings = {
    apiKey: provider.apiKey,
    ...(provider.baseUrl ? { baseURL: provider.baseUrl } : {}),
  }

  switch (resolveProviderProtocol(provider)) {
    case 'openai': {
      const { createOpenAI } = await import('@ai-sdk/openai')
      return createOpenAI(settings)(model.id)
    }
    case 'anthropic': {
      const { createAnthropic } = await import('@ai-sdk/anthropic')
      return createAnthropic(settings)(model.id)
    }
    case 'google': {
      const { createGoogleGenerativeAI } = await import('@ai-sdk/google')
      return createGoogleGenerativeAI(settings)(model.id)
    }
    case 'openai-compatible': {
      if (!provider.baseUrl) {
        throw new Error(`Base URL is required for provider: ${provider.name}`)
      }
      const { createOpenAICompatible } = await import('@ai-sdk/openai-compatible')
      return createOpenAICompatible({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl,
        name: provider.id,
        supportsStructuredOutputs: provider.supportsStructuredOutputs ?? true,
      })(model.id)
    }
  }
}
