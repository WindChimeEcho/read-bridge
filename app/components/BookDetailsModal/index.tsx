'use client';

import { FC, useState, useCallback } from 'react';
import { Modal, Button, Typography, Divider, Popconfirm } from 'antd';
import { DeleteOutlined, EditOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Book } from '@/types/book';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/i18n/useTranslation';
import BookAddOrEditModal from '../BookAddOrEditModal';
import { useBook } from '@/hooks/useBook';
import { useBookManage } from '@/hooks/useBookManage';
import { notify } from '@/services/platform/notify';
import { formatCoverDataUrl } from '@/utils/book';

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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const router = useRouter();
  const [, , updateBook] = useBook();
  const { t } = useTranslation();
  const { book, loading, saving, saveBookChanges, deleteBook } = useBookManage(bookId, {
    enabled: open,
  });

  const isBusy = loading || saving;

  const handleDelete = async () => {
    const ok = await deleteBook();
    if (!ok) return;
    await updateBook();
    onClose();
    router.refresh();
  };

  const openEditModal = useCallback(() => {
    if (!book) {
      notify.error(t('common.templates.loadFailed', { entity: t('common.entities.bookDetails') }));
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
    const ok = await saveBookChanges(updatedBook);
    if (!ok) return;
    setEditModalOpen(false);
    await updateBook();
    onClose();
    router.refresh();
  }, [onClose, router, saveBookChanges, updateBook]);

  const coverSrc = formatCoverDataUrl(book?.metadata?.cover);

  const renderDetailedView = () => (
    <div className="space-y-4">
      <div className="flex gap-4">
        {coverSrc && (
          <div className="w-1/4 aspect-[3/4] overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverSrc}
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
          loading={isBusy}
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
            loading={isBusy}
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
