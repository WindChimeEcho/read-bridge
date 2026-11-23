import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { strToU8, zipSync } from 'fflate'
import { initEpubBook } from '../services/Epub'
import { initMDBook } from '../services/MD'
import { handleFileUpload } from '../services/ServerUpload'
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

  it('strips UTF-8 BOM from Markdown files before parsing H1 title', () => {
    const bomMarkdown = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from('# Fixture Book\n\n## Chapter One\n\nHello world.', 'utf-8'),
    ])

    const book = initMDBook(bomMarkdown, 'fallback')
    expect(book.metadata.title).toBe('Fixture Book')
    expect(book.chapterList).toEqual([
      {
        title: 'Chapter One',
        paragraphs: ['Hello world.'],
      },
    ])
  })

  it('extracts EPUB chapters and cover image while skipping interior media assets', () => {
    const coverBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
    const opfWithCover = `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">readbridge-cover-fixture</dc:identifier>
    <dc:title>EPUB With Assets</dc:title>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="cover" href="../images/cover.png" media-type="image/png" properties="cover-image" />
    <item id="interior-img" href="../images/interior.jpg" media-type="image/jpeg" />
    <item id="font" href="../fonts/book.woff2" media-type="font/woff2" />
    <item id="chapter-1" href="../text/chapter-1.xhtml" media-type="application/xhtml+xml" />
  </manifest>
  <spine>
    <itemref idref="chapter-1" />
  </spine>
</package>`

    const archive = zipSync({
      mimetype: strToU8('application/epub+zip'),
      'META-INF/container.xml': new Uint8Array(fixture('epub-nested/META-INF/container.xml')),
      'EPUB/package/content.opf': strToU8(opfWithCover),
      'EPUB/text/chapter-1.xhtml': new Uint8Array(fixture('epub-nested/EPUB/text/chapter-1.xhtml')),
      'EPUB/images/cover.png': coverBytes,
      'EPUB/images/interior.jpg': new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
      'EPUB/fonts/book.woff2': new Uint8Array([0x77, 0x4f, 0x46, 0x32]),
    })

    const book = initEpubBook(Buffer.from(archive))
    expect(book.metadata.title).toBe('EPUB With Assets')
    expect(book.metadata.cover).toEqual({
      data: Buffer.from(coverBytes).toString('base64'),
      mediaType: 'image/png',
    })
    expect(book.chapterList).toHaveLength(1)
  })

  it('imports an EPUB File with empty iOS MIME type and rejects 0-byte files', async () => {
    const archive = zipSync({
      mimetype: strToU8('application/epub+zip'),
      'META-INF/container.xml': new Uint8Array(fixture('epub-nested/META-INF/container.xml')),
      'EPUB/package/content.opf': new Uint8Array(fixture('epub-nested/EPUB/package/content.opf')),
      'EPUB/text/chapter-1.xhtml': new Uint8Array(fixture('epub-nested/EPUB/text/chapter-1.xhtml')),
    })

    const iosFile = new File([new Uint8Array(archive)], 'nested.epub', { type: '' })
    const imported = await handleFileUpload(iosFile)
    expect(imported.title).toBe('Nested EPUB Fixture')
    expect(imported.chapterList).toHaveLength(1)

    const emptyFile = new File([], 'placeholder.epub', { type: '' })
    await expect(handleFileUpload(emptyFile)).rejects.toThrow(/empty/i)
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
