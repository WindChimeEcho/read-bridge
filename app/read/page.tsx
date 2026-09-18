'use client'
import { useBook } from "@/hooks/useBook"
import { useSiderStore } from "@/store/useSiderStore"
import { LoadingOutlined, FileUnknownOutlined } from '@ant-design/icons';
import { useEffect, useState } from "react"
import ReadMenu from "./components/menu"
import db from "@/services/DB"
import { useReadingProgressStore } from "@/store/useReadingProgress"
import { Spin, Result } from "antd"
import ReadArea from "./components/readArea"


export default function ReadPage() {
  const { readingId, setReadingId } = useSiderStore()
  const [loading, setLoading] = useState(true)
  const [bookNotFound, setBookNotFound] = useState(false)
  const [isChapterLoading, setIsChapterLoading] = useState(false)
  const [book] = useBook()
  const { readingProgress, updateReadingProgress } = useReadingProgressStore()

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!book) {
        setBookNotFound(true)
        setReadingId('')
      }
      setLoading(false)
    }, 5000)

    if (book && readingProgress.bookId) {
      setLoading(false)
      clearTimeout(timer)
    }

    return () => clearTimeout(timer)
  }, [book, readingProgress, setReadingId])

  if (loading) return (
    <div className="w-full h-full flex items-center justify-center">
      <Spin size="large" indicator={<LoadingOutlined spin />} tip="加载中...">
        <div className="w-[100px] h-[100px]"></div>
      </Spin>
    </div>
  )
  if (bookNotFound || !book) return <Result icon={<FileUnknownOutlined />} title="404" subTitle="抱歉，没有找到该书籍或已删除" />

  const handleChapterChange = async (index: number, lineIndex = 0) => {
    if (!readingId) return
    setIsChapterLoading(true)
    try {
      await db.updateCurrentLocation(readingId, { chapterIndex: index, lineIndex })
      await updateReadingProgress(readingId)
    } finally {
      setIsChapterLoading(false)
    }
  }


  return (
    <div className="w-full h-full p-2 flex flex-row">
      <ReadMenu toc={book.toc} currentChapter={readingProgress.currentLocation.chapterIndex} onChapterChange={(index: number, lineIndex = 0) => {
        handleChapterChange(index, lineIndex)
      }} />
      <div className="flex-1 h-full">
        {isChapterLoading ? <div className="w-full h-full" /> : <ReadArea book={book} readingProgress={readingProgress} />}
      </div>
    </div>
  )
}
