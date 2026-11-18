import { streamText, type ModelMessage } from 'ai'
import type { AnalysisResult } from '@/types/ai'
import type { Model, Provider, ThinkingConfig } from '@/types/llm'
import { toSDKReasoning } from '@/utils/llm'
import type { OutputType } from '@/types/prompt'
import { createLanguageModel } from './provider'
import { createThinkStreamParser } from './think-parser'
import { parseKeyValueList, parseSimpleList } from './list-parser'

type PartialResultHandler = (result: AnalysisResult) => void

export type GenerationRequest = {
  provider: Provider
  model: Model
  outputType: OutputType
  instructions: string
  messages: ModelMessage[]
  thinking?: ThinkingConfig
  abortSignal?: AbortSignal
  onReasoning?: (reasoning: string) => void
  onResult?: PartialResultHandler
}

export type GenerationResponse = {
  result: AnalysisResult
  reasoning: string
}

export async function generateAnalysis(request: GenerationRequest): Promise<GenerationResponse> {
  const outputType = request.outputType
  const thinkParser = createThinkStreamParser()

  const result = streamText({
    ...(await createRequestOptions(request)),
  })

  for await (const part of result.fullStream) {
    if (part.type === 'reasoning-delta') {
      const snapshot = thinkParser.addReasoningDelta(part.text)
      if (snapshot.reasoningChanged) {
        request.onReasoning?.(snapshot.reasoning)
      }
    } else if (part.type === 'text-delta') {
      const snapshot = thinkParser.addTextDelta(part.text)
      if (snapshot.reasoningChanged) {
        request.onReasoning?.(snapshot.reasoning)
      }
      if (snapshot.contentChanged) {
        emitResult(outputType, snapshot.content, false, request.onResult)
      }
    } else if (part.type === 'error') {
      throw part.error instanceof Error ? part.error : new Error(String(part.error))
    }
  }

  const finalSnapshot = thinkParser.finish()
  if (finalSnapshot.reasoningChanged) {
    request.onReasoning?.(finalSnapshot.reasoning)
  }
  if (finalSnapshot.contentChanged) {
    emitResult(outputType, finalSnapshot.content, true, request.onResult)
  }

  const finalResult = buildAnalysisResult(outputType, finalSnapshot.content, true)

  return {
    result: finalResult,
    reasoning: finalSnapshot.reasoning,
  }
}

function buildAnalysisResult(
  outputType: OutputType,
  content: string,
  isComplete: boolean
): AnalysisResult {
  switch (outputType) {
    case 'SIMPLE_LIST':
      return {
        type: 'SIMPLE_LIST',
        items: parseSimpleList(content, isComplete),
      }
    case 'KEY_VALUE_LIST':
      return {
        type: 'KEY_VALUE_LIST',
        items: parseKeyValueList(content, isComplete),
      }
    case 'TEXT':
    case 'MD':
      return {
        type: outputType,
        content,
      }
    default:
      throw new Error(`Unsupported output type: ${outputType as string}`)
  }
}

function emitResult(
  outputType: OutputType,
  content: string,
  isComplete: boolean,
  onResult?: PartialResultHandler
) {
  if (!onResult) return
  onResult(buildAnalysisResult(outputType, content, isComplete))
}

async function createRequestOptions(request: GenerationRequest) {
  return {
    model: await createLanguageModel(request.provider, request.model),
    instructions: request.instructions,
    messages: request.messages,
    reasoning: toSDKReasoning(request.thinking),
    abortSignal: request.abortSignal,
  }
}

export function getGenerationErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
