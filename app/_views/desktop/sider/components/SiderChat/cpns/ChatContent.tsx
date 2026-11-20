import { LLMHistory } from "@/types/llm";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Tooltip } from "antd"
import MessageBubble from './MessageBubble'
import useTranslation from "@/i18n/useTranslation";

type ChatContent = {
  history: LLMHistory
}

export default function ChatContent({ history }: ChatContent) {
  const { t } = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);
  const isAutoScrollTo = useRef(false)
  const prevSizeRef = useRef(0);
  const [prompt, messages] = useMemo(() => {
    return [history.prompt, history.messages]
  }, [history])

  const size = useMemo(() => {
    const msg = messages[messages.length - 1]
    if (!msg) return 0
    if (msg.role === 'user') return 0
    else {
      const reasonLength = (msg.reasoningContent && msg.reasoningContent.length) || 0
      return msg.content.length + Math.max(0, reasonLength)
    }
  }, [messages])

  const scrollToBottom = useCallback(() => {
    if (!contentRef.current) return;
    contentRef.current.scrollTo({
      top: contentRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, [])

  useEffect(() => {
    isAutoScrollTo.current = true
    requestAnimationFrame(() => {
      scrollToBottom()
    })
  }, [messages.length, scrollToBottom])
  useEffect(() => {
    if (size < 20) {
      scrollToBottom()
      prevSizeRef.current = size;
      return;
    }

    if (!isAutoScrollTo.current) return
    if ((size - prevSizeRef.current >= 50)) {
      scrollToBottom();
      prevSizeRef.current = size;
    }
  }, [size, scrollToBottom])


  useEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) return;
    const handleScroll = () => {

      // 检查是否接近底部
      const isAtBottom = Math.abs(
        contentElement.scrollHeight - contentElement.scrollTop - contentElement.clientHeight
      ) < 50;
      // 如果不在底部且自动滚动已启用，则禁用它
      if (!isAtBottom && isAutoScrollTo.current) {
        isAutoScrollTo.current = false;
      }

      // 如果在底部且自动滚动已禁用，则重新启用它
      // 这意味着用户已手动滚动回底部
      if (isAtBottom && !isAutoScrollTo.current) {
        isAutoScrollTo.current = true;
      }
    };

    contentElement.addEventListener('scroll', handleScroll);

    return () => {
      contentElement.removeEventListener('scroll', handleScroll);
    };
  }, []);


  return (
    <div ref={contentRef} className="overflow-y-auto p-2 w-full h-[500px] overflow-x-hidden" >
      <Tooltip
        title={<div className="text-sm">{prompt}</div>}
        placement="bottom"
      >
        <div className="text-sm text-gray-500 rounded-md p-2 mb-2 border border-[var(--ant-color-border)] line-clamp-3 overflow-hidden cursor-pointer">
          {prompt ? prompt : t('sider.defaultChat')}
        </div>
      </Tooltip>
      {messages.map((msg, index) => {
        if (msg.role === 'user') {
          return <MessageBubble key={index} msg={msg} isUser={true} />
        } else {
          return <MessageBubble key={index} msg={msg} isUser={false} />
        }
      })}
    </div>
  )
}

