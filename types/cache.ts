import type { AnalysisResult } from './ai'
import type { OutputType } from './prompt'

export type CacheItemValue = {
  schemaVersion: 2
  outputType: OutputType
  result: AnalysisResult
  reasoning: string
}

export type CacheItem = CacheItemValue & {
  createTime: string
}

export interface CacheSettings {
  expireHours: number
  bufferSlots: number
  maxCacheSize: number
}

export interface CacheSystem {
  buckets: Record<string, Record<string, CacheItem>>
  globalIndex: Record<string, string>
  settings: CacheSettings
}

export interface CacheKeyParams {
  bookId: string
  sentence: string
  ruleId: string
  rulePrompt: string
  outputType: OutputType
  providerId: string
  modelId: string
  temperature: number
  topP: number
}
