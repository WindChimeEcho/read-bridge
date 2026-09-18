import { BOOK_FORMAT, BOOK_MIME_TYPE } from '@/constants/book';

export type BOOK_FORMAT_TYPE = typeof BOOK_FORMAT[keyof typeof BOOK_FORMAT];
export type BOOK_MIME_TYPE_TYPE = typeof BOOK_MIME_TYPE[keyof typeof BOOK_MIME_TYPE];
export interface Resource {
  data: string;    // base64
  mediaType: string;
}

export interface Metadata {
  title: string; // 书名
  author?: string; // 作者
  publisher?: string; // 出版社
  date?: string; // 出版日期
  rights?: string; // 版权信息
  identifier?: string; // 图书唯一标识符
  language: string; // 语言代码
  cover?: Resource;
  [key: string]: string | undefined | Resource;
}

export interface FormattedBook {
  metadata: Metadata
  chapterList: PlainTextChapter[]
}

export interface PlainTextChapter {
  title: string;
  paragraphs: string[];
}
interface TocItem {
  title: string;
  index: number;
}

export interface Book {
  id: string;
  title: string;
  author?: string;
  fileHash: string;
  createTime: number;
  chapterList: PlainTextChapter[];
  toc: TocItem[];
  metadata: Metadata;
}

export interface BookPreview {
  id: string;
  title: string;
  author?: string;
  cover?: Resource;
}

export interface ReadingProgress {
  bookId: string;
  lastReadTime: number;
  currentLocation: {
    chapterIndex: number;
    lineIndex: number;
  };
  sentenceChapters: {
    [chapterIndex: number]: string[];
  }
  sentenceFormatVersion?: number;
}

export type Bookmark = {
  id: string;
  bookId: string;
  sentence: string;
  createTime: string;
  chapterIndex: number;
  lineIndex: number;
}
