import assert from 'node:assert/strict'
import test from 'node:test'

import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { Output, streamText } from 'ai'
import { MockLanguageModelV3 } from 'ai/test'
import { z } from 'zod'

const simpleListOutputSchema = z.object({
  items: z.array(z.string()),
})

const keyValueListOutputSchema = z.object({
  items: z.array(z.object({
    label: z.string(),
    description: z.string(),
  })),
})

const usage = {
  inputTokens: {
    total: 1,
    noCache: 1,
    cacheRead: 0,
    cacheWrite: 0,
  },
  outputTokens: {
    total: 1,
    text: 1,
    reasoning: 0,
  },
}

function createMockModel(parts) {
  return new MockLanguageModelV3({
    doStream: async () => ({
      stream: new ReadableStream({
        start(controller) {
          for (const part of parts) controller.enqueue(part)
          controller.enqueue({
            type: 'finish',
            finishReason: { unified: 'stop', raw: 'stop' },
            usage,
          })
          controller.close()
        },
      }),
    }),
  })
}

test('provider factories do not make a request while being created', () => {
  let requestCount = 0
  const blockedFetch = async () => {
    requestCount += 1
    throw new Error('The smoke test must not access the network')
  }

  const openai = createOpenAI({ apiKey: 'test-key', fetch: blockedFetch })
  const compatible = createOpenAICompatible({
    name: 'test-provider',
    apiKey: 'test-key',
    baseURL: 'https://example.invalid/v1',
    supportsStructuredOutputs: true,
    fetch: blockedFetch,
  })

  assert.equal(openai('gpt-4o-mini').specificationVersion, 'v4')
  assert.equal(compatible('test-model').specificationVersion, 'v4')
  assert.equal(requestCount, 0)
})

test('reasoning and markdown text stay as separate stream parts', async () => {
  const result = streamText({
    model: createMockModel([
      { type: 'reasoning-start', id: 'reasoning-0' },
      { type: 'reasoning-delta', id: 'reasoning-0', delta: 'analysis' },
      { type: 'reasoning-end', id: 'reasoning-0' },
      { type: 'text-start', id: 'text-0' },
      { type: 'text-delta', id: 'text-0', delta: '## Result' },
      { type: 'text-end', id: 'text-0' },
    ]),
    prompt: 'test',
  })

  let reasoning = ''
  let markdown = ''

  for await (const part of result.fullStream) {
    if (part.type === 'reasoning-delta') reasoning += part.text
    if (part.type === 'text-delta') markdown += part.text
  }

  assert.equal(reasoning, 'analysis')
  assert.equal(markdown, '## Result')
})

test('structured list output is validated by its schema', async () => {
  const result = streamText({
    model: createMockModel([
      { type: 'text-start', id: 'text-0' },
      {
        type: 'text-delta',
        id: 'text-0',
        delta: '{"items":["first","second"]}',
      },
      { type: 'text-end', id: 'text-0' },
    ]),
    output: Output.object({ schema: simpleListOutputSchema }),
    prompt: 'test',
  })

  const partials = []
  for await (const partial of result.partialOutputStream) partials.push(partial)

  assert.ok(partials.length > 0)
  assert.deepEqual(await result.output, { items: ['first', 'second'] })
})

test('key-value list output keeps labels separate from descriptions', async () => {
  const result = streamText({
    model: createMockModel([
      { type: 'text-start', id: 'text-0' },
      {
        type: 'text-delta',
        id: 'text-0',
        delta: '{"items":[{"label":"Subject","description":"The actor"}]}',
      },
      { type: 'text-end', id: 'text-0' },
    ]),
    output: Output.object({ schema: keyValueListOutputSchema }),
    prompt: 'test',
  })

  assert.deepEqual(await result.output, {
    items: [{ label: 'Subject', description: 'The actor' }],
  })
})

test('invalid structured output is rejected instead of reaching the UI as a valid result', async () => {
  const result = streamText({
    model: createMockModel([
      { type: 'text-start', id: 'text-0' },
      { type: 'text-delta', id: 'text-0', delta: '{"items":[42]}' },
      { type: 'text-end', id: 'text-0' },
    ]),
    output: Output.object({ schema: simpleListOutputSchema }),
    prompt: 'test',
  })

  await assert.rejects(Promise.resolve(result.output))
})

test('abort signals are passed through to the provider call', async () => {
  const model = createMockModel([
    { type: 'text-start', id: 'text-0' },
    { type: 'text-delta', id: 'text-0', delta: 'done' },
    { type: 'text-end', id: 'text-0' },
  ])
  const controller = new AbortController()
  const result = streamText({
    model,
    abortSignal: controller.signal,
    prompt: 'test',
  })

  for await (const _ of result.textStream) {
    // Consume the stream so the provider call is recorded.
  }

  assert.equal(model.doStreamCalls[0].abortSignal, controller.signal)
})
