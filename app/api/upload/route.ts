import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import { BOOK_FORMAT } from '@/constants/book';
import type { BOOK_FORMAT_TYPE } from '@/types/book';
import { UPLOAD_CONFIG } from '@/constants/upload';

import { initBook } from '@/services/BookService';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const { name, size, type } = file
  const format = type.split('/')[1];

  if (!isValidBookFormat(format)) {
    return NextResponse.json({ error: 'Invalid file format' }, { status: 400 });
  }

  if (size > UPLOAD_CONFIG.MAX_SIZE) {
    return NextResponse.json({ error: 'File size too large' }, { status: 400 });
  }
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex')
  const nameWithoutExt = name.replace(/\.[^/.]+$/, '');

  // 进行书籍初始化
  await initBook(nameWithoutExt, format, hash, size, buffer)
  // 返回处理结果
  return NextResponse.json({
    success: true,
    filename: file.name,
    size: file.size
  });
}

function isValidBookFormat(format: string): format is BOOK_FORMAT_TYPE {
  return Object.values(BOOK_FORMAT).includes(format as BOOK_FORMAT_TYPE);
}