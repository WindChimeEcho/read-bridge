import MarkdownIt from 'markdown-it'
import * as cheerio from 'cheerio';
import { FormattedBook, PlainTextChapter } from "@/types/book";
import { detectLanguage } from '@/utils/franc';

export function initMDBook(buffer: Buffer, name: string): FormattedBook {
  const md = new MarkdownIt()
  const mdString = buffer.toString()
  const html = md.render(mdString)
  const $ = cheerio.load(html)
  const title = $('h1').text() || name
  const language = detectLanguage(mdString.slice(0, 500))

  const chapterList: PlainTextChapter[] = []

  // 找到所有顶层标题元素 (h1~h6)
  const headingElements = $('body > h1, body > h2, body > h3, body > h4, body > h5, body > h6')

  if (headingElements.length === 0) {
    // 如果没有标题元素，将整个内容作为一个章节
    const content = $('body').html() || ''
    // 把HTML内容转换为段落数组
    const paragraphs = extractParagraphs($, content)

    chapterList.push({
      title: title,
      paragraphs,
      level: 1
    })
  } else {
    // 检查第一个标题之前的内容（保留文章开头的引言/前言）
    const $bodyChildren = $('body').children()
    const firstHeadingIndex = $bodyChildren.index(headingElements.first())
    if (firstHeadingIndex > 0) {
      const beforeHeading = $bodyChildren.slice(0, firstHeadingIndex)
      const content = beforeHeading.map((_, el) => $.html(el)).get().join('')
      const paragraphs = extractParagraphs($, content)
      if (paragraphs.length > 0) {
        chapterList.push({
          title: title || '引言',
          paragraphs,
          level: 1
        })
      }
    }

    // 根据标题元素分割内容
    headingElements.each((_, elem) => {
      const chapterTitle = $(elem).text()
      const level = parseInt(elem.tagName.replace(/h/i, ''), 10) || 1
      let content = ''

      // 获取当前标题元素
      const $elem = $(elem)

      // 获取当前标题到下一个顶层标题之间的内容
      let $nextAll = $elem.nextAll()
      let $nextHeading = $nextAll.filter('h1, h2, h3, h4, h5, h6').first()

      if ($nextHeading.length > 0) {
        // 获取到下一个标题之前的所有元素
        let $contents = $nextAll.slice(0, $nextAll.index($nextHeading))
        content = $contents.map((_, el) => $.html(el)).get().join('')
      } else {
        // 如果没有下一个标题，获取当前标题后面的所有内容
        content = $nextAll.map((_, el) => $.html(el)).get().join('')
      }

      // 把HTML内容转换为段落数组
      const paragraphs = extractParagraphs($, content)

      chapterList.push({
        title: chapterTitle,
        paragraphs,
        level
      })
    })
  }

  return {
    metadata: {
      title,
      language: language
    },
    chapterList
  }
}

/**
 * 从HTML内容中提取段落
 */
function extractParagraphs($: cheerio.CheerioAPI, htmlContent: string): string[] {
  const $content = cheerio.load(htmlContent)
  const paragraphs: string[] = []

  $content('body').children().each((_, elem) => {
    const tagName = elem.tagName

    if (tagName === 'h1' || tagName === 'h2') {
      return // 跳过（章节分割用）
    }

    // 保留原始HTML供MarkdownRenderer渲染，比如表格和代码块
    if (tagName === 'table' || tagName === 'pre') {
      const html = $content(elem).prop('outerHTML') || $content.html(elem)
      if (html) {
        paragraphs.push(`![MD]${html}`)
      }
      return
    }

    let currentText = ''
    const flushText = () => {
      const t = currentText.trim()
      if (t) paragraphs.push(t)
      currentText = ''
    }

    const traverse = (node: any) => {
      if (node.type === 'text') {
        currentText += node.data
      } else if (node.type === 'tag' && node.tagName === 'br') {
        currentText += '\n'
      } else if (node.type === 'tag' && node.tagName === 'img') {
        flushText()
        const src = node.attribs?.src
        const alt = node.attribs?.alt || ''
        if (src) {
          paragraphs.push(`![IMG]${alt ? alt + '|' : ''}${src}`)
        }
      } else if (node.type === 'tag') {
        if (node.children) {
          node.children.forEach(traverse)
        }
      }
    }

    traverse(elem)
    flushText()
  })

  return paragraphs
}
