import { describe, expect, it, vi } from 'vitest'
import { createThinkStreamParser } from '../services/ai/think-parser'
import { parseKeyValueList, parseSimpleList } from '../services/ai/list-parser'
import { generateAnalysis } from '../services/ai/generate'
import { preprocessMarkdown } from '../app/components/common/MarkdownRenderer/preprocess'
import type { Model, Provider } from '../types/llm'

const mockStreamParts: Array<Record<string, unknown>> = []

vi.mock('../services/ai/provider', () => ({
  createLanguageModel: vi.fn(async () => ({
    specificationVersion: 'v4',
    provider: 'mock-provider',
    modelId: 'mock-model',
    doStream: async () => ({
      stream: new ReadableStream({
        start(controller) {
          for (const part of mockStreamParts) {
            controller.enqueue(part)
          }
          controller.close()
        },
      }),
    }),
  })),
}))

const testProvider: Provider = {
  id: 'test-provider',
  name: 'Test Provider',
  protocol: 'openai-compatible',
  baseUrl: 'https://example.com/v1',
  apiKey: 'test-key',
  models: [],
}

const testModel: Model = {
  id: 'test-model',
  name: 'Test Model',
  providerId: 'test-provider',
}

describe('createThinkStreamParser', () => {
  it('strips standard <think>...</think> tags and separates reasoning from content', () => {
    const parser = createThinkStreamParser()
    const snap1 = parser.addTextDelta('<think>这是思考过程</think>这是最终正文')
    const finalSnap = parser.finish()

    expect(snap1.reasoning).toBe('这是思考过程')
    expect(snap1.content).toBe('这是最终正文')
    expect(finalSnap.reasoning).toBe('这是思考过程')
    expect(finalSnap.content).toBe('这是最终正文')
  })

  it('handles cross-chunk split tags accurately', () => {
    const parser = createThinkStreamParser()
    const chunks = ['<thi', 'nk>思考', '</thi', 'nk>正文']
    for (const chunk of chunks) {
      parser.addTextDelta(chunk)
    }
    const finalSnap = parser.finish()

    expect(finalSnap.reasoning).toBe('思考')
    expect(finalSnap.content).toBe('正文')
  })

  it('backtracks accumulated content to reasoning when encountering an orphan </think>', () => {
    const parser = createThinkStreamParser()
    const chunks = ['漏出的思考内容', '</think>真正的正文']
    for (const chunk of chunks) {
      parser.addTextDelta(chunk)
    }
    const finalSnap = parser.finish()

    expect(finalSnap.reasoning).toBe('漏出的思考内容')
    expect(finalSnap.content).toBe('真正的正文')
  })

  it('supports multiple <think> blocks and <thinking> / <thought> case-insensitive variants', () => {
    const parser = createThinkStreamParser()
    parser.addTextDelta('<THINKING>第一段思考</THINKING>第一段正文')
    parser.addTextDelta('<thought>第二段思考</thought>第二段正文')
    const finalSnap = parser.finish()

    expect(finalSnap.reasoning).toBe('第一段思考\n第二段思考')
    expect(finalSnap.content).toBe('第一段正文第二段正文')
  })

  it('merges native reasoning-delta with inline <think> tags cleanly', () => {
    const parser = createThinkStreamParser()
    parser.addReasoningDelta('原生思考内容')
    parser.addTextDelta('<think>内联补充思考</think>最终正文输出')
    const finalSnap = parser.finish()

    expect(finalSnap.reasoning).toBe('原生思考内容\n内联补充思考')
    expect(finalSnap.content).toBe('最终正文输出')
  })

  it('streams unclosed <think> content into reasoning in real time', () => {
    const parser = createThinkStreamParser()
    const snap1 = parser.addTextDelta('<think>正在思考前半句')
    expect(snap1.reasoning).toBe('正在思考前半句')
    expect(snap1.content).toBe('')

    const snap2 = parser.addTextDelta('，继续思考后半句')
    expect(snap2.reasoning).toBe('正在思考前半句，继续思考后半句')
    expect(snap2.content).toBe('')
  })
})

describe('parseSimpleList & parseKeyValueList', () => {
  it('parses streaming partial JSON for SIMPLE_LIST incrementally', () => {
    const partial = '{"items": ["first phrase", "second phr'
    expect(parseSimpleList(partial, false)).toEqual(['first phrase', 'second phr'])
  })

  it('parses JSON wrapped in ```json code fences for SIMPLE_LIST', () => {
    const fenced = '```json\n{"items": ["Clause A", "Clause B"]}\n```'
    expect(parseSimpleList(fenced, true)).toEqual(['Clause A', 'Clause B'])
  })

  it('falls back to line-by-line list parsing when model outputs plain markdown list for SIMPLE_LIST', () => {
    const markdownList = '- First item\n* Second item\n3. Third item'
    expect(parseSimpleList(markdownList, true)).toEqual([
      'First item',
      'Second item',
      'Third item',
    ])
  })

  it('parses streaming partial JSON for KEY_VALUE_LIST incrementally', () => {
    const partial =
      '{"items": [{"label": "ephemeral", "description": "lasting for a very short time"}, {"label": "resilient", "description": "able to recov'
    expect(parseKeyValueList(partial, false)).toEqual([
      { label: 'ephemeral', description: 'lasting for a very short time' },
      { label: 'resilient', description: 'able to recov' },
    ])
  })

  it('parses flat JSON object and fenced JSON for KEY_VALUE_LIST', () => {
    const fencedFlat = '```json\n{"meticulous": "very careful and precise", "candid": "truthful and straightforward"}\n```'
    expect(parseKeyValueList(fencedFlat, true)).toEqual([
      { label: 'meticulous', description: 'very careful and precise' },
      { label: 'candid', description: 'truthful and straightforward' },
    ])
  })

  it('falls back to line-by-line parsing for markdown key-value lines', () => {
    const rawLines = [
      '- **ubiquitous**: present, appearing, or found everywhere',
      '**pragmatic**：dealing with things sensibly and realistically',
      'eloquent: fluent or persuasive in speaking or writing',
    ].join('\n')

    expect(parseKeyValueList(rawLines, true)).toEqual([
      { label: 'ubiquitous', description: 'present, appearing, or found everywhere' },
      { label: 'pragmatic', description: 'dealing with things sensibly and realistically' },
      { label: 'eloquent', description: 'fluent or persuasive in speaking or writing' },
    ])
  })
})

describe('generateAnalysis error passthrough & think+list integration', () => {
  it('throws the underlying stream error message instead of generic NoOutputGeneratedError', async () => {
    mockStreamParts.length = 0
    mockStreamParts.push({
      type: 'error',
      error: new Error('API Rate Limit Exceeded (429): Too many requests'),
    })

    await expect(
      generateAnalysis({
        provider: testProvider,
        model: testModel,
        outputType: 'SIMPLE_LIST',
        instructions: 'Analyze sentence',
        messages: [{ role: 'user', content: 'Test' }],
      })
    ).rejects.toThrow('API Rate Limit Exceeded (429): Too many requests')
  })

  it('parses SIMPLE_LIST with orphan </think> and streaming JSON without Output.object', async () => {
    mockStreamParts.length = 0
    mockStreamParts.push(
      { type: 'text-start', id: 'text-0' },
      { type: 'text-delta', id: 'text-0', delta: '思考如何拆分句子...</think>' },
      { type: 'text-delta', id: 'text-0', delta: '{"items": ["Part 1", "Part 2"]}' },
      { type: 'text-end', id: 'text-0' },
      {
        type: 'finish',
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: {
          inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 1, text: 1, reasoning: 0 },
        },
      }
    )

    const reasoningHistory: string[] = []
    const response = await generateAnalysis({
      provider: testProvider,
      model: testModel,
      outputType: 'SIMPLE_LIST',
      instructions: 'Analyze sentence',
      messages: [{ role: 'user', content: 'Test' }],
      onReasoning: (r) => reasoningHistory.push(r),
    })

    expect(response.reasoning).toBe('思考如何拆分句子...')
    expect(reasoningHistory).toContain('思考如何拆分句子...')
    expect(response.result).toEqual({
      type: 'SIMPLE_LIST',
      items: ['Part 1', 'Part 2'],
    })
  })
})

describe('preprocessMarkdown', () => {
  it('auto-closes unclosed <fold>, <explain>, and <details> tags during streaming and ensures blank lines', () => {
    const streaming = 'Simple explanation.\n<fold title="Still confused?">**Bold** item'
    const processed = preprocessMarkdown(streaming)

    expect(processed).toContain('<fold title="Still confused?">\n\n**Bold** item\n\n</fold>')
  })

  it('inserts double newlines after </summary> and before </details>', () => {
    const raw = '<details><summary>More notes</summary>- Note 1\n- Note 2</details>'
    const processed = preprocessMarkdown(raw)

    expect(processed).toContain('</summary>\n\n- Note 1\n- Note 2\n\n</details>')
  })
})

