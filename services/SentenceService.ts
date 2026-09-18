import { sentences as splitEnglishSentences } from 'sbd'

export const SENTENCE_FORMAT_VERSION = 2

export function paragraphsToLines(paragraphs: string[], language?: string): string[] {
  return paragraphs.flatMap(paragraph => {
    const sentences = splitIntoSentences(paragraph, language)
    return sentences.length > 0 ? [...sentences, ''] : ['']
  })
}

export function splitIntoSentences(text: string, language?: string): string[] {
  const input = text.trim()
  if (!input) return []

  if (language?.toLowerCase().startsWith('en')) {
    return splitEnglishSentences(input, { preserve_whitespace: false })
      .map(sentence => sentence.trim())
      .filter(Boolean)
  }

  if (typeof Intl.Segmenter === 'function') {
    try {
      const segmenter = new Intl.Segmenter(normalizeLocale(language), { granularity: 'sentence' })
      return Array.from(segmenter.segment(input), item => item.segment.trim()).filter(Boolean)
    } catch {
      // Invalid or unsupported locale: use the locale-neutral fallback below.
    }
  }

  return input.match(/[^.!?。！？]+(?:[.!?。！？]+[”’"']?|$)/g)?.map(sentence => sentence.trim()).filter(Boolean)
    ?? [input]
}

function normalizeLocale(language?: string): string | undefined {
  if (!language || language === 'und') return undefined
  return language.replace('_', '-')
}
