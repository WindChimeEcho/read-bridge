'use client'

import { useEffect, useState } from 'react'
import { Result, Spin } from 'antd'
import { FileUnknownOutlined, LoadingOutlined } from '@ant-design/icons'
import ReadMenu from '@/app/read/components/menu'
import ReadArea from '@/app/read/components/readArea'
import { useBook } from '@/hooks/useBook'
import { useChapterNav } from '@/hooks/useChapterNav'
import { useReaderSessionStore } from '@/store/useReaderSessionStore'
import { useReadingProgressStore } from '@/store/useReadingProgress'
import { useSiderStore } from '@/store/useSiderStore'

export default function DesktopRead() {
  const { readingId, setReadingId } = useSiderStore()
  const [loading, setLoading] = useState(true)
  const [bookNotFound, setBookNotFound] = useState(false)
  const [book] = useBook()
  const { readingProgress } = useReadingProgressStore()
  const resetSession = useReaderSessionStore(state => state.resetSession)
  const {
    isChapterLoading,
    currentChapter,
    bookmarks,
    goToChapter,
    jumpToBookmark,
    deleteBookmark,
  } = useChapterNav(book)

  const isReady = Boolean(
    readingId &&
    book &&
    book.id === readingId &&
    readingProgress.bookId === readingId
  )

  useEffect(() => {
    resetSession()
    return () => {
      resetSession()
    }
  }, [readingId, resetSession])

  useEffect(() => {
    if (!readingId) {
      setBookNotFound(true)
      setLoading(false)
      return
    }

    if (isReady) {
      setBookNotFound(false)
      setLoading(false)
      return
    }

    setBookNotFound(false)
    setLoading(true)

    const timer = setTimeout(() => {
      setBookNotFound(true)
      setReadingId('')
      setLoading(false)
    }, 5000)

    return () => clearTimeout(timer)
  }, [isReady, readingId, setReadingId])

  if (loading || (!isReady && !bookNotFound)) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Spin size="large" indicator={<LoadingOutlined spin />} tip="加载中...">
          <div className="w-[100px] h-[100px]"></div>
        </Spin>
      </div>
    )
  }

  if (bookNotFound || !book || !isReady) {
    return <Result icon={<FileUnknownOutlined />} title="404" subTitle="抱歉，没有找到该书籍或已删除" />
  }

  return (
    <div className="w-full h-full p-2 flex flex-row">
      <ReadMenu
        toc={book.toc}
        currentChapter={currentChapter}
        bookmarks={bookmarks}
        onChapterChange={(index: number, lineIndex = 0) => {
          void goToChapter(index, lineIndex)
        }}
        onBookmarkClick={(bookmark) => jumpToBookmark(bookmark)}
        onDeleteBookmark={(bookmark) => deleteBookmark(bookmark.id)}
      />
      <div className="flex-1 h-full">
        {isChapterLoading ? <div className="w-full h-full" /> : <ReadArea book={book} readingProgress={readingProgress} />}
      </div>
    </div>
  )
}
