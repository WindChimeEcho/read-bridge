import MarkdownIt from 'markdown-it'
import * as cheerio from 'cheerio'
import type { FormattedBook, PlainTextChapter } from '../types/book'
import { detectLanguage } from '../utils/franc'

export function initMDBook(buffer: Buffer, name: string): FormattedBook {
  const source = buffer.toString('utf-8')
  const tokens = new MarkdownIt().parse(source, {})
  const chapters: PlainTextChapter[] = []
  let bookTitle = name
  let hasExplicitTitle = false
  let currentChapter: PlainTextChapter = { title: name, paragraphs: [] }

  const startChapter = (title: string) => {
    if (currentChapter.paragraphs.length > 0) chapters.push(currentChapter)
    currentChapter = { title, paragraphs: [] }
  }

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]

    if (token.type === 'heading_open') {
      const heading = tokens[index + 1]?.content.trim() ?? ''

      if (token.tag === 'h1' && heading && !hasExplicitTitle) {
        bookTitle = heading
        hasExplicitTitle = true
        if (chapters.length === 0 && currentChapter.paragraphs.length === 0) {
          currentChapter.title = heading
        }
      } else if (token.tag === 'h2' && heading) {
        startChapter(heading)
      } else if (heading) {
        currentChapter.paragraphs.push(heading)
      }

      index += 2
      continue
    }

    if (token.type === 'paragraph_open') {
      addParagraph(currentChapter, tokens[index + 1]?.content)
      index += 2
      continue
    }

    if (token.type === 'fence' || token.type === 'code_block') {
      addParagraph(currentChapter, token.content)
      continue
    }

    if (token.type === 'html_block') {
      addParagraph(currentChapter, cheerio.load(token.content).text())
      continue
    }

    if (token.type === 'inline') {
      addParagraph(currentChapter, token.content)
    }
  }

  if (currentChapter.paragraphs.length > 0 || chapters.length === 0) {
    chapters.push(currentChapter)
  }

  return {
    metadata: {
      title: bookTitle,
      language: detectLanguage(source.slice(0, 1000)),
    },
    chapterList: chapters,
  }
}

function addParagraph(chapter: PlainTextChapter, content?: string) {
  const text = content?.trim()
  if (text) chapter.paragraphs.push(text)
}
