import type { Provider } from '@/types/llm'
import { resolveProviderProtocol } from './provider'

export interface RemoteModel {
  id: string
  name: string
}

export async function fetchProviderModels(
  provider: Provider,
  customFetch?: typeof fetch
): Promise<RemoteModel[]> {
  const fetchFn = customFetch || fetch

  if (!provider.apiKey || !provider.apiKey.trim()) {
    throw new Error('API key is required to fetch models')
  }

  const protocol = resolveProviderProtocol(provider)
  let url = ''
  const headers: Record<string, string> = {}

  switch (protocol) {
    case 'openai': {
      const baseUrl = (provider.baseUrl?.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '')
      url = `${baseUrl}/models`
      headers['Authorization'] = `Bearer ${provider.apiKey.trim()}`
      break
    }
    case 'openai-compatible': {
      if (!provider.baseUrl || !provider.baseUrl.trim()) {
        throw new Error(`Base URL is required for openai-compatible provider: ${provider.name}`)
      }
      const baseUrl = provider.baseUrl.trim().replace(/\/+$/, '')
      url = `${baseUrl}/models`
      headers['Authorization'] = `Bearer ${provider.apiKey.trim()}`
      break
    }
    case 'anthropic': {
      const baseUrl = (provider.baseUrl?.trim() || 'https://api.anthropic.com/v1').replace(/\/+$/, '')
      url = `${baseUrl}/models`
      headers['x-api-key'] = provider.apiKey.trim()
      headers['anthropic-version'] = '2023-06-01'
      break
    }
    case 'google': {
      const baseUrl = (provider.baseUrl?.trim() || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '')
      url = `${baseUrl}/models?key=${encodeURIComponent(provider.apiKey.trim())}`
      headers['x-goog-api-key'] = provider.apiKey.trim()
      break
    }
  }

  const response = await fetchFn(url, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    let errorMsg = response.statusText
    try {
      const body = await response.json()
      if (body && body.error && typeof body.error.message === 'string') {
        errorMsg = body.error.message
      } else if (typeof body === 'string') {
        errorMsg = body
      }
    } catch {
      // ignore JSON parse error
    }
    throw new Error(`Failed to fetch models (${response.status} ${response.statusText}): ${errorMsg}`)
  }

  const data = await response.json()
  const rawList: any[] = []

  if (Array.isArray(data)) {
    rawList.push(...data)
  } else if (data && Array.isArray(data.data)) {
    rawList.push(...data.data)
  } else if (data && Array.isArray(data.models)) {
    rawList.push(...data.models)
  }

  const modelsMap = new Map<string, RemoteModel>()

  for (const item of rawList) {
    if (!item) continue
    let id = ''
    let name = ''

    if (protocol === 'google') {
      const rawName = typeof item.name === 'string' ? item.name : (item.id || '')
      id = rawName.replace(/^models\//, '')
      name = item.displayName || item.name || id
    } else {
      id = typeof item.id === 'string' ? item.id : (typeof item.name === 'string' ? item.name : '')
      name = item.name || item.display_name || item.displayName || id
    }

    if (id && typeof id === 'string') {
      modelsMap.set(id, {
        id,
        name: typeof name === 'string' && name ? name : id,
      })
    }
  }

  return Array.from(modelsMap.values())
}
