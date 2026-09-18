import { OutputType } from '@/types/prompt'

export type SimpleListResult = {
  type: 'SIMPLE_LIST'
  items: string[]
}

export type KeyValueListResult = {
  type: 'KEY_VALUE_LIST'
  items: Array<{
    label: string
    description: string
  }>
}

export type TextResult = {
  type: 'TEXT' | 'MD'
  content: string
}

export type AnalysisResult = TextResult | SimpleListResult | KeyValueListResult

export type GenerationStatus = 'streaming' | 'complete' | 'cancelled' | 'error'

export type SentenceAnalysis = {
  id: string
  name: string
  input: string
  outputType: OutputType
  status: GenerationStatus
  result: AnalysisResult
  reasoning: string
  error?: string
  fromCache?: boolean
}

export function emptyAnalysisResult(outputType: OutputType): AnalysisResult {
  switch (outputType) {
    case 'SIMPLE_LIST':
      return { type: outputType, items: [] }
    case 'KEY_VALUE_LIST':
      return { type: outputType, items: [] }
    default:
      return { type: outputType, content: '' }
  }
}
