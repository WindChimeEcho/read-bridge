import { Output, streamText, type ModelMessage } from 'ai'
import type { AnalysisResult } from '@/types/ai'
import type { Model, Provider } from '@/types/llm'
import type { OutputType } from '@/types/prompt'
import { keyValueListOutputSchema, simpleListOutputSchema } from './output-contracts'
import { createLanguageModel } from './provider'

type PartialResultHandler = (result: AnalysisResult) => void

export type GenerationRequest = {
  provider: Provider
  model: Model
  outputType: OutputType
  instructions: string
  messages: ModelMessage[]
  abortSignal?: AbortSignal
  onReasoning?: (reasoning: string) => void
  onResult?: PartialResultHandler
}

export type GenerationResponse = {
  result: AnalysisResult
  reasoning: string
}

export async function generateAnalysis(request: GenerationRequest): Promise<GenerationResponse> {
  switch (request.outputType) {
    case 'SIMPLE_LIST':
      return generateSimpleList(request)
    case 'KEY_VALUE_LIST':
      return generateKeyValueList(request)
    default:
      return generateTextResult(request)
  }
}

async function generateTextResult(request: GenerationRequest): Promise<GenerationResponse> {
  if (request.outputType !== 'TEXT' && request.outputType !== 'MD') {
    throw new Error(`Text generation does not support output type: ${request.outputType}`)
  }

  const outputType = request.outputType
  let content = ''
  let reasoning = ''

  const result = streamText({
    ...await createRequestOptions(request),
  })

  for await (const part of result.fullStream) {
    if (part.type === 'text-delta') {
      content += part.text
      request.onResult?.({ type: outputType, content })
    } else if (part.type === 'reasoning-delta') {
      reasoning += part.text
      request.onReasoning?.(reasoning)
    }
  }

  return {
    result: { type: outputType, content },
    reasoning,
  }
}

async function generateSimpleList(request: GenerationRequest): Promise<GenerationResponse> {
  let reasoning = ''
  const result = streamText({
    ...await createRequestOptions(request),
    output: Output.object({ schema: simpleListOutputSchema }),
    onChunk: ({ chunk }) => {
      if (chunk.type === 'reasoning-delta') {
        reasoning += chunk.text
        request.onReasoning?.(reasoning)
      }
    },
  })

  for await (const partial of result.partialOutputStream) {
    const items = partial.items?.filter((item): item is string => typeof item === 'string') ?? []
    request.onResult?.({ type: 'SIMPLE_LIST', items })
  }

  const output = await result.output
  return { result: { type: 'SIMPLE_LIST', items: output.items }, reasoning }
}

async function generateKeyValueList(request: GenerationRequest): Promise<GenerationResponse> {
  let reasoning = ''
  const result = streamText({
    ...await createRequestOptions(request),
    output: Output.object({ schema: keyValueListOutputSchema }),
    onChunk: ({ chunk }) => {
      if (chunk.type === 'reasoning-delta') {
        reasoning += chunk.text
        request.onReasoning?.(reasoning)
      }
    },
  })

  for await (const partial of result.partialOutputStream) {
    const items = (partial.items ?? []).map(item => ({
      label: item?.label ?? '',
      description: item?.description ?? '',
    }))
    request.onResult?.({ type: 'KEY_VALUE_LIST', items })
  }

  const output = await result.output
  return { result: { type: 'KEY_VALUE_LIST', items: output.items }, reasoning }
}

async function createRequestOptions(request: GenerationRequest) {
  return {
    model: await createLanguageModel(request.provider, request.model),
    instructions: request.instructions,
    messages: request.messages,
    temperature: request.model.temperature,
    topP: request.model.topP,
    abortSignal: request.abortSignal,
  }
}

export function getGenerationErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
