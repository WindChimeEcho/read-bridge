import type { FormattedBook } from '../types/book'
import { detectLanguage } from '../utils/franc'

export function initTXTBook(buffer: Buffer, name: string): FormattedBook {
  const content = decodeText(buffer).replace(/\r\n?/g, '\n')

  return {
    metadata: {
      title: name,
      language: detectLanguage(content.slice(0, 1000)),
    },
    chapterList: [{
      title: name,
      paragraphs: content.split('\n'),
    }],
  }
}

function decodeText(buffer: Buffer): string {
  const bytes = new Uint8Array(buffer)

  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2))
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2))
  }

  const utf8Bytes = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
    ? bytes.subarray(3)
    : bytes

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(utf8Bytes)
  } catch {
    return new TextDecoder('gb18030').decode(bytes)
  }
}
