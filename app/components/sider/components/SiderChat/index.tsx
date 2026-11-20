import { Button, Modal } from 'antd'
import { CommentOutlined } from '@ant-design/icons'
import { useCallback, useEffect, useState } from 'react'
import { ChatContent, ChatHistory, ChatInput, ChatTools } from './cpns'
import { useChatSession } from '@/hooks/useChatSession'
import { useTranslation } from '@/i18n/useTranslation'
import { useSiderStore } from '@/store/useSiderStore'
import KeyboardShortcut from '@/app/components/KeyboardShortcut'

export default function StandardChat() {
  const { t } = useTranslation()
  const { chatShortcut } = useSiderStore()
  const {
    history,
    groupedHistory,
    isGenerating,
    tagOptions,
    sendMessage,
    stopGeneration,
    newChat,
    selectHistory,
    deleteHistory,
    renameHistory,
    changePrompt,
  } = useChatSession()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [focusTrigger, setFocusTrigger] = useState(0)

  const handleOpenModal = useCallback(() => {
    newChat()
    setIsModalOpen(true)
    setFocusTrigger(prev => prev + 1)
  }, [newChat])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const shortcutParts = chatShortcut.toLowerCase().split('+')
      const isCtrlPressed = shortcutParts.includes('ctrl') && event.ctrlKey
      const isAltPressed = shortcutParts.includes('alt') && event.altKey
      const isShiftPressed = shortcutParts.includes('shift') && event.shiftKey
      const key = shortcutParts[shortcutParts.length - 1]

      if (
        event.key.toLowerCase() === key &&
        (shortcutParts.includes('ctrl') ? isCtrlPressed : !event.ctrlKey) &&
        (shortcutParts.includes('alt') ? isAltPressed : !event.altKey) &&
        (shortcutParts.includes('shift') ? isShiftPressed : !event.shiftKey)
      ) {
        event.preventDefault()
        handleOpenModal()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [chatShortcut, handleOpenModal])

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isModalOpen) {
        event.preventDefault()
        handleCloseModal()
      }
    }

    document.addEventListener('keydown', handleEscapeKey)
    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isModalOpen, handleCloseModal])

  return (
    <>
      <Button
        icon={<CommentOutlined />}
        onClick={handleOpenModal}
        className="m-2 mt-0 h-[32px]"
      >
        <span className="flex items-center gap-2">
          {t('sider.chat')}
          <KeyboardShortcut shortcut={chatShortcut} />
        </span>
      </Button>

      <Modal
        open={isModalOpen}
        onCancel={handleCloseModal}
        title={null}
        footer={null}
        closeIcon={null}
        width={800}
        destroyOnClose={false}
      >
        <div className="w-full h-full flex flex-col text-[var(--ant-color-text)]">
          <ChatTools
            isGenerating={isGenerating}
            onPlus={newChat}
            onChangePrompt={changePrompt}
            onHistory={() => setIsHistoryModalOpen(true)}
            onCloseModal={handleCloseModal}
          />
          <ChatContent history={history} />
          <ChatInput
            onSent={(input, tags) => { void sendMessage(input, tags) }}
            tagOptions={tagOptions}
            isGenerating={isGenerating}
            onStopGeneration={stopGeneration}
            shouldFocus={focusTrigger}
          />
          <ChatHistory
            isModalOpen={isHistoryModalOpen}
            history={history}
            groupedHistory={groupedHistory}
            onClose={() => setIsHistoryModalOpen(false)}
            onSelect={selectHistory}
            onDelete={deleteHistory}
            onRename={renameHistory}
          />
        </div>
      </Modal>
    </>
  )
}
