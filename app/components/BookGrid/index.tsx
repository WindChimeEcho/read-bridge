'use client';

import { Row, Col, Button } from 'antd';
import { BookPreview, Resource } from '@/types/book';
import { formatCoverDataUrl } from '@/utils/book';
import BookUploader from '@/app/components/BookUploader';
import { useStyleStore } from '@/store/useStyleStore';
import { useRouter } from 'next/navigation';
import { useSiderStore } from '@/store/useSiderStore';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useState } from 'react';
import BookDetailsModal from '@/app/components/BookDetailsModal';

interface BookGridProps {
  books: BookPreview[];
}

export default function BookGrid({ books }: BookGridProps) {
  const { itemsPerRow, gutterX, gutterY } = useStyleStore()
  const router = useRouter();
  const { setReadingId } = useSiderStore()
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<string>('');

  const onBookClick = (id: string) => {
    setReadingId(id)
    router.push(`/read`);
  }

  const showDetailsModal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedBookId(id);
    setDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setDetailsModalOpen(false);
  };

  return (
    <div className="w-full">
      <Row gutter={[gutterX, gutterY]}>
        {books.map((book) => (
          <Col key={book.id} span={24 / itemsPerRow}>
            <div className="cursor-pointer">
              <div className="aspect-[3/4] w-full overflow-hidden" onClick={() => onBookClick(book.id)}>
                <BookCover cover={book.cover} title={book.title} />
              </div>
              <div className="mt-2 text-center">
                <div className="font-medium truncate">{book.title}</div>
                <div className="flex items-center justify-center">
                  {book.author && (
                    <div className="text-sm text-gray-500 truncate">{book.author}</div>
                  )}
                  <Button
                    type="text"
                    size="small"
                    icon={<InfoCircleOutlined />}
                    onClick={(e) => showDetailsModal(book.id, e)}
                  />
                </div>
              </div>
            </div>
          </Col>
        ))}
        <Col span={24 / itemsPerRow}>
          <div className="aspect-[3/4] w-full">
            <BookUploader />
          </div>
        </Col>
      </Row>

      <BookDetailsModal
        open={detailsModalOpen}
        onClose={closeDetailsModal}
        bookId={selectedBookId}
      />
    </div>
  );
}

const BookCover = ({ cover, title }: { cover: Resource | undefined, title: string }) => {
  const coverSrc = formatCoverDataUrl(cover);
  const imageCSS = `
    w-full
    h-full
    rounded-lg
  `
  const noCoverCSS = `
    w-full
    h-full
    flex
    items-center
    justify-center
    border
    border-[var(--ant-color-border)]
    rounded-lg
    bg-[var(--ant-color-bg-elevated)]
    dark:bg-[var(--ant-color-bg-elevated)]
  `
  return (
    coverSrc ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img className={imageCSS} src={coverSrc} alt={title} />
    ) : (
      <div className={noCoverCSS}>
        No Cover
      </div>
    )
  )
}
