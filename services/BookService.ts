import { BOOK_MIME_TYPE } from '@/constants/book';
import type { BOOK_MIME_TYPE_TYPE, FormattedBook } from '@/types/book';

import { initEpubBook } from '@/services/Epub';
import { initTXTBook } from '@/services/TXT';

import type { Book } from '@/types/book';
import { initMDBook } from './MD';
import { generateUUID } from '@/utils/uuid'
/**
 * 处理书籍
 * @param buffer 书籍文件
 * @param format 书籍格式
 * @param name 书籍名称
 * @param hash 书籍哈希值
 * @returns 完成处理书籍
 * @throws 
 */
export async function processBook(buffer: Buffer, type: BOOK_MIME_TYPE_TYPE, name: string, hash: string): Promise<Book> {
  let initFile: FormattedBook | null = null
  console.log(type, 'type')
  try {
    switch (type) {
      case BOOK_MIME_TYPE.EPUB:
        initFile = initEpubBook(buffer)
        break
      case BOOK_MIME_TYPE.EPUB_ZIP:
        initFile = initEpubBook(buffer)
        break
      case BOOK_MIME_TYPE.TXT:
        initFile = initTXTBook(buffer, name)
        break
      case BOOK_MIME_TYPE.MD:
        initFile = initMDBook(buffer, name)
        break
      default:
        throw new Error(`Unsupported book format: ${type}`)
    }
  } catch (error) {
    if (error instanceof Error) throw error
    throw new Error(String(error))
  }
  if (!initFile) {
    throw new Error('Failed to initialize book')
  }
  const book = createBookModel(initFile, hash)
  return book
}

function createBookModel(formattedBook: FormattedBook, hash: string): Book {
  return {
    id: generateUUID(),
    fileHash: hash,
    createTime: Date.now(),
    title: formattedBook.metadata.title,
    author: formattedBook.metadata.author,
    chapterList: formattedBook.chapterList,
    toc: formattedBook.chapterList.map((chapter, index) => ({
      title: chapter.title,
      index,
      level: chapter.level || 1
    })),
    metadata: formattedBook.metadata
  }
}