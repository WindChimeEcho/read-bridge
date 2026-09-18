// web only

import Dexie, { Table } from 'dexie'
import { Book, BookPreview, ReadingProgress } from '@/types/book'
import { paragraphsToLines, SENTENCE_FORMAT_VERSION } from '@/services/SentenceService'

const DB_SEARCH_KEYS = ['&id', 'title', 'fileHash', 'author', 'createTime', 'lastReadTime', 'metadata.identifier', 'metadata.language']
const READING_PROGRESS_KEYS = ['&bookId', 'lastReadTime', 'currentLocation']
class BookDB extends Dexie {
  books!: Table<Book>
  readingProgress!: Table<ReadingProgress>

  constructor() {
    super('book-reader')
    this.version(1).stores({
      books: DB_SEARCH_KEYS.join(','),
      readingProgress: READING_PROGRESS_KEYS.join(',')
    })
  }
  /**
   * 添加新书
   * @throws {Error} 当书已存在时抛出异常
   * @returns 返回新增书籍的id 
   */
  async addBook(book: Book): Promise<string> {
    const exists = await this.books
      .where('fileHash')
      .equals(book.fileHash)
      .first()

    if (exists) {
      throw new Error('Book already exists')
    }
    const id = await this.books.add(book)
    await this.addReadingProgress(id)
    return id
  }

  /**
   * 获取书籍
   * @param id 书籍id
   * @returns 书籍 || null
   */
  async getBook(id: string): Promise<Book | null> {
    return (await this.books.get(id)) ?? null
  }

  // /**
  //  * 获取阅读进度
  //  * @param bookId 书籍id
  //  * @returns 阅读进度 || null
  //  */
  // async getReadingProgress(bookId: string): Promise<ReadingProgress | null> {

  // }

  /**
   * 获取所有书籍
   * @returns 所有书籍
   */
  async getAllBooks(reverse = true): Promise<Book[]> {
    const books = await this.books.toArray()

    const bookIds = books.map(book => book.id)
    const readingProgressList = await this.readingProgress
      .where('bookId')
      .anyOf(bookIds)
      .toArray()

    const lastReadTimeMap = new Map<string, number>()
    readingProgressList.forEach(progress => {
      lastReadTimeMap.set(progress.bookId, progress.lastReadTime)
    })

    return books.sort((a, b) => {
      const timeA = lastReadTimeMap.get(a.id) ?? a.createTime ?? 0
      const timeB = lastReadTimeMap.get(b.id) ?? b.createTime ?? 0
      return reverse ? timeB - timeA : timeA - timeB
    })
  }

  /**
   * 获取所有书籍预览
   * @returns 所有书籍预览liveQuery
   */
  async getAllBooksPreview(): Promise<BookPreview[]> {
    const books = await this.getAllBooks()
    return new Promise((resolve) => {
      resolve(getBookPreview(books))
    })

  }

  /**
   * 按字段查询书籍
   * @param type Book 对象的键名
   * @param value 查询值
   * @param reverse 是否倒序
   * @returns 按最后阅读时间(当没阅读过则使用创建时间)返回
   */
  async getBooks(type: typeof DB_SEARCH_KEYS[number], value: string, reverse = true): Promise<Book[]> {
    const books = await this.books
      .where(type)
      .equals(value)
      .toArray()

    const bookIds = books.map(book => book.id)
    const readingProgressList = await this.readingProgress
      .where('bookId')
      .anyOf(bookIds)
      .toArray()

    const lastReadTimeMap = new Map<string, number>()
    readingProgressList.forEach(progress => {
      lastReadTimeMap.set(progress.bookId, progress.lastReadTime)
    })

    return books.sort((a, b) => {
      const timeA = lastReadTimeMap.get(a.id) ?? a.createTime ?? 0
      const timeB = lastReadTimeMap.get(b.id) ?? b.createTime ?? 0
      return reverse ? timeB - timeA : timeA - timeB
    })
  }

  /**
   * 按字段查询书籍预览 
   * @param type Book 对象的键名
   * @param value 查询值
   * @param reverse 是否倒序
   * @returns 按最后阅读时间(当没阅读过则使用创建时间)返回liveQuery
   */
  async getBooksPreview(type: typeof DB_SEARCH_KEYS[number], value: string, reverse = true): Promise<BookPreview[]> {
    const books = (await this.getBooks(type, value, reverse)) || []
    return new Promise((resolve) => {
      resolve(getBookPreview(books))
    })
  }

  /**
   * 更新书籍信息
   * @param id Book id
   * @param book 更新的书籍信息
   * @throws {Error} 当书籍不存在时抛出异常
   * @returns {Promise<void>}
   */
  async updateBook(id: string, book: Book): Promise<void> {
    if (book.id !== id) {
      throw new Error('Book id mismatch')
    }

    const exists = await this.books.get(id)
    if (!exists) {
      throw new Error('Book not found')
    }

    await this.books.put(book)

    if (JSON.stringify(exists.chapterList) !== JSON.stringify(book.chapterList)) {
      await this.readingProgress.update(id, {
        currentLocation: { chapterIndex: 0, lineIndex: 0 },
        sentenceChapters: {},
        sentenceFormatVersion: SENTENCE_FORMAT_VERSION,
      })
    }
  }
  /**
   * 更新书籍的单个字段
   * @param id Book id
   * @param type 要更新的字段
   * @param value 新的值
   * @throws {Error} 当书籍不存在时抛出异常
   * @returns {Promise<void>}
   */
  async updateBookField<K extends keyof Book>(
    id: string,
    type: K,
    value: Book[K]
  ): Promise<void> {
    const exists = await this.books.get(id)
    if (!exists) {
      throw new Error('Book not found')
    }

    await this.books.update(id, { [type]: value } as Partial<Book>)
  }

  /**
   * 删除书籍
   * @param id Book id
   * @throws {Error} 当书籍不存在时抛出异常
   * @returns {Promise<void>}
   */
  async deleteBook(id: string): Promise<void> {
    const exists = await this.books.get(id)
    if (!exists) {
      throw new Error('Book not found')
    }

    await this.books.delete(id)
    await this.readingProgress.delete(id)
  }

  /**
   * 添加书籍阅读信息
   * @param readingProgress 书籍阅读信息
   * @returns {Promise<void>}
   */
  async addReadingProgress(bookId: string): Promise<ReadingProgress> {
    const exists = await this.readingProgress.get(bookId)
    if (exists) return exists
    else {
      const defaultReadingProgress: ReadingProgress = {
        bookId,
        lastReadTime: Date.now(),
        currentLocation: {
          chapterIndex: 0,
          lineIndex: 0
        },
        sentenceChapters: {},
        sentenceFormatVersion: SENTENCE_FORMAT_VERSION,
      }
      await this.readingProgress.add(defaultReadingProgress)
      return defaultReadingProgress
    }
  }

  /**
   * 重置书籍阅读信息
   * @param bookId 书籍id
   * @returns {Promise<void>}
   * @throws {Error} 当阅读信息不存在时抛出异常
   */
  async resetReadingProgress(bookId: string): Promise<void> {
    try {
      await this.readingProgress.delete(bookId)
    } catch (error) {
      console.error('Error in resetReadingProgress:' + error)
    } finally {
      await this.addReadingProgress(bookId)
    }
  }
  /**
   * 删除书籍阅读信息
   * @param bookId 书籍id
   * @returns {Promise<void>}
   */
  async deleteReadingProgress(bookId: string): Promise<void> {
    const exists = await this.readingProgress.get(bookId)
    if (!exists) return
    await this.readingProgress.delete(bookId)
  }
  /**
   * 更新书籍阅读位置
   * @param bookId 书籍id
   * @param currentLocation 阅读位置
   * @returns {Promise<void>}
   * @throws {Error} 当阅读位置不存在时抛出异常
   */
  async updateCurrentLocation(bookId: string, currentLocation: ReadingProgress['currentLocation']): Promise<void> {
    const exists = await this.readingProgress.get(bookId)
    if (!exists) {
      throw new Error('Reading progress not found')
    }
    await this.readingProgress.update(bookId, {
      currentLocation,
      lastReadTime: Date.now()
    })
    await this.updateSentenceChapters(bookId, { ...exists, currentLocation })
  }
  /**
   * 获取最后阅读时间
   * @param bookId 书籍id
   * @returns {Promise<number>} 最后阅读时间 || 0
   */
  async getLastReadTime(bookId: string): Promise<number> {
    const readingProgress = await this.readingProgress.get(bookId)
    if (!!readingProgress) return readingProgress.lastReadTime ?? 0
    else return 0
  }
  /**
   * 获取阅读位置
   * @param bookId 书籍id
   * @returns {Promise<ReadingProgress['currentLocation']>} 阅读位置
   * @throws {Error} 当阅读位置不存在时抛出异常
   */
  async getCurrentLocation(bookId: string): Promise<ReadingProgress> {
    const readingProgress = await this.readingProgress.get(bookId)
    if (!readingProgress) throw new Error('Reading progress not found')
    try {
      await this.updateSentenceChapters(bookId, readingProgress)
      const updatedProgress = await this.readingProgress.get(bookId)
      if (updatedProgress) return updatedProgress
      else throw new Error('Reading progress not found')
    } catch (error) {
      throw new Error("Error in getCurrentLocation:" + error)
    }
  }
  /**
   * 更新sentenceChapters
   * 
   */
  async updateSentenceChapters(bookId: string, readingProgress: ReadingProgress): Promise<void> {
    const { chapterIndex } = readingProgress.currentLocation
    const sentenceChapters = readingProgress.sentenceChapters
    if (sentenceChapters[chapterIndex]) return

    const book = await this.getBook(bookId)
    if (!book) throw new Error('Book not found')
    const chapter = book.chapterList[chapterIndex]
    if (!chapter) throw new Error(`Chapter not found: ${chapterIndex}`)

    const lines = paragraphsToLines(chapter.paragraphs, book.metadata.language)
    const update: Partial<ReadingProgress> = {
      sentenceChapters: { ...sentenceChapters, [chapterIndex]: lines },
    }
    if (readingProgress.sentenceFormatVersion === SENTENCE_FORMAT_VERSION) {
      update.sentenceFormatVersion = SENTENCE_FORMAT_VERSION
    }
    await this.readingProgress.update(bookId, update)
  }
}

function getBookPreview(books: Book[]): BookPreview[] {
  return books.map(book => ({
    id: book.id,
    title: book.title,
    author: book.author,
    cover: book.metadata.cover
  }))
}

const db = new BookDB()

export default db
