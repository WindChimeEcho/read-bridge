import { useEffect, useState, useRef } from "react"
import { Button, InputRef, Popover, Tag } from "antd"
import { ArrowUpOutlined, PauseOutlined } from "@ant-design/icons"
import TextArea from "antd/es/input/TextArea"

type ChatInput = {
  onSent: (input: string, tags: string[]) => void
  tagOptions: {
    label: string,
    value: string
  }[]
  isGenerating?: boolean
  onStopGeneration?: () => void
  shouldFocus?: number
}

export default function ChatInput({
  onSent,
  tagOptions,
  isGenerating = false,
  onStopGeneration,
  shouldFocus = 0
}: ChatInput) {
  const [input, setInput] = useState('')
  const [tags, setTags] = useState<Array<{ label: string, value: string }>>([])
  const [tagSelectorOpen, setTagSelectorOpen] = useState(false)
  const textAreaRef = useRef<InputRef>(null)

  useEffect(() => {
    if (tagOptions.length > 0) {
      setTags([tagOptions[0]])
    }
  }, [tagOptions])

  useEffect(() => {
    if (shouldFocus > 0 && textAreaRef.current) {
      setTimeout(() => {
        textAreaRef.current?.focus({
          cursor: 'end'
        })
      }, 100)
    }
  }, [shouldFocus])

  const handleSend = () => {
    onSent(input, tags.map(tag => tag.value))
    setInput('')
  }

  function content(onAddTag: (tag: { label: string, value: string }) => void) {
    return (
      <div className="flex flex-col gap-2">
        {tagOptions.map((tag) => {
          return <Button type="text" key={tag.value} onClick={() => {
            onAddTag(tag)
          }}>{tag.label}</Button>
        })}
      </div>
    )
  }

  function handleAddTag(tag: { label: string, value: string }) {
    // 检查是否已存在相同value的标签
    if (!tags.some(t => t.value === tag.value)) {
      setTags([...tags, tag])
    }
    // 关闭popover
    setTagSelectorOpen(false)
  }

  function handleRemoveTag(tagValue: string) {
    setTags(tags.filter(tag => tag.value !== tagValue))
  }

  return (
    <div className="box-border w-full h-[100px] flex items-center flex-col
     justify-between  shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
      <div className="w-full h-[28px] pl-2 pr-2 pt-1 flex items-center">
        <div className="flex items-center overflow-x-auto w-full scrollbar-hide">
          <Popover content={content(handleAddTag)} trigger="click" open={tagSelectorOpen} onOpenChange={setTagSelectorOpen} >
            <Button icon={<>@</>} size="small" className="mr-1" />
          </Popover>
          {tags.map(tag => (
            <Popover
              content={tag.label}
              trigger="hover"
              mouseEnterDelay={0.5}
              placement="top"
              key={tag.value}
            >
              <Tag
                closable
                onClose={() => handleRemoveTag(tag.value)}
                className="max-w-[120px] h-[24px] mr-1 overflow-hidden text-ellipsis whitespace-nowrap cursor-default"
              >
                {tag.label}
              </Tag>
            </Popover>
          ))}
        </div>

      </div>
      <div className="flex-1 w-full flex items-end justify-between p-2 relative">
        <TextArea
          ref={textAreaRef}
          className="resize-none pr-16"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoSize={{ minRows: 2, maxRows: 2 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              e.preventDefault();
              if (input.length > 0 && !isGenerating) {
                handleSend();
              }
            }
          }}
          disabled={isGenerating}
        />
        {isGenerating ? (
          <Button
            className="absolute top-1/2 right-4 transform -translate-y-1/2"
            type="primary"
            danger
            shape="circle"
            icon={<PauseOutlined />}
            onClick={onStopGeneration}
          />
        ) : (
          <Button
            className="absolute top-1/2 right-4 transform -translate-y-1/2"
            type="primary"
            shape="circle"
            icon={<ArrowUpOutlined />}
            disabled={input.length === 0}
            onClick={handleSend}
          />
        )}
      </div>
    </div>
  )
}
