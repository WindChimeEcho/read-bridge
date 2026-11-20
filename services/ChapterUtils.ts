import type { Book, PlainTextChapter } from '@/types/book'

export function reorderChapters(book: Book, sourceIndex: number, destinationIndex: number): Book {
  const count = book.chapterList.length
  if (
    sourceIndex === destinationIndex ||
    sourceIndex < 0 ||
    destinationIndex < 0 ||
    sourceIndex >= count ||
    destinationIndex >= count
  ) {
    return book
  }

  const normalizedChapters = book.toc.length === count
    ? book.toc.map(tocItem => book.chapterList[tocItem.index] ?? { title: tocItem.title, paragraphs: [] })
    : [...book.chapterList]

  const [moved] = normalizedChapters.splice(sourceIndex, 1)
  normalizedChapters.splice(destinationIndex, 0, moved)

  return {
    ...book,
    chapterList: normalizedChapters,
    toc: normalizedChapters.map((chapter, index) => ({
      title: chapter.title,
      index,
    })),
  }
}

export function addChapter(book: Book, title: string): { book: Book; newIndex: number } {
  const newChapter: PlainTextChapter = {
    title,
    paragraphs: [],
  }
  const chapterList = [...book.chapterList, newChapter]
  const newIndex = chapterList.length - 1
  return {
    newIndex,
    book: {
      ...book,
      chapterList,
      toc: chapterList.map((chapter, index) => ({
        title: chapter.title,
        index,
      })),
    },
  }
}

export function deleteChapter(book: Book, chapterIndex: number): Book | null {
  if (book.chapterList.length <= 1) return null
  if (chapterIndex < 0 || chapterIndex >= book.chapterList.length) return null

  const chapterList = book.chapterList.filter((_, index) => index !== chapterIndex)
  return {
    ...book,
    chapterList,
    toc: chapterList.map((chapter, index) => ({
      title: chapter.title,
      index,
    })),
  }
}

export function renameChapter(book: Book, chapterIndex: number, title: string): Book {
  if (chapterIndex < 0 || chapterIndex >= book.chapterList.length) return book

  const chapterList = book.chapterList.map((chapter, index) => (
    index === chapterIndex ? { ...chapter, title } : chapter
  ))
  return {
    ...book,
    chapterList,
    toc: chapterList.map((chapter, index) => ({
      title: chapter.title,
      index,
    })),
  }
}

export function updateChapterParagraphs(book: Book, chapterIndex: number, paragraphs: string[]): Book {
  if (chapterIndex < 0 || chapterIndex >= book.chapterList.length) return book

  const chapterList = book.chapterList.map((chapter, index) => (
    index === chapterIndex ? { ...chapter, paragraphs } : chapter
  ))
  return {
    ...book,
    chapterList,
  }
}
