'use client'

import BookGrid from '@/app/components/BookGrid'
import { useBookshelf } from '@/hooks/useBook'

export default function DesktopHome() {
  const { books } = useBookshelf()

  return (
    <div className="p-2 w-full h-full">
      <BookGrid books={books} />
    </div>
  )
}
