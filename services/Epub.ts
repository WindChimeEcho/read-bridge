import * as cheerio from 'cheerio'
import type { AnyNode } from 'domhandler'
import { strFromU8, unzipSync, type Unzipped } from 'fflate'
import type { FormattedBook, Metadata, PlainTextChapter, Resource } from '../types/book'

type ManifestItem = {
  id: string
  href: string
  mediaType: string
  properties: string
}

export function initEpubBook(buffer: Buffer): FormattedBook {
  const archive = openEpubArchive(buffer)
  const packagePath = readPackagePath(archive)
  const packageDocument = readArchiveText(archive, packagePath)
  const $package = cheerio.load(packageDocument, { xml: true })
  const manifest = readManifest($package('manifest').first())
  const metadata = readMetadata($package('metadata').first(), archive, packagePath, manifest)
  const chapterList = readChapters($package, archive, packagePath, manifest)

  if (chapterList.length === 0) {
    throw new Error('EPUB does not contain readable chapters')
  }

  return { metadata, chapterList }
}

function openEpubArchive(buffer: Buffer): Unzipped {
  if (buffer.subarray(0, 4).toString('hex') !== '504b0304') {
    throw new Error('Invalid EPUB format')
  }

  try {
    const archive = unzipSync(new Uint8Array(buffer))
    if (!archive['META-INF/container.xml']) {
      throw new Error('EPUB container.xml is missing')
    }
    return archive
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error('Unable to open EPUB archive')
  }
}

function readPackagePath(archive: Unzipped): string {
  const container = readArchiveText(archive, 'META-INF/container.xml')
  const $ = cheerio.load(container, { xml: true })
  const path = $('rootfile').first().attr('full-path')
  if (!path) throw new Error('EPUB package path is missing')
  return normalizeArchivePath(path)
}

function readManifest($manifest: cheerio.Cheerio<AnyNode>): ManifestItem[] {
  return $manifest.find('item').map((_, element) => ({
    id: element.attribs.id ?? '',
    href: element.attribs.href ?? '',
    mediaType: element.attribs['media-type'] ?? '',
    properties: element.attribs.properties ?? '',
  })).get().filter(item => item.id && item.href)
}

function readChapters(
  $package: cheerio.CheerioAPI,
  archive: Unzipped,
  packagePath: string,
  manifest: ManifestItem[]
): PlainTextChapter[] {
  const manifestById = new Map(manifest.map(item => [item.id, item]))
  const chapterItems = $package('spine itemref').map((_, element) => (
    manifestById.get(element.attribs.idref)
  )).get().filter((item): item is ManifestItem => Boolean(item))

  return chapterItems.flatMap((item, index) => {
    if (!isHtml(item.mediaType)) return []
    const chapterPath = resolveArchivePath(packagePath, item.href)
    const document = readArchiveText(archive, chapterPath)
    const chapter = parseChapter(document, index + 1)
    return chapter.paragraphs.length > 0 ? [chapter] : []
  })
}

function parseChapter(document: string, chapterNumber: number): PlainTextChapter {
  const $ = cheerio.load(document, { xml: true })
  const title = normalizeText($('h1').first().text())
    || normalizeText($('title').first().text())
    || normalizeText($('h2').first().text())
    || `Chapter ${chapterNumber}`
  const paragraphs: string[] = []

  $('body').find('p, li, blockquote, pre, h3, h4, h5, h6').each((_, element) => {
    const $element = $(element)
    if ($element.parents('p, li, blockquote, pre').length > 0) return
    const text = normalizeText($element.text())
    if (text) paragraphs.push(text)
  })

  if (paragraphs.length === 0) {
    const bodyText = normalizeText($('body').text())
    if (bodyText) paragraphs.push(bodyText)
  }

  return { title, paragraphs }
}

function readMetadata(
  $metadata: cheerio.Cheerio<AnyNode>,
  archive: Unzipped,
  packagePath: string,
  manifest: ManifestItem[]
): Metadata {
  const value = (...selectors: string[]) => {
    for (const selector of selectors) {
      const text = normalizeText($metadata.find(selector).first().text())
      if (text) return text
    }
    return ''
  }

  return {
    title: value('dc\\:title', 'title') || 'Untitled',
    author: value('dc\\:creator', 'creator'),
    publisher: value('dc\\:publisher', 'publisher'),
    date: value('dc\\:date', 'date'),
    rights: value('dc\\:rights', 'rights'),
    identifier: value('dc\\:identifier', 'identifier'),
    language: value('dc\\:language', 'language'),
    cover: readCover($metadata, archive, packagePath, manifest),
  }
}

function readCover(
  $metadata: cheerio.Cheerio<AnyNode>,
  archive: Unzipped,
  packagePath: string,
  manifest: ManifestItem[]
): Resource | undefined {
  const legacyCoverId = $metadata.find('meta[name="cover"]').attr('content')
  const coverItem = manifest.find(item => item.properties.split(/\s+/).includes('cover-image'))
    ?? manifest.find(item => item.id === legacyCoverId)
    ?? manifest.find(item => item.mediaType.startsWith('image/') && /cover/i.test(item.href))

  if (!coverItem) return undefined
  const bytes = archive[resolveArchivePath(packagePath, coverItem.href)]
  if (!bytes) return undefined

  return {
    data: Buffer.from(bytes).toString('base64'),
    mediaType: coverItem.mediaType,
  }
}

function readArchiveText(archive: Unzipped, path: string): string {
  const bytes = archive[normalizeArchivePath(path)]
  if (!bytes) throw new Error(`EPUB resource is missing: ${path}`)
  return strFromU8(bytes)
}

function resolveArchivePath(packagePath: string, href: string): string {
  const cleanHref = decodeHref(href).split('#')[0].split('?')[0]
  const baseDirectory = packagePath.split('/').slice(0, -1)
  return normalizeArchivePath([...baseDirectory, ...cleanHref.split('/')].join('/'))
}

function normalizeArchivePath(path: string): string {
  const segments: string[] = []
  for (const segment of path.replace(/\\/g, '/').split('/')) {
    if (!segment || segment === '.') continue
    if (segment === '..') segments.pop()
    else segments.push(segment)
  }
  return segments.join('/')
}

function decodeHref(href: string): string {
  try {
    return decodeURIComponent(href)
  } catch {
    return href
  }
}

function isHtml(mediaType: string): boolean {
  return mediaType === 'application/xhtml+xml' || mediaType === 'text/html'
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}
