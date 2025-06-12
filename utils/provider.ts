import { Provider } from '@/types/llm'
import { generateUUID } from '@/utils/uuid'

export const newProvider = (): Provider => {
  return {
    id: generateUUID(),
    name: 'new Provider',
    baseUrl: '',
    apiKey: '',
    models: [],
  }
}
