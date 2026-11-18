import { Provider, ThinkingConfig } from "@/types/llm";

export const DEFAULT_THINKING_CONFIG: ThinkingConfig = { mode: 'default', effort: 'medium' }

export const defaultProviders = (): Provider[] => {
  return [
    {
      id: 'openai',
      name: 'OpenAI',
      protocol: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      isDefault: true,
      models: [],
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      protocol: 'openai-compatible',
      supportsStructuredOutputs: true,
      baseUrl: 'https://api.deepseek.com',
      apiKey: '',
      isDefault: true,
      models: [],
    }
  ]
}
