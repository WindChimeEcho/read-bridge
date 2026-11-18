import { describe, expect, it, vi } from 'vitest'
import { toSDKReasoning, upgradeLLMState } from '../utils/llm'
import { fetchProviderModels } from '../services/ai/models'
import type { Provider, ThinkingConfig } from '../types/llm'

describe('LLM Upgrade, Reasoning & Models', () => {
  describe('toSDKReasoning', () => {
    it('maps default or undefined to provider-default', () => {
      expect(toSDKReasoning(undefined)).toBe('provider-default')
      expect(toSDKReasoning({ mode: 'default', effort: 'medium' })).toBe('provider-default')
    })

    it('maps disabled to none', () => {
      expect(toSDKReasoning({ mode: 'disabled', effort: 'high' })).toBe('none')
    })

    it('maps enabled with effort to effort value', () => {
      expect(toSDKReasoning({ mode: 'enabled', effort: 'low' })).toBe('low')
      expect(toSDKReasoning({ mode: 'enabled', effort: 'medium' })).toBe('medium')
      expect(toSDKReasoning({ mode: 'enabled', effort: 'high' })).toBe('high')
    })
  })

  describe('upgradeLLMState', () => {
    it('preserves custom providers 100% and strips temperature/topP from models', () => {
      const oldState = {
        level: 3,
        providers: [
          {
            id: 'custom-1',
            name: 'Custom',
            baseUrl: 'https://custom.com/v1',
            apiKey: 'key',
            isDefault: false,
            models: [
              { id: 'm1', name: 'Model 1', temperature: 0.7, topP: 0.9, providerId: 'custom-1' }
            ]
          }
        ],
        chatModel: { providerId: 'custom-1', id: 'm1', name: 'Model 1' },
        parseModel: null,
      }

      const upgraded = upgradeLLMState(oldState, 2)
      const provider = upgraded.providers.find((p: Provider) => p.id === 'custom-1')
      expect(provider).toBeDefined()
      expect(provider.models[0]).not.toHaveProperty('temperature')
      expect(provider.models[0]).not.toHaveProperty('topP')
      expect(upgraded.chatModel).toEqual({ providerId: 'custom-1', id: 'm1', name: 'Model 1' })
    })

    it('handles volcanic (volcengine) provider correctly based on apiKey', () => {
      // Empty apiKey -> removed
      const stateEmpty = {
        providers: [
          { id: 'volcengine', name: 'Volc', apiKey: '', models: [] }
        ]
      }
      const upgradedEmpty = upgradeLLMState(stateEmpty, 2)
      expect(upgradedEmpty.providers.find((p: Provider) => p.id === 'volcengine')).toBeUndefined()

      // Filled apiKey -> converted to custom provider (isDefault: false), models kept with temperature/topP stripped
      const stateFilled = {
        providers: [
          {
            id: 'volcengine',
            name: 'Volc',
            apiKey: 'volc-key',
            models: [{ id: 'volc-m', name: 'Volc Model', temperature: 0.5, topP: 1 }]
          }
        ]
      }
      const upgradedFilled = upgradeLLMState(stateFilled, 2)
      const volcProv = upgradedFilled.providers.find((p: Provider) => p.id === 'volcengine')
      expect(volcProv).toBeDefined()
      expect(volcProv.isDefault).toBe(false)
      expect(volcProv.apiKey).toBe('volc-key')
      expect(volcProv.models[0]).not.toHaveProperty('temperature')
      expect(volcProv.models[0]).not.toHaveProperty('topP')
    })

    it('keeps active default providers (openai/deepseek) and strips legacy hardcoded models when migrating from version < 2', () => {
      const oldState = {
        providers: [
          {
            id: 'openai',
            name: 'OpenAI',
            apiKey: 'openai-key',
            baseUrl: 'https://api.openai.com/v1',
            isDefault: true,
            models: [
              { id: 'gpt-4o', name: 'GPT-4o' },
              { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
              { id: 'o1-preview', name: 'O1 Preview' },
              { id: 'o1-mini', name: 'O1 Mini' },
              { id: 'custom-user-model', name: 'User Model', temperature: 0.8 }
            ]
          },
          {
            id: 'deepseek',
            name: 'DeepSeek',
            apiKey: 'deepseek-key',
            baseUrl: 'https://api.deepseek.com',
            isDefault: true,
            models: [
              { id: 'deepseek-chat', name: 'DS Chat' },
              { id: 'deepseek-reasoner', name: 'DS Reasoner' },
              { id: 'custom-ds-model', name: 'User DS Model', temperature: 0.5 }
            ]
          }
        ]
      }

      const upgraded = upgradeLLMState(oldState, 1)
      const openaiProv = upgraded.providers.find((p: Provider) => p.id === 'openai')
      const deepseekProv = upgraded.providers.find((p: Provider) => p.id === 'deepseek')

      expect(openaiProv.models.map((m: any) => m.id)).toEqual(['custom-user-model'])
      expect(openaiProv.models[0]).not.toHaveProperty('temperature')
      expect(deepseekProv.models.map((m: any) => m.id)).toEqual(['custom-ds-model'])
      expect(deepseekProv.models[0]).not.toHaveProperty('temperature')
    })

    it('validates selected models and fills default chatThinking and parseThinking', () => {
      const oldState = {
        chatModel: { providerId: 'openai', id: 'non-existent' },
        parseModel: null,
      }
      const upgraded = upgradeLLMState(oldState, 2)
      expect(upgraded.chatModel).toBeNull()
      expect(upgraded.parseModel).toBeNull()
      expect(upgraded.chatThinking).toEqual({ mode: 'default', effort: 'medium' })
      expect(upgraded.parseThinking).toEqual({ mode: 'default', effort: 'medium' })
    })
  })

  describe('fetchProviderModels', () => {
    it('throws error when apiKey is empty', async () => {
      const provider: Provider = {
        id: 'openai',
        name: 'OpenAI',
        protocol: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        models: [],
      }
      await expect(fetchProviderModels(provider)).rejects.toThrow('API key is required')
    })

    it('fetches and normalizes models for openai, openai-compatible, anthropic, and google protocols', async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string, options: any) => {
        if (url.includes('api.openai.com')) {
          expect(options.headers['Authorization']).toBe('Bearer test-openai-key')
          return {
            ok: true,
            json: async () => ({ data: [{ id: 'gpt-4o', name: 'GPT-4o' }] })
          }
        }
        if (url.includes('example.com')) {
          expect(options.headers['Authorization']).toBe('Bearer test-compat-key')
          return {
            ok: true,
            json: async () => ({ models: [{ id: 'custom-model' }] })
          }
        }
        if (url.includes('api.anthropic.com')) {
          expect(options.headers['x-api-key']).toBe('test-anthropic-key')
          expect(options.headers['anthropic-version']).toBe('2023-06-01')
          return {
            ok: true,
            json: async () => [{ id: 'claude-3-5-sonnet' }]
          }
        }
        if (url.includes('generativelanguage.googleapis.com')) {
          expect(url).toContain('key=test-google-key')
          expect(options.headers['x-goog-api-key']).toBe('test-google-key')
          return {
            ok: true,
            json: async () => ({
              models: [
                { name: 'models/gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' },
                { id: 'gemini-1.5-flash' }
              ]
            })
          }
        }
        return { ok: false, status: 404, statusText: 'Not Found' }
      })

      // OpenAI
      const pOpenAI: Provider = {
        id: 'openai',
        name: 'OpenAI',
        protocol: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'test-openai-key',
        models: [],
      }
      const modelsOpenAI = await fetchProviderModels(pOpenAI, mockFetch)
      expect(modelsOpenAI).toEqual([{ id: 'gpt-4o', name: 'GPT-4o' }])

      // OpenAI-compatible
      const pCompat: Provider = {
        id: 'compat',
        name: 'Compat',
        protocol: 'openai-compatible',
        baseUrl: 'https://example.com/v1',
        apiKey: 'test-compat-key',
        models: [],
      }
      const modelsCompat = await fetchProviderModels(pCompat, mockFetch)
      expect(modelsCompat).toEqual([{ id: 'custom-model', name: 'custom-model' }])

      // Anthropic
      const pAnthropic: Provider = {
        id: 'anthropic',
        name: 'Anthropic',
        protocol: 'anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: 'test-anthropic-key',
        models: [],
      }
      const modelsAnthropic = await fetchProviderModels(pAnthropic, mockFetch)
      expect(modelsAnthropic).toEqual([{ id: 'claude-3-5-sonnet', name: 'claude-3-5-sonnet' }])

      // Google
      const pGoogle: Provider = {
        id: 'google',
        name: 'Google',
        protocol: 'google',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: 'test-google-key',
        models: [],
      }
      const modelsGoogle = await fetchProviderModels(pGoogle, mockFetch)
      expect(modelsGoogle).toEqual([
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
        { id: 'gemini-1.5-flash', name: 'gemini-1.5-flash' }
      ])
    })

    it('throws error when HTTP status is not OK', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Invalid API key' } })
      })

      const provider: Provider = {
        id: 'openai',
        name: 'OpenAI',
        protocol: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'bad-key',
        models: [],
      }

      await expect(fetchProviderModels(provider, mockFetch)).rejects.toThrow('Invalid API key')
    })
  })
})
