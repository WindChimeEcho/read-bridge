import * as cheerio from 'cheerio';

import type { AnyNode } from 'domhandler';
import { unzipSync, strFromU8 } from 'fflate';

import type { FormattedBook, ChapterBody, Metadata } from '@/types/book';


interface EpubManifestItem {
  id: string;
  href: string;
  mediaType: string;
}

type EpubSpineBody = string[];

type EpubManifestBody = EpubManifestItem[];


/**
 * 初始化 Epub 书籍
 * @param buffer - Epub 文件的 Buffer 对象
 * @returns 格式化后的书籍对象 {
 *  metadata: Metadata,
 *  chapterList: ChapterBody[]
 * }
 */
export function initEpubBook(buffer: Buffer): FormattedBook {
  if (!isValidEpub(buffer)) {
    throw new Error('Invalid EPUB format');
  }

  const unzipped = unzipSync(new Uint8Array(buffer));

  const containerXML = strFromU8(unzipped['META-INF/container.xml'])
  const $container = cheerio.load(containerXML, { xml: true })
  const fullPath = $container('rootfile').attr('full-path')

  if (!fullPath) {
    throw new Error('Full path not found')
  }

  const $content = cheerio.load(strFromU8(unzipped[fullPath]), { xml: true })

  const $metadata = $content('metadata:first')
  const metadata = initMetadata($metadata)
  console.log(metadata)

  const $manifest = $content('manifest')
  const manifest = initManifest($manifest)

  const $spine = $content('spine')
  const spine = initSpine($spine)


  const sortChapters: EpubManifestBody = spine.map((id) => {
    const item = manifest.find((item) => item.id === id)
    if (!item) {
      throw new Error(`Manifest item not found: ${id}`)
    }
    return item
  })

  const chapterXMLs = sortChapters.map((item) => {
    const possiblePrefixes = ['OEBPS/', 'EPUB/', '']
    let contentXML = ''

    for (const prefix of possiblePrefixes) {
      const fullPath = prefix + item.href
      if (fullPath in unzipped) {
        contentXML = strFromU8(unzipped[fullPath])
        break
      }
    }

    if (contentXML === '') {
      throw new Error(`Content file not found: ${item.href}`)
    }

    return contentXML
  })

  const chapterList: ChapterBody[] = []
  for (const item of chapterXMLs) {
    const $ = cheerio.load(item, { xml: true })
    const title = $('h1').text()
    if (!title || title === '') continue
    const lines: string[] = []
    $('p').each((_, p) => {
      const text = $(p).text()
      if (text.trim() !== '') {
        lines.push(text)
      }
    })
    chapterList.push({
      title,
      lines
    })
  }

  return {
    metadata: metadata as FormattedBook['metadata'],
    chapterList
  }
}

function initMetadata($metadata: cheerio.Cheerio<AnyNode>): Metadata {
  const metaTags = {
    title: ['dc\\:title', 'title'],
    author: ['dc\\:creator', 'creator'],
    publisher: ['dc\\:publisher', 'publisher'],
    date: ['dc\\:date', 'date'],
    rights: ['dc\\:rights', 'rights'],
    identifier: ['dc\\:identifier', 'identifier'],
    language: ['dc\\:language', 'language']
  };
  function getMetaTag(metaTags: string[]): string {
    for (const tag of metaTags) {
      const metaTag = $metadata.find(tag)
      if (metaTag.length > 0) {
        return metaTag.text()
      }
    }
    return ''
  }

  return {
    title: getMetaTag(metaTags.title),
    author: getMetaTag(metaTags.author),
    publisher: getMetaTag(metaTags.publisher),
    date: getMetaTag(metaTags.date),
    rights: getMetaTag(metaTags.rights),
    identifier: getMetaTag(metaTags.identifier),
    language: getMetaTag(metaTags.language),
  }
}

function initManifest($manifest: cheerio.Cheerio<AnyNode>): EpubManifestBody {
  const items: EpubManifestBody = [];

  $manifest.find('item').each((_, element) => {
    const id = element.attribs['id'];
    const href = element.attribs['href'];
    const mediaType = element.attribs['media-type'];

    if (id && href && mediaType) {
      items.push({ id, href, mediaType });
    }
  });

  // 只返回 HTML/XHTML 类型的内容
  return items.filter(item =>
    item.mediaType.includes('application/xhtml+xml') ||
    item.mediaType.includes('text/html')
  );
}

function initSpine($spine: cheerio.Cheerio<AnyNode>): EpubSpineBody {
  const spineItems: string[] = [];

  $spine.find('itemref').each((_, element) => {
    const idref = element.attribs['idref'];
    if (idref) {
      spineItems.push(idref);
    }
  });

  return spineItems;
}

function isValidEpub(buffer: Buffer): boolean {
  const signature = buffer.subarray(0, 4).toString('hex');
  if (signature !== '504b0304') {
    return false;
  }
  return true;
}
