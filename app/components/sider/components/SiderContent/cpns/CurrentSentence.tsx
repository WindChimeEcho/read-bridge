import { Tooltip, Button, Input } from "antd";
import { EditOutlined, DoubleRightOutlined, StarOutlined, StarFilled } from "@ant-design/icons";
import nlp from "compromise";
import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { useTranslation } from "@/i18n/useTranslation";
import { useTheme } from "next-themes";
import { TextAreaRef } from "antd/es/input/TextArea";
import { useBookmarkStore } from "@/store/useBookmarkStore";
type CurrentSentenceProps = {
  sentence: string;
  handleWord: (word: string) => void;
  onEditComplete: (text: string) => void;
  currentBookmarkInfo: {
    bookId: string;
    sentence: string;
    chapterIndex: number;
    lineIndex: number;
  } | null;
  onBookmarkToggle: () => void;
}
export default function CurrentSentence({ sentence, handleWord, onEditComplete, currentBookmarkInfo, onBookmarkToggle }: CurrentSentenceProps) {
  const { t } = useTranslation()
  const { theme: currentTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const inputRef = useRef<TextAreaRef>(null);

  // 书签状态管理
  const { getBookmarksByBookId } = useBookmarkStore();

  // 获取当前书籍的书签数组
  const currentBookmarks = currentBookmarkInfo ?
    getBookmarksByBookId(currentBookmarkInfo.bookId) : [];

  const isBookmarked = currentBookmarkInfo
    ? currentBookmarks.some(bookmark =>
      bookmark.chapterIndex === currentBookmarkInfo.chapterIndex &&
      bookmark.lineIndex === currentBookmarkInfo.lineIndex
    )
    : false

  const wordTypeColors = useMemo(() => ({
    'Verb': 'text-[var(--ant-green-6)]',
    'Adjective': 'text-[var(--ant-purple-7)]',
    'Pivot': 'text-[var(--ant-gold-6)]',
    'Noun': 'text-[var(--ant-color-text)]',
  }), [])
  const getChunkColor = useCallback((chunk: string) => {
    return wordTypeColors[chunk] || 'text-[var(--ant-color-text)]';
  }, [wordTypeColors]);
  const terms = useMemo(() => {
    if (sentence && sentence.length > 0) {
      const doc = nlp(sentence)
      return doc.terms().json()
    }
    return []
  }, [sentence])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleEdit = () => {
    setEditText(sentence);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editText === sentence) return setIsEditing(false);
    onEditComplete(editText);
    setEditText('');
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText('');
    setIsEditing(false);
  };
  return (
    <div className="w-full h-[136px] p-4 relative">
      <div className="flex items-center justify-between">
        <Tooltip
          color={currentTheme === 'dark' ? '' : 'white'}
          title={
            <>
              <div className={getChunkColor('Verb')}>{t('sider.verb')}</div>
              <div className={getChunkColor('Adjective')}>{t('sider.adjective')}</div>
              <div className={getChunkColor('Pivot')}>{t('sider.pivot')}</div>
              <div className={getChunkColor('Noun')}>{t('sider.noun')}</div>
            </>
          }
        >
          <div className="text-lg font-semibold text-[var(--ant-color-text)] cursor-help">
            {t('sider.selectSentence')}
          </div>
        </Tooltip>
        <div className="flex items-center gap-1">
          {/* 收藏按钮 - 仅在非编辑模式且有书签信息时显示 */}
          {!isEditing && currentBookmarkInfo && (
            <Button
              type="text"
              size="small"
              icon={isBookmarked ? <StarFilled /> : <StarOutlined />}
              onClick={onBookmarkToggle}
              className={isBookmarked ? 'text-yellow-500' : ''}
              title={isBookmarked ? t('sider.removeBookmark') : t('sider.addBookmark')}
            />
          )}

          {/* 编辑按钮 */}
          <Button
            type="text"
            size="small"
            icon={isEditing ? <DoubleRightOutlined /> : <EditOutlined />}
            onClick={isEditing ? handleSave : handleEdit}
          />
        </div>
      </div>
      <div className="space-y-1 overflow-y-auto h-[76px] mt-2">
        {isEditing ? (
          <Input.TextArea
            ref={inputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="h-full resize-none"
            placeholder={t('sider.selectSentence')}
            autoSize={{ minRows: 3, maxRows: 3 }}
            onPressEnter={(e) => {
              if (e.shiftKey) return;
              e.preventDefault();
              handleSave();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleCancel();
              }
            }}
          />
        ) : (
          terms.map((term, i) => (
            <span
              key={i}
              className={`${getChunkColor(term.terms[0].chunk)} hover:underline cursor-pointer text-base`}
              onClick={() => {
                handleWord(term.text)
              }}
            >
              {term.text}{' '}
            </span>
          ))
        )}
      </div>
    </div>
  )
}
