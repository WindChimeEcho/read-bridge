import { Book, ReadingProgress } from "@/types/book"
import React, { useCallback } from "react"
import { Radio } from "antd"
import { useStyleStore, FontSize } from "@/store/useStyleStore"
import { useReadArea } from "@/hooks/useReadArea"

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
  const {
    title,
    lines,
    selectedLineIndex,
    containerRef,
    setLineRef,
    onSelectSentence,
  } = useReadArea(book, readingProgress)

  const handleLineClick = useCallback((index: number) => {
    void onSelectSentence(index)
  }, [onSelectSentence])

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
            isSelected={selectedLineIndex === index}
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
