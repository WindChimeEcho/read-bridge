import { Book, ReadingProgress } from "@/types/book"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import db from "@/services/DB"
import { EVENT_NAMES, EventEmitter } from "@/services/EventService"
import { Radio } from "antd"
import { useStyleStore, FontSize } from "@/store/useStyleStore"

const FONT_SIZE_CLASSES: Record<FontSize, string> = {
  small: 'text-sm',
  medium: 'text-lg',
  large: 'text-xl'
}

const TITLE_FONT_SIZE_CLASSES: Record<FontSize, string> = {
  small: 'text-xl',
  medium: 'text-2xl',
  large: 'text-3xl'
}

const RADIO_SIZE_CLASSES: Record<FontSize, string> = {
  small: 'w-5 h-5 pt-0.5',
  medium: 'w-6 h-6 pt-[4.5px]',
  large: 'w-7 h-7 pt-[5px]'
}

export default function ReadArea({ book, readingProgress }: { book: Book, readingProgress: ReadingProgress }) {
  const { fontSize } = useStyleStore()

  const title = useMemo(() => {
    return book.chapterList[readingProgress.currentLocation.chapterIndex]?.title || ''
  }, [book, readingProgress.currentLocation.chapterIndex])

  const lines = useMemo(() => {
    return readingProgress.sentenceChapters[readingProgress.currentLocation.chapterIndex] ?? []
  }, [readingProgress.sentenceChapters, readingProgress.currentLocation.chapterIndex])

  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedLine, setSelectedLine] = useState<number>(Infinity)
  const lineRefsMap = useRef<Map<number, HTMLDivElement>>(new Map())
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setSelectedLine(readingProgress.currentLocation.lineIndex)
  }, [readingProgress.currentLocation.chapterIndex, readingProgress.currentLocation.lineIndex])

  // 页面加载时滚动到上次阅读位置
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const savedLineIndex = readingProgress.currentLocation.lineIndex;
    if (savedLineIndex !== undefined && savedLineIndex !== Infinity && savedLineIndex > 0) {
      // 等待DOM
      const timer = setTimeout(() => {
        const lineElement = lineRefsMap.current.get(savedLineIndex);
        if (lineElement) {
          lineElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          container.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
      return () => clearTimeout(timer)
    } else {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [lines, readingProgress.currentLocation.lineIndex]);

  // 滚动停止后保存当前阅读位置
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        const containerRect = container.getBoundingClientRect();
        const containerTop = containerRect.top + 10;

        const visibleLineIndex = findFirstVisibleLine(
          lines,
          lineRefsMap.current,
          containerTop,
          containerRect.bottom
        )

        // save
        if (visibleLineIndex !== Infinity && visibleLineIndex >= 0) {
          void db.updateCurrentLocation(book.id, {
            chapterIndex: readingProgress.currentLocation.chapterIndex,
            lineIndex: visibleLineIndex
          });
        }
      }, 300);
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [book.id, readingProgress.currentLocation.chapterIndex, lines]);

  // 处理行点击
  const handleLineClick = useCallback((index: number) => {
    setSelectedLine((prev) => {
      EventEmitter.emit(EVENT_NAMES.SEND_LINE_INDEX, index);
      if (prev !== index) void db.updateCurrentLocation(book.id, {
        chapterIndex: readingProgress.currentLocation.chapterIndex,
        lineIndex: index
      });
      return index;
    });
  }, [book.id, readingProgress.currentLocation.chapterIndex]);

  // 记录每行DOM引用
  const setLineRef = useCallback((element: HTMLDivElement | null, index: number) => {
    if (element) {
      lineRefsMap.current.set(index, element);
    } else {
      lineRefsMap.current.delete(index);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className='w-full h-full overflow-auto p-2'
    >
      <div className={`${TITLE_FONT_SIZE_CLASSES[fontSize]} font-bold mb-4 ml-8`}>{title}</div>
      <div className={FONT_SIZE_CLASSES[fontSize]}>
        {lines.length > 0 && lines.map((sentence, index) => (
          <Line
            sentence={sentence}
            index={index}
            isSelected={selectedLine === index}
            key={index}
            handleLineClick={handleLineClick}
            setLineRef={setLineRef}
            size={fontSize}
          />
        ))}
      </div>
    </div>
  )
}

// 单行组件，使用memo优化性能
const Line = React.memo(({ sentence, index, isSelected, handleLineClick, setLineRef, size }: {
  sentence: string,
  index: number,
  isSelected: boolean,
  handleLineClick: (index: number) => void,
  setLineRef: (element: HTMLDivElement | null, index: number) => void,
  size: FontSize
}) => {
  if (!sentence) {
    return <div ref={(element) => setLineRef(element, index)} className="h-4" />
  }

  return (
    <div
      className={`flex mb-1 group rounded-lg min-h-[1.5em] ${isSelected ? 'bg-[var(--ant-color-bg-text-hover)]' : ''} hover:bg-[var(--ant-color-bg-text-hover)]`}
      ref={(el) => setLineRef(el, index)}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '1.75em' }}
    >
      <div
        className={`${RADIO_SIZE_CLASSES[size]} flex justify-center items-center`}
        onClick={() => handleLineClick(index)}
      >
        <Radio
          checked={isSelected}
          className={`${isSelected ? "" : "hidden group-hover:block"}`}
        />
      </div>
      <div className={`mx-1`} />
      <div className="flex-1 leading-relaxed">{sentence}</div>
    </div>
  )
})
Line.displayName = 'Line'

function findFirstVisibleLine(
  lines: string[],
  elements: Map<number, HTMLDivElement>,
  viewportTop: number,
  viewportBottom: number
): number {
  let lower = 0
  let upper = lines.length - 1
  let firstVisible = Infinity

  while (lower <= upper) {
    const middle = Math.floor((lower + upper) / 2)
    const element = elements.get(middle)
    if (!element) break

    if (element.getBoundingClientRect().bottom >= viewportTop) {
      firstVisible = middle
      upper = middle - 1
    } else {
      lower = middle + 1
    }
  }

  for (let index = firstVisible; index < lines.length; index += 1) {
    const element = elements.get(index)
    if (!element) continue
    const rect = element.getBoundingClientRect()
    if (rect.top > viewportBottom) break
    if (lines[index] && rect.bottom >= viewportTop) return index
  }

  return Infinity
}
