import { assemblePrompt, contextMessages, OUTPUT_PROMPT } from '@/constants/prompt'
import { generateAnalysis, getGenerationErrorMessage } from '@/services/ai/generate'
import { cacheService } from '@/services/CacheService'
import { emptyAnalysisResult, type AnalysisResult, type SentenceAnalysis } from '@/types/ai'
import type { CacheItem, CacheItemValue, CacheKeyParams } from '@/types/cache'
import type { Model, OutputOption, Provider, ThinkingConfig } from '@/types/llm'

export interface SentenceRuleRunDeps {
  getCache?: (params: CacheKeyParams) => Promise<CacheItem | null>
  setCache?: (params: CacheKeyParams, values: CacheItemValue) => Promise<void>
  clearCache?: () => Promise<void>
  generate?: typeof generateAnalysis
}

export interface RunSingleRuleParams {
  bookId: string
  sentence: string
  contextBefore?: string
  contextAfter?: string
  option: OutputOption
  provider: Provider
  model: Model
  thinking: ThinkingConfig
  abortSignal: AbortSignal
  skipCache?: boolean
  onUpdate: (optionId: string, patch: Partial<SentenceAnalysis>) => void
  deps?: SentenceRuleRunDeps
}

export interface RunSentenceRulesParams {
  bookId: string
  sentence: string
  contextBefore?: string
  contextAfter?: string
  options: OutputOption[]
  provider: Provider
  model: Model
  thinking: ThinkingConfig
  abortSignal: AbortSignal
  onUpdate: (optionId: string, patch: Partial<SentenceAnalysis>) => void
  deps?: SentenceRuleRunDeps
}

export function findModelProvider(providers: Provider[], model: Model | null): Provider | null {
  if (!model) return null
  return providers.find(provider => provider.id === model.providerId) ?? null
}

export function createInitialAnalyses(sentence: string, options: OutputOption[]): SentenceAnalysis[] {
  return options.map(option => ({
    id: option.id,
    name: option.name,
    input: sentence,
    outputType: option.type,
    status: 'streaming',
    result: emptyAnalysisResult(option.type),
    reasoning: '',
  }))
}

export function collectSentenceBatch(
  chapter: string[],
  startIndex: number,
  batchSize: number
): { batch: string; lastIndex: number } {
  const selected: string[] = []
  let lastIndex = startIndex

  for (let index = startIndex; index < chapter.length && selected.length < batchSize; index += 1) {
    const text = chapter[index]
    if (text?.trim()) {
      selected.push(text)
      lastIndex = index
    }
  }

  return { batch: selected.join('\n'), lastIndex }
}

export function collectSurroundingContext(
  chapter: string[],
  startIndex: number,
  lastIndex: number,
  windowSize = 2
): { before?: string; after?: string } {
  const beforeLines: string[] = []
  for (let i = startIndex - 1; i >= 0 && beforeLines.length < windowSize; i -= 1) {
    const text = chapter[i]?.trim()
    if (text) beforeLines.unshift(text)
  }

  const afterLines: string[] = []
  for (let i = lastIndex + 1; i < chapter.length && afterLines.length < windowSize; i += 1) {
    const text = chapter[i]?.trim()
    if (text) afterLines.push(text)
  }

  return {
    before: beforeLines.length > 0 ? beforeLines.join('\n') : undefined,
    after: afterLines.length > 0 ? afterLines.join('\n') : undefined,
  }
}

export function createCacheParams(
  bookId: string,
  sentence: string,
  option: OutputOption,
  provider: Provider,
  model: Model,
  thinking: ThinkingConfig,
  contextBefore?: string,
  contextAfter?: string
): CacheKeyParams {
  return {
    bookId,
    sentence,
    ...(contextBefore ? { contextBefore } : {}),
    ...(contextAfter ? { contextAfter } : {}),
    ruleId: option.id,
    rulePrompt: option.rulePrompt,
    outputType: option.type,
    providerId: provider.id,
    modelId: model.id,
    thinkingMode: thinking.mode,
    reasoningEffort: thinking.effort,
  }
}

export function isCacheable(result: AnalysisResult): boolean {
  switch (result.type) {
    case 'TEXT':
    case 'MD':
      return result.content.trim().length >= 5
    case 'SIMPLE_LIST':
    case 'KEY_VALUE_LIST':
      return result.items.length > 0
  }
}

export async function runSingleSentenceRule({
  bookId,
  sentence,
  contextBefore,
  contextAfter,
  option,
  provider,
  model,
  thinking,
  abortSignal,
  skipCache = false,
  onUpdate,
  deps = {},
}: RunSingleRuleParams): Promise<void> {
  const getCache = deps.getCache ?? cacheService.get
  const setCache = deps.setCache ?? cacheService.set
  const generate = deps.generate ?? generateAnalysis

  const cacheParams = createCacheParams(
    bookId,
    sentence,
    option,
    provider,
    model,
    thinking,
    contextBefore,
    contextAfter
  )

  try {
    if (!skipCache) {
      const cached = await getCache(cacheParams)
      if (abortSignal.aborted) {
        onUpdate(option.id, { status: 'cancelled' })
        return
      }
      if (cached) {
        onUpdate(option.id, {
          result: cached.result,
          reasoning: cached.reasoning,
          status: 'complete',
          fromCache: true,
        })
        return
      }
    }

    const response = await generate({
      provider,
      model,
      outputType: option.type,
      instructions: assemblePrompt(option.rulePrompt, OUTPUT_PROMPT[option.type]),
      messages: contextMessages(sentence, contextBefore, contextAfter),
      thinking,
      abortSignal,
      onResult: result => onUpdate(option.id, { result }),
      onReasoning: reasoning => onUpdate(option.id, { reasoning }),
    })

    if (abortSignal.aborted) {
      onUpdate(option.id, { status: 'cancelled' })
      return
    }

    onUpdate(option.id, {
      ...response,
      status: 'complete',
    })

    if (isCacheable(response.result)) {
      await setCache(cacheParams, {
        schemaVersion: 2,
        outputType: option.type,
        result: response.result,
        reasoning: response.reasoning,
      })
    }
  } catch (error) {
    onUpdate(
      option.id,
      abortSignal.aborted
        ? { status: 'cancelled' }
        : { status: 'error', error: getGenerationErrorMessage(error) }
    )
  }
}

export async function runSentenceRules({
  bookId,
  sentence,
  contextBefore,
  contextAfter,
  options,
  provider,
  model,
  thinking,
  abortSignal,
  onUpdate,
  deps = {},
}: RunSentenceRulesParams): Promise<void> {
  const clearCache = deps.clearCache ?? cacheService.clearCacheOnTriggerEvents
  await Promise.allSettled(
    options.map(option =>
      runSingleSentenceRule({
        bookId,
        sentence,
        contextBefore,
        contextAfter,
        option,
        provider,
        model,
        thinking,
        abortSignal,
        onUpdate,
        deps,
      })
    )
  )
  await clearCache()
}
