'use client';

import { useBookshelf } from '@/hooks/useBook';
import BookGrid from '@/app/components/BookGrid';

export default function Home() {
  const { books } = useBookshelf();
  return (
    <div className='p-2 w-full h-full'>
      <BookGrid books={books} />
    </div>
  );
}
