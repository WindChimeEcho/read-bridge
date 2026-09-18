import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { strToU8, zipSync } from 'fflate'
import { initEpubBook } from '../services/Epub'
import { initMDBook } from '../services/MD'
import { initTXTBook } from '../services/TXT'
import { paragraphsToLines, splitIntoSentences } from '../services/SentenceService'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/books/${name}`, import.meta.url))

describe('book import', () => {
  it('keeps Markdown blocks in source order and preserves the preface', () => {
    const book = initMDBook(fixture('markdown-block-order.md'), 'fallback title')

    expect(book.metadata.title).toBe('Fixture Book')
    expect(book.chapterList).toEqual([
      {
        title: 'Fixture Book',
        paragraphs: ['Preface paragraph before the first chapter.', 'Preface list item'],
      },
      {
        title: 'Chapter One',
        paragraphs: [
          'First paragraph.',
          'A quotation between paragraphs.',
          'Second paragraph.',
          'First chapter item',
          'Second chapter item',
        ],
      },
      {
        title: 'Chapter Two',
        paragraphs: ['Final paragraph without extra markup.'],
      },
    ])
  })

  it('resolves EPUB resources relative to the package document and keeps untitled chapters', () => {
    const archive = zipSync({
      mimetype: strToU8('application/epub+zip'),
      'META-INF/container.xml': new Uint8Array(fixture('epub-nested/META-INF/container.xml')),
      'EPUB/package/content.opf': new Uint8Array(fixture('epub-nested/EPUB/package/content.opf')),
      'EPUB/text/chapter-1.xhtml': new Uint8Array(fixture('epub-nested/EPUB/text/chapter-1.xhtml')),
    })

    const book = initEpubBook(Buffer.from(archive))

    expect(book.metadata.title).toBe('Nested EPUB Fixture')
    expect(book.chapterList).toEqual([{
      title: 'Chapter 1',
      paragraphs: [
        'This chapter deliberately has no heading.',
        'Its text must still be imported.',
      ],
    }])
  })

  it('detects UTF-16 text files from their byte-order mark', () => {
    const utf16 = Buffer.concat([
      Buffer.from([0xff, 0xfe]),
      Buffer.from('First line\nSecond line', 'utf16le'),
    ])

    expect(initTXTBook(utf16, 'UTF-16').chapterList[0].paragraphs).toEqual([
      'First line',
      'Second line',
    ])
  })
})

describe('sentence segmentation', () => {
  it('preserves a Chinese tail without terminal punctuation', () => {
    expect(splitIntoSentences('这是第一句。这里是没有句末标点的尾句', 'zh')).toEqual([
      '这是第一句。',
      '这里是没有句末标点的尾句',
    ])
  })

  it('does not split common English abbreviations', () => {
    expect(splitIntoSentences('Dr. Smith arrived at 3 p.m. He brought a book without a final period', 'en')).toEqual([
      'Dr. Smith arrived at 3 p.m.',
      'He brought a book without a final period',
    ])
  })

  it('keeps an empty line between source paragraphs', () => {
    expect(paragraphsToLines(['First. Second.', 'Third.'], 'en')).toEqual([
      'First.',
      'Second.',
      '',
      'Third.',
      '',
    ])
  })
})
