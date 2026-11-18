export interface ThinkStreamSnapshot {
  content: string
  reasoning: string
  contentChanged: boolean
  reasoningChanged: boolean
}

export interface ThinkStreamParser {
  addReasoningDelta: (delta: string) => ThinkStreamSnapshot
  addTextDelta: (delta: string) => ThinkStreamSnapshot
  finish: () => ThinkStreamSnapshot
  getState: () => { content: string; reasoning: string }
}

const THINK_TAGS = [
  { open: '<think>', close: '</think>' },
  { open: '<thinking>', close: '</thinking>' },
  { open: '<thought>', close: '</thought>' },
] as const

function isOpenTagPrefix(str: string): boolean {
  const lower = str.toLowerCase()
  for (const tag of THINK_TAGS) {
    if (tag.open.startsWith(lower) && lower !== tag.open) return true
  }
  return false
}

function isCloseTagPrefix(str: string): boolean {
  const lower = str.toLowerCase()
  for (const tag of THINK_TAGS) {
    if (tag.close.startsWith(lower) && lower !== tag.close) return true
  }
  return false
}

function findAnyOpenTag(str: string): { index: number; tag: (typeof THINK_TAGS)[number] } | null {
  const lower = str.toLowerCase()
  let bestIdx = -1
  let bestTag: (typeof THINK_TAGS)[number] | null = null
  for (const tag of THINK_TAGS) {
    const idx = lower.indexOf(tag.open)
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
      bestIdx = idx
      bestTag = tag
    }
  }
  return bestIdx === -1 || !bestTag ? null : { index: bestIdx, tag: bestTag }
}

function findAnyCloseTag(str: string): { index: number; tag: (typeof THINK_TAGS)[number] } | null {
  const lower = str.toLowerCase()
  let bestIdx = -1
  let bestTag: (typeof THINK_TAGS)[number] | null = null
  for (const tag of THINK_TAGS) {
    const idx = lower.indexOf(tag.close)
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
      bestIdx = idx
      bestTag = tag
    }
  }
  return bestIdx === -1 || !bestTag ? null : { index: bestIdx, tag: bestTag }
}

export function createThinkStreamParser(): ThinkStreamParser {
  let content = ''
  let reasoning = ''
  let inThink = false
  let pendingBuffer = ''
  let needReasoningSeparator = false

  const appendToReasoning = (text: string): boolean => {
    if (!text) return false
    if (needReasoningSeparator && reasoning.length > 0 && !reasoning.endsWith('\n') && !text.startsWith('\n')) {
      reasoning += '\n'
    }
    needReasoningSeparator = false
    reasoning += text
    return true
  }

  return {
    addReasoningDelta(delta: string): ThinkStreamSnapshot {
      let reasoningChanged = false
      if (delta) {
        reasoning += delta
        reasoningChanged = true
      }
      return {
        content,
        reasoning,
        contentChanged: false,
        reasoningChanged,
      }
    },

    addTextDelta(delta: string): ThinkStreamSnapshot {
      if (!delta) {
        return { content, reasoning, contentChanged: false, reasoningChanged: false }
      }

      let contentChanged = false
      let reasoningChanged = false

      pendingBuffer += delta

      while (pendingBuffer.length > 0) {
        const current = pendingBuffer

        if (!inThink) {
          const openMatch = findAnyOpenTag(current)
          const closeMatch = findAnyCloseTag(current)

          let targetMatch: { index: number; type: 'open' | 'close'; tag: (typeof THINK_TAGS)[number] } | null = null
          if (openMatch && closeMatch) {
            targetMatch = openMatch.index <= closeMatch.index
              ? { index: openMatch.index, type: 'open', tag: openMatch.tag }
              : { index: closeMatch.index, type: 'close', tag: closeMatch.tag }
          } else if (openMatch) {
            targetMatch = { index: openMatch.index, type: 'open', tag: openMatch.tag }
          } else if (closeMatch) {
            targetMatch = { index: closeMatch.index, type: 'close', tag: closeMatch.tag }
          }

          if (targetMatch) {
            const beforeTag = current.substring(0, targetMatch.index)
            const tagLen = targetMatch.type === 'open' ? targetMatch.tag.open.length : targetMatch.tag.close.length
            pendingBuffer = current.substring(targetMatch.index + tagLen)

            if (targetMatch.type === 'open') {
              if (beforeTag) {
                content += beforeTag
                contentChanged = true
              }
              if (reasoning.length > 0) {
                needReasoningSeparator = true
              }
              inThink = true
            } else {
              // Orphan closing tag automatic backtracking:
              // Move all accumulated content + text before closing tag into reasoning
              const hadContent = content.length > 0
              const backtrackText = content + beforeTag
              if (reasoning.length > 0) {
                needReasoningSeparator = true
              }
              if (appendToReasoning(backtrackText)) {
                reasoningChanged = true
              }
              content = ''
              if (hadContent) {
                contentChanged = true
              }
              inThink = false
            }
            continue
          }

          // Check if pendingBuffer ends with any prefix of an open or close tag
          let matchedPrefixLen = 0
          for (let i = 1; i <= current.length; i++) {
            const suffix = current.substring(current.length - i)
            if (isOpenTagPrefix(suffix) || isCloseTagPrefix(suffix)) {
              matchedPrefixLen = i
            }
          }

          const safeLen = current.length - matchedPrefixLen
          if (safeLen > 0) {
            const safeText = current.substring(0, safeLen)
            content += safeText
            contentChanged = true
            pendingBuffer = current.substring(safeLen)
          }
          break
        } else {
          // inThink === true
          const closeMatch = findAnyCloseTag(current)
          const openMatch = findAnyOpenTag(current)

          let targetMatch: { index: number; type: 'open' | 'close'; tag: (typeof THINK_TAGS)[number] } | null = null
          if (openMatch && closeMatch) {
            targetMatch = closeMatch.index <= openMatch.index
              ? { index: closeMatch.index, type: 'close', tag: closeMatch.tag }
              : { index: openMatch.index, type: 'open', tag: openMatch.tag }
          } else if (closeMatch) {
            targetMatch = { index: closeMatch.index, type: 'close', tag: closeMatch.tag }
          } else if (openMatch) {
            targetMatch = { index: openMatch.index, type: 'open', tag: openMatch.tag }
          }

          if (targetMatch) {
            const beforeTag = current.substring(0, targetMatch.index)
            if (appendToReasoning(beforeTag)) {
              reasoningChanged = true
            }

            const tagLen = targetMatch.type === 'close' ? targetMatch.tag.close.length : targetMatch.tag.open.length
            pendingBuffer = current.substring(targetMatch.index + tagLen)

            if (targetMatch.type === 'close') {
              inThink = false
            } else {
              inThink = true
            }
            continue
          }

          // Check if pendingBuffer ends with any prefix of a close or open tag
          let matchedPrefixLen = 0
          for (let i = 1; i <= current.length; i++) {
            const suffix = current.substring(current.length - i)
            if (isCloseTagPrefix(suffix) || isOpenTagPrefix(suffix)) {
              matchedPrefixLen = i
            }
          }

          const safeLen = current.length - matchedPrefixLen
          if (safeLen > 0) {
            const safeText = current.substring(0, safeLen)
            if (appendToReasoning(safeText)) {
              reasoningChanged = true
            }
            pendingBuffer = current.substring(safeLen)
          }
          break
        }
      }

      return {
        content,
        reasoning,
        contentChanged,
        reasoningChanged,
      }
    },

    finish(): ThinkStreamSnapshot {
      let contentChanged = false
      let reasoningChanged = false

      if (pendingBuffer) {
        if (inThink) {
          if (appendToReasoning(pendingBuffer)) {
            reasoningChanged = true
          }
        } else {
          content += pendingBuffer
          contentChanged = true
        }
        pendingBuffer = ''
      }

      return {
        content,
        reasoning,
        contentChanged,
        reasoningChanged,
      }
    },

    getState() {
      return { content, reasoning }
    },
  }
}
