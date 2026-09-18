import { OutputType } from '@/types/prompt'

export const PROVIDER_PROTOCOLS = [
  'openai',
  'anthropic',
  'google',
  'openai-compatible',
] as const

export type ProviderProtocol = typeof PROVIDER_PROTOCOLS[number]

export type Model = {
  id: string
  name: string
  providerId: string
  temperature: number
  topP: number
}

export type Provider = {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  protocol?: ProviderProtocol
  supportsStructuredOutputs?: boolean
  isDefault?: boolean
  models: Model[]
}


export type OutputOption = {
  id: string
  name: string
  type: OutputType
  rulePrompt: string
}

export type WordOption = {
  id: string
  name: string
  rulePrompt: string
}

export type PromptOption = {
  id: string
  name: string
  prompt: string
}


export type LLMHistory = {
  id: string
  title: string
  timestamp: number
  prompt: string
  messages: {
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: number
    name?: string // 模型名称
    reasoningContent?: string // 思考内容
    thinkingTime?: number // 思考时间
  }[]
}


