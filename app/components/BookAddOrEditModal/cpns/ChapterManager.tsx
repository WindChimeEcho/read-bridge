import { useState, memo, useCallback, useMemo } from 'react';
import { Button, Typography, Empty, Popconfirm, Input } from 'antd';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { PlusOutlined, MenuOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Book } from '@/types/book';
import { useTranslation } from '@/i18n/useTranslation';
import TextArea from 'antd/es/input/TextArea';
import {
  addChapter,
  deleteChapter,
  renameChapter,
  reorderChapters,
  updateChapterParagraphs,
} from '@/services/ChapterUtils';
import { notify } from '@/services/platform/notify';

const { Text, Title } = Typography;

interface TocItem {
  title: string;
  index: number;
}

interface ChapterManagerProps {
  book: Book;
  onChange: (updatedBook: Book) => void;
}

const ChapterItem = memo(({
  item,
  index,
  isSelected,
  onClick
}: {
  item: TocItem;
  index: number;
  isSelected: boolean;
  onClick: () => void
}) => {
  return (
    <Draggable
      key={`chapter-${item.index}-${index}`}
      draggableId={`chapter-${item.index}-${index}`}
      index={index}
    >
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`p-2 mb-1 rounded cursor-pointer ${isSelected ? 'bg-[var(--ant-color-bg-text-hover)]' : ''}`}
          style={{
            ...provided.draggableProps.style
          }}
          onClick={onClick}
        >
          <div className="flex items-center">
            <div {...provided.dragHandleProps} className="mr-2">
              <MenuOutlined className="text-gray-400" />
            </div>
            <Text ellipsis>{item.title}</Text>
          </div>
        </div>
      )}
    </Draggable>
  );
});

ChapterItem.displayName = 'ChapterItem';

export default function ChapterManager({ book, onChange }: ChapterManagerProps) {
  const { t } = useTranslation();
  const [selectedChapterIndex, setSelectedChapterIndex] = useState<number>(0);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    if (sourceIndex === destinationIndex) return;

    const updatedBook = reorderChapters(book, sourceIndex, destinationIndex);
    onChange(updatedBook);

    if (selectedChapterIndex === sourceIndex) {
      setSelectedChapterIndex(destinationIndex);
    } else if (sourceIndex < selectedChapterIndex && destinationIndex >= selectedChapterIndex) {
      setSelectedChapterIndex(selectedChapterIndex - 1);
    } else if (sourceIndex > selectedChapterIndex && destinationIndex <= selectedChapterIndex) {
      setSelectedChapterIndex(selectedChapterIndex + 1);
    }
  };

  const handleAddChapter = useCallback(() => {
    const newChapterTitle = `${t('book.chapter')} ${book.chapterList.length + 1}`;
    const { book: updatedBook, newIndex } = addChapter(book, newChapterTitle);
    onChange(updatedBook);
    setSelectedChapterIndex(newIndex);
  }, [book, onChange, t]);

  const handleDeleteChapter = useCallback(() => {
    const updatedBook = deleteChapter(book, selectedChapterIndex);
    if (!updatedBook) {
      notify.warning(t('book.atLeastOneChapter'));
      return;
    }
    setSelectedChapterIndex(0);
    onChange(updatedBook);
  }, [book, onChange, selectedChapterIndex, t]);

  const handleEditChapterTitle = useCallback((title: string) => {
    onChange(renameChapter(book, selectedChapterIndex, title));
  }, [book, onChange, selectedChapterIndex]);

  const startEditingTitle = useCallback(() => {
    setEditingTitle(book.chapterList[selectedChapterIndex].title);
    setIsEditingTitle(true);
  }, [book, selectedChapterIndex]);

  const confirmEditTitle = useCallback(() => {
    handleEditChapterTitle(editingTitle);
    setIsEditingTitle(false);
  }, [editingTitle, handleEditChapterTitle]);

  const cancelEditTitle = useCallback(() => {
    setIsEditingTitle(false);
  }, []);

  const selectedChapterText = useMemo(() => {
    if (!book || !book.chapterList[selectedChapterIndex]) return '';
    return book.chapterList[selectedChapterIndex].paragraphs.join('\n');
  }, [book, selectedChapterIndex]);

  const handleEditChapterText = useCallback((text: string) => {
    onChange(updateChapterParagraphs(book, selectedChapterIndex, text.split('\n')));
  }, [book, onChange, selectedChapterIndex]);

  if (!book) return null;
  return (
    <div className="flex h-[580px]">
      {/* 左侧：章节列表 */}
      <div className="w-1/3 pr-4">
        <div className="flex flex-col h-full">
          <Title level={5} className="mb-3">{t('book.chapterList')}</Title>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="chapter-list">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="overflow-y-auto h-[528px]"
                >
                  {book.toc.map((item, index) => (
                    <ChapterItem
                      key={`chapter-item-${item.index}-${index}`}
                      item={item}
                      index={index}
                      isSelected={selectedChapterIndex === item.index}
                      onClick={() => setSelectedChapterIndex(item.index)}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <div className="mt-3 mb-2">
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              block
              onClick={handleAddChapter}
            >
              {t('book.addChapter')}
            </Button>
          </div>
        </div>
      </div>

      {/* 右侧：章节展示 */}
      <div className="w-2/3 pl-4">
        {selectedChapterIndex !== null && book.chapterList[selectedChapterIndex] ? (
          <div>
            <div className="flex justify-between items-center mb-2">
              {isEditingTitle ? (
                <div className="flex items-center flex-1 mr-2">
                  <Input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    autoFocus
                  />
                  <Button
                    type="text"
                    icon={<CheckOutlined />}
                    onClick={confirmEditTitle}
                    className="ml-1"
                  />
                  <Button
                    type="text"
                    icon={<CloseOutlined />}
                    onClick={cancelEditTitle}
                    className="ml-1"
                  />
                </div>
              ) : (
                <Title level={5} onClick={startEditingTitle} className="cursor-pointer">
                  {book.chapterList[selectedChapterIndex].title}
                </Title>
              )}
              {!isEditingTitle && <Popconfirm
                title={t('book.deleteChapter')}
                description={t('common.templates.confirmDeleteWithUndoWarning', { entity: t('book.chapter') })}
                onConfirm={handleDeleteChapter}
                okText={t('common.ok')}
                cancelText={t('common.cancel')}
                placement="topRight"
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>}
            </div>
            <div className=" h-[534px]">
              <TextArea
                value={selectedChapterText}
                onChange={(e) => handleEditChapterText(e.target.value)}
                className="block mb-3"
                autoSize={{ minRows: 23, maxRows: 23 }}
              />
            </div>
          </div>
        ) : (
          <Empty description={t('book.noChapterSelected')} />
        )}
      </div>
    </div>
  );
}
