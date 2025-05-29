// import crypto from 'crypto';

import { BOOK_MIME_TYPE } from '@/constants/book';
import type { BOOK_MIME_TYPE_TYPE } from '@/types/book';
import { UPLOAD_CONFIG } from '@/constants/upload';

import { processBook } from '@/services/BookService';

/**
 * 处理上传的书籍文件
 * @param file 文件数据（Buffer）
 * @param fileName 文件名
 * @param fileType 文件类型 (MIME类型，如 'application/epub+zip')
 * @returns 处理后的书籍对象
 * @throws 如果文件格式无效、文件过大或处理过程中出错
 */
export async function handleFileUpload(
  file: File
) {
  if (!file) {
    console.error('No file uploaded');
    throw new Error('No file uploaded');
  }
  const { name, size, type } = file

  if (!isValidBookFormat(type)) {
    console.error('Invalid file format', type);
    throw new Error('Invalid file format');
  }

  if (size > UPLOAD_CONFIG.MAX_SIZE) {
    console.error('File size too large', size);
    throw new Error('File size too large');
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // 替换 Node.js 的 crypto 哈希计算
  // const hash = crypto.createHash('sha256').update(buffer).digest('hex')
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  const nameWithoutExt = name.replace(/\.[^/.]+$/, '');

  // 进行书籍初始化
  try {
    const book = await processBook(buffer, type, nameWithoutExt, hash);
    return book;
  } catch (error) {
    console.error('Error processing book', error);
    if (error instanceof Error) throw error;
    throw new Error(String(error));
  }
}

function isValidBookFormat(format: string): format is BOOK_MIME_TYPE_TYPE {
  return Object.values(BOOK_MIME_TYPE).includes(format as BOOK_MIME_TYPE_TYPE);
} 