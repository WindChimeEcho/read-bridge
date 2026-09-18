'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import { Modal, Button, Typography, Divider, Popconfirm, message } from 'antd';
import { DeleteOutlined, EditOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Book, Resource } from '@/types/book';
import db from '@/services/DB';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/i18n/useTranslation';
import BookAddOrEditModal from '../BookAddOrEditModal';
import { useReadingProgressStore } from '@/store/useReadingProgress';
import { useBook } from '@/hooks/useBook';
import { useSiderStore } from '@/store/useSiderStore';

const { Title, Text } = Typography;

interface BookDetailsModalProps {
  open: boolean;
  onClose: () => void;
  bookId: string;
}

const BookDetailsModal: FC<BookDetailsModalProps> = ({
  open,
  onClose,
  bookId,
}) => {
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const router = useRouter();
  const { readingId, setReadingId } = useSiderStore()
  const { updateReadingProgress } = useReadingProgressStore()
  const [, , updateBook] = useBook()
  const { t } = useTranslation();

  // Fetch book details when modal opens
  useEffect(() => {
    if (open && bookId) {
      setLoading(true);
      db.getBook(bookId)
        .then(async (fetchedBook) => {
          setBook(fetchedBook);
        })
        .catch((error) => {
          console.error('Error fetching book:', error);
          message.error(t('common.templates.loadFailed', { entity: t('common.entities.bookDetails') }));
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, bookId, t]);

  // Helper function to handle base64 image data
  const handleBase64 = useCallback((cover: Resource) => {
    return `data:${cover.mediaType};base64,${cover.data}`;
  }, []);

  const handleDelete = async () => {
    if (!bookId) return;

    try {
      setLoading(true);
      await db.deleteBook(bookId);

      message.success(t('common.templates.deleteSuccess', { entity: t('common.entities.bookGeneric') }));
      if (bookId === readingId) setReadingId(null)
      await updateBook()
      onClose();
      // Force a refresh of the home page
      router.refresh();
    } catch (error) {
      console.error('Error deleting book:', error);
      message.error(t('common.templates.deleteFailed', { entity: t('common.entities.bookGeneric') }));
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = useCallback(() => {
    if (!book) {
      message.error(t('common.templates.loadFailed', { entity: t('common.entities.bookDetails') }));
      return;
    }
    setEditModalOpen(true);
  }, [book, t]);

  const getBookForEdit = useCallback(() => {
    if (!book) throw new Error(t('common.templates.loadFailed', { entity: t('common.entities.bookDetails') }));
    return {
      ...book,
    };
  }, [book, t]);

  const handleEditSubmit = useCallback(async (updatedBook: Book) => {
    const currentBook = getBookForEdit();
    if (!currentBook) {
      message.error(t('common.templates.loadFailed', { entity: t('common.entities.bookDetails') }));
      return;
    }

    try {
      setLoading(true);
      await db.updateBook(bookId, {
        ...currentBook,
        ...updatedBook,
      });
      // 更新本地数据
      setBook(prev => prev ? { ...prev, ...updatedBook } : null);
      setEditModalOpen(false);
      message.success(t('common.templates.updateSuccess', { entity: t('common.entities.bookGeneric') }));
      router.refresh();
    } catch (error) {
      console.error('Error updating book:', error);
      message.error(t('common.templates.updateFailed', { entity: t('common.entities.bookGeneric') }));
    } finally {
      setLoading(false);
      if (readingId === bookId) await updateReadingProgress(bookId)
      await updateBook()
      onClose();
    }
  }, [bookId, router, t, getBookForEdit, onClose, readingId, updateBook, updateReadingProgress]);

  const renderDetailedView = () => (
    <div className="space-y-4">
      <div className="flex gap-4">
        {book?.metadata?.cover && (
          <div className="w-1/4 aspect-[3/4] overflow-hidden rounded-lg">
            <img
              src={handleBase64(book.metadata.cover)}
              alt={book?.title || t('bookDetails.unknownTitle')}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex-1">
          <Title level={3}>{book?.title || t('bookDetails.unknownTitle')}</Title>
          {book?.author && <Text type="secondary" className="block">{t('bookDetails.author')}: {book.author}</Text>}
          {book?.metadata?.language && <Text type="secondary" className="block">{t('bookDetails.language')}: {book.metadata.language}</Text>}
          {book?.metadata?.publisher && <Text type="secondary" className="block">{t('bookDetails.publisher')}: {book.metadata.publisher}</Text>}
          {book?.createTime && (
            <Text type="secondary" className="block">
              {t('bookDetails.added')}: {new Date(book.createTime).toLocaleDateString()}
            </Text>
          )}
        </div>
      </div>

      <Divider />

      {book?.metadata?.description && typeof book.metadata.description === 'string' && (
        <>
          <Title level={5}>{t('bookDetails.description')}</Title>
          <Text>{book.metadata.description}</Text>
          <Divider />
        </>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="primary"
          icon={<EditOutlined />}
          loading={loading}
          onClick={openEditModal}
        >
          {t('bookDetails.editBook')}
        </Button>
        <Popconfirm
          title={t('bookDetails.deleteBook')}
          description={t('common.templates.confirmDeleteWithUndoWarning', { entity: t('common.entities.bookAsObject') })}
          onConfirm={handleDelete}
          okText={t('common.ok')}
          cancelText={t('common.cancel')}
          placement="topRight"
        >
          <Button
            type="primary"
            danger
            icon={<DeleteOutlined />}
            loading={loading}
          >
            {t('bookDetails.deleteBook')}
          </Button>
        </Popconfirm>
      </div>
    </div>
  );

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <InfoCircleOutlined />
          <span>{t('bookDetails.title')}</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
      destroyOnClose
    >
      {loading ? (
        <div className="flex justify-center py-8">{t('bookDetails.loading')}</div>
      ) : !book ? (
        <div className="text-center py-8">{t('bookDetails.notFound')}</div>
      ) : (
        renderDetailedView()
      )}
      <BookAddOrEditModal
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleEditSubmit}
        getInitialData={getBookForEdit}
        type="edit"
      />
    </Modal>
  );
};

export default BookDetailsModal;
