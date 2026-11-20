'use client'

import { Menu, Button, List, Empty, Popconfirm } from 'antd'
import { MenuFoldOutlined, MenuUnfoldOutlined, BookOutlined, DeleteOutlined } from '@ant-design/icons'
import { Book, Bookmark } from '@/types/book'
import { useSiderStore } from '@/store/useSiderStore'
import { useTranslation } from '@/i18n/useTranslation'
import { useState } from 'react'

interface ReadMenuProps {
  toc: Book['toc']
  currentChapter: number
  bookmarks: Bookmark[]
  onChapterChange: (index: number, lineIndex: number) => void
  onBookmarkClick: (bookmark: Bookmark) => Promise<void>
  onDeleteBookmark: (bookmark: Bookmark) => void
}

const renderTocMenu = (
  toc: Book['toc'],
  currentChapter: number,
  onChapterChange: (index: number, lineIndex: number) => void,
  collapsed: boolean
) => {
  const menuItems = toc.map(({ title, index }) => ({
    key: index,
    label: collapsed ? index + 1 : title,
    title: title,
  }))

  return (
    <Menu
      mode="inline"
      style={{
        width: '100%',
      }}
      selectedKeys={[String(currentChapter)]}
      inlineCollapsed={collapsed}
      items={menuItems}
      onClick={({ key }) => onChapterChange(parseInt(key, 10), 0)}
      className="flex-1 overflow-auto"
    />
  )
}

const renderBookmarkList = (
  bookmarks: Bookmark[],
  handleBookmarkClick: (bookmark: Bookmark) => void,
  handleConfirmDeleteBookmark: (bookmark: Bookmark) => void,
  t: (path: string, params?: Record<string, string>) => string
) => {
  return (
    <div className="flex-1 overflow-auto border-r border-[var(--ant-color-border)]">
      {bookmarks.length > 0 ? (
        <List
          size="small"
          dataSource={bookmarks}
          renderItem={(bookmark) => (
            <List.Item
              className=' [&_.ant-list-item-action]:!ml-1'
              actions={[
                <Popconfirm
                  key="delete"
                  title={t('sider.removeBookmark')}
                  description={t('common.templates.confirmDelete', { entity: t('common.entities.bookmarkAsObject') })}
                  onConfirm={() => handleConfirmDeleteBookmark(bookmark)}
                  okText={t('common.ok')}
                  cancelText={t('common.cancel')}
                >
                  <DeleteOutlined
                    className="text-red-500 hover:text-red-700"
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                title={
                  <div
                    className="text-sm font-medium truncate cursor-pointer"
                    onClick={() => handleBookmarkClick(bookmark)}
                    title={bookmark.sentence}
                  >
                    {bookmark.sentence.length > 40
                      ? bookmark.sentence.substring(0, 40) + '...'
                      : bookmark.sentence}
                  </div>
                }
                description={
                  <div className="text-xs text-gray-500">
                    {bookmark.chapterIndex + 1} · {bookmark.createTime}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      ) : (
        <Empty
          description={t('sider.noBookmark')}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          className="mt-8"
        />
      )}
    </div>
  )
}

export default function ReadMenu({
  toc,
  currentChapter,
  bookmarks,
  onChapterChange,
  onBookmarkClick,
  onDeleteBookmark,
}: ReadMenuProps) {
  const { collapsed, setCollapsed } = useSiderStore()
  const [mode, setMode] = useState<'toc' | 'bookmark'>('toc')
  const { t } = useTranslation()

  const handleBookmarkClick = async (bookmark: Bookmark) => {
    try {
      await onBookmarkClick(bookmark)
      setMode('toc')
    } catch (error) {
      console.error('跳转书签失败:', error)
    }
  }

  const switchToToc = () => {
    if (mode === 'toc') {
      setCollapsed(!collapsed)
    } else {
      setMode('toc')
    }
  }

  const switchToBookmark = () => {
    setMode('bookmark')
  }

  const getWidth = () => {
    if (mode === 'bookmark') return 'w-[200px]'
    return collapsed ? 'w-[92px]' : 'w-[200px]'
  }

  return (
    <div className={`flex flex-col h-full transition-all duration-300 ease-in-out ${getWidth()}`}>
      <div className="flex mb-2">
        <Button
          type="text"
          onClick={switchToToc}
          className="mr-1"
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </Button>
        <Button
          type="text"
          onClick={switchToBookmark}
        >
          <BookOutlined />
        </Button>
      </div>

      {mode === 'toc'
        ? renderTocMenu(toc, currentChapter, onChapterChange, collapsed)
        : renderBookmarkList(bookmarks, handleBookmarkClick, onDeleteBookmark, t)}
    </div>
  )
}
