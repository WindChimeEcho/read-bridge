import { LLMHistory } from "@/types/llm";
import { memo, useCallback, useState } from "react";
import { Button, Collapse, message } from "antd";
import dayjs from "dayjs";
import { useTheme } from "next-themes"
import { SyncOutlined, LoadingOutlined } from "@ant-design/icons";
import { CopyIcon } from "@/assets/icon";
import { useSiderStore } from "@/store/useSiderStore";
import MarkdownRendererWrapper from "@/app/components/common/MarkdownRendererWrapper";
import { createMessageBubbleStyles, solarizedColors } from "./MessageBubble.styles";

const MessageBubble = memo(function MessageBubble({
  msg,
  isUser
}: {
  msg: LLMHistory['messages'][number],
  isUser: boolean
}) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark'
  const { thinkingExpanded, setThinkingExpanded } = useSiderStore()
  const [activeKey, setActiveKey] = useState<string | string[]>(thinkingExpanded ? ['thinking'] : [])

  // 获取样式对象
  const styles = createMessageBubbleStyles({ isUser, isDarkMode })

  const handleCollapseChange = useCallback((key: string | string[]) => {
    setActiveKey(key);
    if (!isUser) {
      const isExpanded = Array.isArray(key) ? key.includes('thinking') : key === 'thinking';
      setThinkingExpanded(isExpanded);
    }
  }, [setThinkingExpanded, isUser])

  const copyToClipboard = useCallback((text: string, type: 'content' | 'thinking') => {
    navigator.clipboard.writeText(text)
    message.success(type === 'thinking' ? '思考内容已复制' : (isUser ? 'Copied to clipboard' : '回复已复制'))
  }, [isUser])

  const hasThinkingContent = !isUser && !!msg.reasoningContent;
  const isThinking = hasThinkingContent && !msg.thinkingTime;
  const thinkingLabel = isThinking
    ? '思考中...'
    : `思考完成 (用时${msg.thinkingTime}秒)`;

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        {/* 时间戳和模型名称 */}
        <div style={styles.meta}>
          {!isUser && msg.name && (
            <span style={styles.modelName}>{msg.name}</span>
          )}
          <span style={styles.timestamp}>
            {dayjs(msg.timestamp).format('MM-DD HH:mm')}
          </span>
        </div>

        {/* 思考内容面板 */}
        {hasThinkingContent && (
          <div style={styles.thinkingPanel}>
            <Collapse
              activeKey={activeKey}
              onChange={handleCollapseChange}
              bordered={false}
              size="small"
              items={[
                {
                  key: 'thinking',
                  label: (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isThinking && (
                          <SyncOutlined spin style={styles.thinkingIcon} />
                        )}
                        <span style={styles.thinkingLabel}>
                          {thinkingLabel}
                        </span>
                      </div>
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyIcon style={{ fontSize: '12px' }} />}
                        style={styles.actionButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(msg.reasoningContent || '', 'thinking');
                        }}
                      />
                    </div>
                  ),
                  children: (
                    <div style={styles.thinkingContent}>
                      <MarkdownRendererWrapper
                        content={msg.reasoningContent || ''}
                        className="w-full"
                      />
                    </div>
                  )
                }
              ]}
            />
          </div>
        )}

        {/* 主消息内容 */}
        <div style={styles.bubble}>
          {msg.content.length === 0 ? (
            <LoadingOutlined style={styles.loadingIcon} />
          ) : (
            <MarkdownRendererWrapper
              content={msg.content}
              className="w-full"
            />
          )}
        </div>

        {/* 操作按钮 */}
        <div style={styles.actions}>
          <Button
            type="text"
            size="small"
            icon={<CopyIcon style={{ fontSize: '14px' }} />}
            style={styles.actionButton}
            onClick={() => copyToClipboard(msg.content, 'content')}
          />
        </div>
      </div>
    </div>
  )
})
MessageBubble.displayName = 'MessageBubble'
export default MessageBubble