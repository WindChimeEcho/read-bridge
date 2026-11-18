import { ThinkingConfig, ReasoningEffort, Provider, Model } from '@/types/llm'
import { defaultProviders, DEFAULT_THINKING_CONFIG } from '@/config/llm'

export function toSDKReasoning(thinking?: ThinkingConfig): 'provider-default' | 'none' | ReasoningEffort {
  if (!thinking || thinking.mode === 'default') {
    return 'provider-default'
  }
  if (thinking.mode === 'disabled') {
    return 'none'
  }
  if (thinking.mode === 'enabled') {
    if (thinking.effort === 'low' || thinking.effort === 'medium' || thinking.effort === 'high') {
      return thinking.effort
    }
    return 'medium'
  }
  return 'provider-default'
}

export function upgradeLLMState(persistedState: unknown, version?: number): any {
  if (!persistedState || typeof persistedState !== 'object') {
    return {
      level: 3,
      providers: defaultProviders(),
      chatModel: null,
      parseModel: null,
      chatThinking: { ...DEFAULT_THINKING_CONFIG },
      parseThinking: { ...DEFAULT_THINKING_CONFIG },
    }
  }

  const state = persistedState as any

  const legacyOpenAIModels = new Set(['gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o1-mini'])
  const legacyDeepSeekModels = new Set(['deepseek-chat', 'deepseek-reasoner'])

  function cleanModel(m: any): Model {
    return {
      id: String(m?.id ?? ''),
      name: String(m?.name ?? m?.id ?? ''),
      providerId: String(m?.providerId ?? ''),
    }
  }

  const rawProviders = Array.isArray(state.providers) ? state.providers : defaultProviders()
  const newProvidersMap = new Map<string, Provider>()

  // Initialize with default providers
  for (const dp of defaultProviders()) {
    newProvidersMap.set(dp.id, { ...dp, models: [] })
  }

  for (const p of rawProviders) {
    if (!p || typeof p !== 'object') continue
    const pId = String(p.id ?? '')

    if (!p.isDefault && pId !== 'openai' && pId !== 'deepseek' && pId !== 'volcengine') {
      // Custom provider: 100% preserved, strip temperature/topP from models
      const models = Array.isArray(p.models) ? p.models.map(cleanModel) : []
      newProvidersMap.set(pId, {
        id: pId,
        name: String(p.name ?? pId),
        baseUrl: String(p.baseUrl ?? ''),
        apiKey: String(p.apiKey ?? ''),
        protocol: p.protocol,
        supportsStructuredOutputs: p.supportsStructuredOutputs,
        isDefault: false,
        models,
      })
    } else if (pId === 'volcengine') {
      const apiKey = String(p.apiKey ?? '')
      if (apiKey && apiKey.trim()) {
        const models = Array.isArray(p.models) ? p.models.map(cleanModel) : []
        newProvidersMap.set('volcengine', {
          id: 'volcengine',
          name: String(p.name ?? '火山引擎'),
          baseUrl: String(p.baseUrl ?? 'https://ark.cn-beijing.volces.com/api/v3'),
          apiKey,
          protocol: p.protocol ?? 'openai-compatible',
          supportsStructuredOutputs: p.supportsStructuredOutputs ?? true,
          isDefault: false,
          models,
        })
      }
    } else if (pId === 'openai' || pId === 'deepseek') {
      const existing = newProvidersMap.get(pId)!
      existing.apiKey = String(p.apiKey ?? existing.apiKey)
      existing.baseUrl = String(p.baseUrl ?? existing.baseUrl)
      existing.name = String(p.name ?? existing.name)
      existing.protocol = p.protocol ?? existing.protocol
      existing.supportsStructuredOutputs = p.supportsStructuredOutputs ?? existing.supportsStructuredOutputs

      const rawModels = Array.isArray(p.models) ? p.models : []
      const cleanedModels: Model[] = []
      for (const m of rawModels) {
        const mId = String(m?.id ?? '')
        if (version === undefined || version < 2) {
          if (pId === 'openai' && legacyOpenAIModels.has(mId)) continue
          if (pId === 'deepseek' && legacyDeepSeekModels.has(mId)) continue
        }
        cleanedModels.push({
          ...cleanModel(m),
          providerId: pId,
        })
      }
      existing.models = cleanedModels
    }
  }

  const providers = Array.from(newProvidersMap.values())

  function validateModel(model: any): Model | null {
    if (!model || typeof model !== 'object') return null
    const providerId = String(model.providerId ?? '')
    const modelId = String(model.id ?? '')
    const prov = providers.find(p => p.id === providerId)
    if (!prov) return null
    const found = prov.models.find(m => m.id === modelId)
    if (found) {
      return { ...found }
    }
    return null
  }

  const chatModel = validateModel(state.chatModel)
  const parseModel = validateModel(state.parseModel)

  function validateThinking(t: any): ThinkingConfig {
    if (!t || typeof t !== 'object') return { ...DEFAULT_THINKING_CONFIG }
    const mode = ['default', 'enabled', 'disabled'].includes(t.mode) ? t.mode : DEFAULT_THINKING_CONFIG.mode
    const effort = ['low', 'medium', 'high'].includes(t.effort) ? t.effort : DEFAULT_THINKING_CONFIG.effort
    return { mode, effort }
  }

  const chatThinking = validateThinking(state.chatThinking)
  const parseThinking = validateThinking(state.parseThinking)

  const level = typeof state.level === 'number' ? state.level : 3

  return {
    level,
    providers,
    chatModel,
    parseModel,
    chatThinking,
    parseThinking,
  }
}
