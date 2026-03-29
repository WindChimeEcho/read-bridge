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

  // 将h3和h4转换为普通段落
  $('h3, h4, h5').each((_, elem) => {
    const content = $(elem).html() || ''
    $(elem).replaceWith(`<p>${content}</p>`)
  })

  const chapterList: PlainTextChapter[] = []

  // 找到所有h2元素
  const h2Elements = $('h2')

  if (h2Elements.length === 0) {
    // 如果没有h2元素，将整个内容作为一个章节
    const content = $('body').html() || ''
    // 把HTML内容转换为段落数组
    const paragraphs = extractParagraphs($, content)

    chapterList.push({
      title: title,
      paragraphs
    })
  } else {
    // 检查第一个h2之前的内容（保留文章开头的引言/前言）
    const $bodyChildren = $('body').children()
    const firstH2Index = $bodyChildren.index(h2Elements.first())
    if (firstH2Index > 0) {
      const beforeH2 = $bodyChildren.slice(0, firstH2Index)
      const content = beforeH2.map((_, el) => $.html(el)).get().join('')
      const paragraphs = extractParagraphs($, content)
      if (paragraphs.length > 0) {
        chapterList.push({
          title: title || '引言',
          paragraphs
        })
      }
    }

    // 根据h2元素分割内容
    h2Elements.each((_, elem) => {
      const chapterTitle = $(elem).text()
      let content = ''

      // 获取当前h2元素
      const $elem = $(elem)

      // 获取当前h2到下一个h2之间的内容
      let $nextAll = $elem.nextAll()
      let $nextH2 = $nextAll.filter('h2').first()

      if ($nextH2.length > 0) {
        // 获取到下一个h2之前的所有元素
        let $contents = $nextAll.slice(0, $nextAll.index($nextH2))
        content = $contents.map((_, el) => $.html(el)).get().join('')
      } else {
        // 如果没有下一个h2，获取当前h2后面的所有内容
        content = $nextAll.map((_, el) => $.html(el)).get().join('')
      }

      // 把HTML内容转换为段落数组
      const paragraphs = extractParagraphs($, content)

      chapterList.push({
        title: chapterTitle,
        paragraphs
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
