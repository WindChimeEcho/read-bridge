import { BOOK_MIME_TYPE } from '@/constants/book';
import type { BOOK_MIME_TYPE_TYPE } from '@/types/book';
import { UPLOAD_CONFIG } from '@/constants/upload';
import { processBook } from '@/services/BookService';
import { sha256Hex } from '@/utils/hash';

/**
 * 处理上传的书籍文件
 * @param file 上传的书籍 File 对象
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
  const { name, size } = file;
  const type = getBookMimeType(file);

  if (!type) {
    console.error('Invalid file format', file.type);
    throw new Error('Invalid file format');
  }

  if (size === 0) {
    console.error('File is empty or could not be read', name);
    throw new Error('File is empty or could not be read');
  }

  if (size > UPLOAD_CONFIG.MAX_SIZE) {
    console.error('File size too large', size);
    throw new Error('File size too large');
  }

  const bytes = await readFileAsArrayBuffer(file);
  if (bytes.byteLength === 0) {
    console.error('File content is empty', name);
    throw new Error('File is empty or could not be read');
  }
  const buffer = Buffer.from(bytes);
  const hash = await sha256Hex(bytes);

  const nameWithoutExt = name.replace(/\.[^/.]+$/, '');

  try {
    const book = await processBook(buffer, type, nameWithoutExt, hash);
    return book;
  } catch (error) {
    console.error('Error processing book', error);
    if (error instanceof Error) throw error;
    throw new Error(String(error));
  }
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as ArrayBuffer'));
      }
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read file'));
    };
    reader.readAsArrayBuffer(file);
  });
}

function getBookMimeType(file: File): BOOK_MIME_TYPE_TYPE | null {
  const dotIndex = file.name.lastIndexOf('.');
  if (dotIndex < 0) return null;
  const extension = file.name.slice(dotIndex + 1).toLowerCase();

  switch (extension) {
    case 'epub':
      return BOOK_MIME_TYPE.EPUB_ZIP;
    case 'txt':
      return BOOK_MIME_TYPE.TXT;
    case 'md':
      return BOOK_MIME_TYPE.MD;
    default:
      return null;
  }
}
