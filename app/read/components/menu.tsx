'use client'

import { Menu, Button, List, Empty, Popconfirm } from 'antd'
import { MenuFoldOutlined, MenuUnfoldOutlined, BookOutlined, DeleteOutlined } from '@ant-design/icons'
import { Book, Bookmark } from '@/types/book'
import { useSiderStore } from '@/store/useSiderStore'
import { useBookmarkStore } from '@/store/useBookmarkStore'
import { useBook } from '@/hooks/useBook'
import { useTranslation } from '@/i18n/useTranslation'
import { useState } from 'react'

interface ReadMenuProps {
  toc: Book['toc']
  currentChapter: number
  onChapterChange: (index: number, lineIndex: number) => void
}

// 渲染目录菜单函数
const renderTocMenu = (
  toc: Book['toc'],
  currentChapter: number,
  onChapterChange: (index: number, lineIndex: number) => void,
  collapsed: boolean
) => {
  const menuItems = toc.map(({ title, index, level }) => {
    const lvl = level || 1
    const indent = collapsed ? 0 : (lvl - 1) * 12

    return {
      key: index,
      label: collapsed ? index + 1 : (
        <div 
          style={{ 
            paddingLeft: `${indent}px`,
            fontSize: lvl === 1 ? '14px' : '13px',
            fontWeight: lvl === 1 ? 600 : 'normal',
            opacity: lvl > 1 ? 0.85 : 1
          }} 
          className="truncate"
        >
          {title}
        </div>
      ),
      title: title
    }
  })

  return (
    <Menu
      mode="inline"
      style={{
        width: '100%',
      }}
      selectedKeys={[String(currentChapter)]}
      inlineCollapsed={collapsed}
      items={menuItems}
      onClick={({ key }) => onChapterChange(parseInt(key), 0)}
      className="flex-1 overflow-auto"
    />
  )
}

// 渲染书签列表函数
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
                  <div className="text-sm font-medium truncate cursor-pointer"
                    onClick={() => handleBookmarkClick(bookmark)} title={bookmark.sentence}>
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

export default function ReadMenu({ toc, currentChapter, onChapterChange }: ReadMenuProps) {
  const { collapsed, setCollapsed, readingId } = useSiderStore()
  const { getBookmarksByBookId, removeBookmark } = useBookmarkStore()
  const [book] = useBook()
  const [mode, setMode] = useState<'toc' | 'bookmark'>('toc')
  const { t } = useTranslation()

  // 获取当前书籍的书签
  const bookmarks = book ? getBookmarksByBookId(book.id) : []

  // 处理书签点击跳转
  const handleBookmarkClick = async (bookmark: Bookmark) => {
    if (!readingId) return
    try {
      await onChapterChange(bookmark.chapterIndex, bookmark.lineIndex)
      // 跳转后切换回目录模式
      setMode('toc')
    } catch (error) {
      console.error('跳转书签失败:', error)
    }
  }

  // 处理确认删除书签
  const handleConfirmDeleteBookmark = (bookmark: Bookmark) => {
    if (!book) return
    removeBookmark(book.id, bookmark.id)
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
        : renderBookmarkList(bookmarks, handleBookmarkClick, handleConfirmDeleteBookmark, t)}
    </div>
  )
}