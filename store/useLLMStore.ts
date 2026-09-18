import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Model, Provider } from '@/types/llm'
import { newProvider } from '@/utils/provider'
import { defaultProviders } from '@/config/llm'
interface LLMStore {
  level: number
  setLevel: (level: number) => void
  // LLM服务商列表
  providers: Provider[]
  // 编辑服务商信息
  editProvider: (provider: Provider) => void
  // 添加自定义LLM服务商
  addProvider: () => void
  // 删除LLM服务商
  deleteProvider: (providerId: string) => void
  // LLM可用列表
  models: () => Model[]
  // 聊天模型
  chatModel: Model | null
  // 设置聊天模型
  setChatModel: (model: Model | null) => void
  // 解析模型
  parseModel: Model | null
  // 设置解析模型
  setParseModel: (model: Model | null) => void
}

export const useLLMStore = create<LLMStore>()(
  persist(
    (set, get) => ({
      level: 3,
      setLevel: (level: number) => set({ level }),
      providers: defaultProviders(),
      editProvider: (provider: Provider) => set(state => ({
        providers: state.providers.map(item => item.id === provider.id ? provider : item),
        chatModel: refreshSelectedModel(state.chatModel, provider),
        parseModel: refreshSelectedModel(state.parseModel, provider),
      })),
      addProvider: () => set({ providers: [...get().providers, newProvider()] }),
      deleteProvider: (providerId: string) => set(state => ({
        providers: state.providers.filter(provider => provider.id !== providerId),
        chatModel: state.chatModel?.providerId === providerId ? null : state.chatModel,
        parseModel: state.parseModel?.providerId === providerId ? null : state.parseModel,
      })),
      models: () => get().providers
        .filter(isProviderConfigured)
        .flatMap(provider => provider.models),
      chatModel: null,
      setChatModel: (model: Model | null) => set({ chatModel: model }),
      parseModel: null,
      setParseModel: (model: Model | null) => set({ parseModel: model }),
    }),
    {
      name: 'llm-storage',
    }
  )
)

function refreshSelectedModel(selected: Model | null, provider: Provider): Model | null {
  if (!selected || selected.providerId !== provider.id) return selected
  return provider.models.find(model => model.id === selected.id) ?? null
}

function isProviderConfigured(provider: Provider): boolean {
  const needsBaseUrl = !provider.protocol || provider.protocol === 'openai-compatible'
  return Boolean(provider.apiKey && provider.models.length > 0 && (!needsBaseUrl || provider.baseUrl))
}
