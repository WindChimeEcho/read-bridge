import { Provider } from '@/types/llm'
import { generateUUID } from '@/utils/uuid'

export const newProvider = (): Provider => {
  return {
    id: generateUUID(),
    name: 'new Provider',
    protocol: 'openai-compatible',
    supportsStructuredOutputs: true,
    baseUrl: '',
    apiKey: '',
    models: [],
  }
}
