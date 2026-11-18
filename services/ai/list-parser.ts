import { parsePartialJson } from 'ai'

// Keep reference to ai's parsePartialJson for async callers while providing synchronous partial JSON repair
export { parsePartialJson }

function fixPartialJson(input: string): string {
  const stack: string[] = ['ROOT']
  let lastValidIndex = -1
  let literalStart: number | null = null
  let unicodeEscapeDigits = 0

  function isHexDigit(char: string) {
    return (
      (char >= '0' && char <= '9') ||
      (char >= 'A' && char <= 'F') ||
      (char >= 'a' && char <= 'f')
    )
  }

  function processValueStart(char: string, i: number, swapState: string) {
    switch (char) {
      case '"': {
        lastValidIndex = i
        stack.pop()
        stack.push(swapState)
        stack.push('INSIDE_STRING')
        break
      }
      case 'f':
      case 't':
      case 'n': {
        lastValidIndex = i
        literalStart = i
        stack.pop()
        stack.push(swapState)
        stack.push('INSIDE_LITERAL')
        break
      }
      case '-': {
        stack.pop()
        stack.push(swapState)
        stack.push('INSIDE_NUMBER')
        break
      }
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9': {
        lastValidIndex = i
        stack.pop()
        stack.push(swapState)
        stack.push('INSIDE_NUMBER')
        break
      }
      case '{': {
        lastValidIndex = i
        stack.pop()
        stack.push(swapState)
        stack.push('INSIDE_OBJECT_START')
        break
      }
      case '[': {
        lastValidIndex = i
        stack.pop()
        stack.push(swapState)
        stack.push('INSIDE_ARRAY_START')
        break
      }
    }
  }

  function processAfterObjectValue(char: string, i: number) {
    switch (char) {
      case ',': {
        stack.pop()
        stack.push('INSIDE_OBJECT_AFTER_COMMA')
        break
      }
      case '}': {
        lastValidIndex = i
        stack.pop()
        break
      }
    }
  }

  function processAfterArrayValue(char: string, i: number) {
    switch (char) {
      case ',': {
        stack.pop()
        stack.push('INSIDE_ARRAY_AFTER_COMMA')
        break
      }
      case ']': {
        lastValidIndex = i
        stack.pop()
        break
      }
    }
  }

  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    const currentState = stack[stack.length - 1]

    switch (currentState) {
      case 'ROOT':
        processValueStart(char, i, 'FINISH')
        break
      case 'INSIDE_OBJECT_START': {
        switch (char) {
          case '"': {
            stack.pop()
            stack.push('INSIDE_OBJECT_KEY')
            break
          }
          case '}': {
            lastValidIndex = i
            stack.pop()
            break
          }
        }
        break
      }
      case 'INSIDE_OBJECT_AFTER_COMMA': {
        switch (char) {
          case '"': {
            stack.pop()
            stack.push('INSIDE_OBJECT_KEY')
            break
          }
        }
        break
      }
      case 'INSIDE_OBJECT_KEY': {
        switch (char) {
          case '"': {
            stack.pop()
            stack.push('INSIDE_OBJECT_AFTER_KEY')
            break
          }
          case '\\': {
            stack.push('INSIDE_STRING_ESCAPE')
            break
          }
        }
        break
      }
      case 'INSIDE_OBJECT_AFTER_KEY': {
        switch (char) {
          case ':': {
            stack.pop()
            stack.push('INSIDE_OBJECT_BEFORE_VALUE')
            break
          }
        }
        break
      }
      case 'INSIDE_OBJECT_BEFORE_VALUE': {
        processValueStart(char, i, 'INSIDE_OBJECT_AFTER_VALUE')
        break
      }
      case 'INSIDE_OBJECT_AFTER_VALUE': {
        processAfterObjectValue(char, i)
        break
      }
      case 'INSIDE_STRING': {
        switch (char) {
          case '"': {
            stack.pop()
            lastValidIndex = i
            break
          }
          case '\\': {
            stack.push('INSIDE_STRING_ESCAPE')
            break
          }
          default: {
            lastValidIndex = i
          }
        }
        break
      }
      case 'INSIDE_ARRAY_START': {
        switch (char) {
          case ']': {
            lastValidIndex = i
            stack.pop()
            break
          }
          default: {
            lastValidIndex = i
            processValueStart(char, i, 'INSIDE_ARRAY_AFTER_VALUE')
            break
          }
        }
        break
      }
      case 'INSIDE_ARRAY_AFTER_VALUE': {
        switch (char) {
          case ',': {
            stack.pop()
            stack.push('INSIDE_ARRAY_AFTER_COMMA')
            break
          }
          case ']': {
            lastValidIndex = i
            stack.pop()
            break
          }
          default: {
            lastValidIndex = i
            break
          }
        }
        break
      }
      case 'INSIDE_ARRAY_AFTER_COMMA': {
        processValueStart(char, i, 'INSIDE_ARRAY_AFTER_VALUE')
        break
      }
      case 'INSIDE_STRING_ESCAPE': {
        stack.pop()
        if (char === 'u') {
          unicodeEscapeDigits = 0
          stack.push('INSIDE_STRING_UNICODE_ESCAPE')
        } else {
          lastValidIndex = i
        }
        break
      }
      case 'INSIDE_STRING_UNICODE_ESCAPE': {
        if (isHexDigit(char)) {
          unicodeEscapeDigits++
          if (unicodeEscapeDigits === 4) {
            stack.pop()
            lastValidIndex = i
          }
        }
        break
      }
      case 'INSIDE_NUMBER': {
        switch (char) {
          case '0':
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
          case '6':
          case '7':
          case '8':
          case '9': {
            lastValidIndex = i
            break
          }
          case 'e':
          case 'E':
          case '-':
          case '.': {
            break
          }
          case ',': {
            stack.pop()
            if (stack[stack.length - 1] === 'INSIDE_ARRAY_AFTER_VALUE') {
              processAfterArrayValue(char, i)
            }
            if (stack[stack.length - 1] === 'INSIDE_OBJECT_AFTER_VALUE') {
              processAfterObjectValue(char, i)
            }
            break
          }
          case '}': {
            stack.pop()
            if (stack[stack.length - 1] === 'INSIDE_OBJECT_AFTER_VALUE') {
              processAfterObjectValue(char, i)
            }
            break
          }
          case ']': {
            stack.pop()
            if (stack[stack.length - 1] === 'INSIDE_ARRAY_AFTER_VALUE') {
              processAfterArrayValue(char, i)
            }
            break
          }
          default: {
            stack.pop()
            break
          }
        }
        break
      }
      case 'INSIDE_LITERAL': {
        const partialLiteral = input.substring(literalStart ?? 0, i + 1)
        if (
          !'false'.startsWith(partialLiteral) &&
          !'true'.startsWith(partialLiteral) &&
          !'null'.startsWith(partialLiteral)
        ) {
          stack.pop()
          if (stack[stack.length - 1] === 'INSIDE_OBJECT_AFTER_VALUE') {
            processAfterObjectValue(char, i)
          } else if (stack[stack.length - 1] === 'INSIDE_ARRAY_AFTER_VALUE') {
            processAfterArrayValue(char, i)
          }
        } else {
          lastValidIndex = i
        }
        break
      }
    }
  }

  let result = input.slice(0, lastValidIndex + 1)
  for (let i = stack.length - 1; i >= 0; i--) {
    const state = stack[i]
    switch (state) {
      case 'INSIDE_STRING': {
        result += '"'
        break
      }
      case 'INSIDE_OBJECT_KEY':
      case 'INSIDE_OBJECT_AFTER_KEY':
      case 'INSIDE_OBJECT_AFTER_COMMA':
      case 'INSIDE_OBJECT_START':
      case 'INSIDE_OBJECT_BEFORE_VALUE':
      case 'INSIDE_OBJECT_AFTER_VALUE': {
        result += '}'
        break
      }
      case 'INSIDE_ARRAY_START':
      case 'INSIDE_ARRAY_AFTER_COMMA':
      case 'INSIDE_ARRAY_AFTER_VALUE': {
        result += ']'
        break
      }
      case 'INSIDE_LITERAL': {
        const partialLiteral = input.substring(literalStart ?? 0, input.length)
        if ('true'.startsWith(partialLiteral)) {
          result += 'true'.slice(partialLiteral.length)
        } else if ('false'.startsWith(partialLiteral)) {
          result += 'false'.slice(partialLiteral.length)
        } else if ('null'.startsWith(partialLiteral)) {
          result += 'null'.slice(partialLiteral.length)
        }
        break
      }
    }
  }
  return result
}

function parsePartialJsonSync(jsonText: string): unknown {
  if (!jsonText) return undefined
  try {
    return JSON.parse(jsonText)
  } catch {
    try {
      const repaired = fixPartialJson(jsonText)
      return JSON.parse(repaired)
    } catch {
      return undefined
    }
  }
}

function stripCodeFencesAndExtractJson(rawText: string): string {
  if (!rawText) return ''
  let text = rawText.trim()

  // Remove markdown code fences (```json ... ``` or ``` ... ```)
  const fenceMatch = text.match(/^```(?:json)?\s*\n?([\s\S]*?)(?:\n?```\s*)?$/i)
  if (fenceMatch && text.startsWith('```')) {
    text = fenceMatch[1].trim()
  }

  const firstBrace = text.indexOf('{')
  const firstBracket = text.indexOf('[')

  let startIdx = -1
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket)
  } else if (firstBrace !== -1) {
    startIdx = firstBrace
  } else if (firstBracket !== -1) {
    startIdx = firstBracket
  }

  if (startIdx === -1) {
    return ''
  }

  return text.substring(startIdx).trim()
}

export function parseSimpleList(rawText: string, isComplete = false): string[] {
  void isComplete
  if (!rawText || !rawText.trim()) return []

  const jsonCandidate = stripCodeFencesAndExtractJson(rawText)
  if (jsonCandidate) {
    const parsed = parsePartialJsonSync(jsonCandidate)
    if (parsed !== undefined && parsed !== null) {
      const items = extractSimpleListItems(parsed)
      if (items.length > 0) {
        return items
      }
      // If it's an in-progress empty JSON structure like `{"items": [` return empty array rather than noise
      if (typeof parsed === 'object') {
        return []
      }
    }
  }

  return fallbackParseSimpleList(rawText)
}

export function parseKeyValueList(
  rawText: string,
  isComplete = false
): Array<{ label: string; description: string }> {
  void isComplete
  if (!rawText || !rawText.trim()) return []

  const jsonCandidate = stripCodeFencesAndExtractJson(rawText)
  if (jsonCandidate) {
    const parsed = parsePartialJsonSync(jsonCandidate)
    if (parsed !== undefined && parsed !== null) {
      const items = extractKeyValueItems(parsed)
      if (items.length > 0) {
        return items
      }
      if (typeof parsed === 'object') {
        return []
      }
    }
  }

  return fallbackParseKeyValueList(rawText)
}

function extractSimpleListItems(parsed: unknown): string[] {
  let rawItems: unknown[] = []

  if (Array.isArray(parsed)) {
    rawItems = parsed
  } else if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>
    if (Array.isArray(obj.items)) {
      rawItems = obj.items
    } else if (Array.isArray(obj.list)) {
      rawItems = obj.list
    }
  }

  return rawItems
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (typeof item === 'number' || typeof item === 'boolean') return String(item).trim()
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>
        const candidate = obj.item ?? obj.text ?? obj.label ?? obj.value ?? ''
        return String(candidate).trim()
      }
      return ''
    })
    .filter((item) => item.length > 0)
}

function extractKeyValueItems(parsed: unknown): Array<{ label: string; description: string }> {
  if (Array.isArray(parsed)) {
    return mapKeyValueArray(parsed)
  }

  if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>
    if ('items' in obj) {
      if (Array.isArray(obj.items)) {
        return mapKeyValueArray(obj.items)
      }
      return []
    }

    // Flat object {"word1": "desc1", "word2": "desc2"}
    return Object.entries(obj)
      .map(([key, val]) => ({
        label: String(key).trim(),
        description: typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean'
          ? String(val).trim()
          : '',
      }))
      .filter((entry) => entry.label.length > 0 || entry.description.length > 0)
  }

  return []
}

function mapKeyValueArray(arr: unknown[]): Array<{ label: string; description: string }> {
  return arr
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return { label: '', description: '' }
      }
      const obj = item as Record<string, unknown>
      const label = String(obj.label ?? obj.key ?? obj.word ?? obj.term ?? '').trim()
      const description = String(
        obj.description ?? obj.value ?? obj.meaning ?? obj.explanation ?? ''
      ).trim()
      return { label, description }
    })
    .filter((entry) => entry.label.length > 0 || entry.description.length > 0)
}

function fallbackParseSimpleList(rawText: string): string[] {
  const lines = rawText.split('\n')
  const results: string[] = []

  for (let line of lines) {
    line = line.trim()
    if (!line) continue
    if (
      line.startsWith('```') ||
      line === '{' ||
      line === '}' ||
      line === '[' ||
      line === ']' ||
      /^"?items"?\s*:\s*\[?$/i.test(line)
    ) {
      continue
    }

    // Strip list markers (-, *, •, 1., 1))
    line = line.replace(/^([-*•]|\d+[.)])\s+/, '').trim()
    if (line.endsWith(',')) {
      line = line.slice(0, -1).trim()
    }
    if ((line.startsWith('"') && line.endsWith('"')) || (line.startsWith("'") && line.endsWith("'"))) {
      line = line.slice(1, -1).trim()
    }
    if (line && line !== '{' && line !== '}' && line !== '[' && line !== ']') {
      results.push(line)
    }
  }

  return results
}

function fallbackParseKeyValueList(rawText: string): Array<{ label: string; description: string }> {
  const lines = rawText.split('\n')
  const results: Array<{ label: string; description: string }> = []

  for (let line of lines) {
    line = line.trim()
    if (!line) continue
    if (
      line.startsWith('```') ||
      line === '{' ||
      line === '}' ||
      line === '[' ||
      line === ']' ||
      /^"?items"?\s*:\s*\[?$/i.test(line)
    ) {
      continue
    }

    // Strip list markers (-, *, •, 1., 1))
    line = line.replace(/^([-*•]|\d+[.)])\s+/, '').trim()

    // Match `- **label**: description`, `**label**：description`, or `label: description`
    const match = line.match(/^(?:\*\*(.+?)\*\*|__(.+?)__|([^:：]+?))\s*[:：]\s*(.+)$/)
    if (match) {
      const rawLabel = (match[1] ?? match[2] ?? match[3] ?? '').trim()
      const label = rawLabel.replace(/^\*\*|\*\*$/g, '').replace(/^__|__$/g, '').trim()
      const description = (match[4] ?? '').trim()
      if (label || description) {
        results.push({ label, description })
      }
    }
  }

  return results
}
