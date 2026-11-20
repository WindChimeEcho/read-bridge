import { Button, Modal } from "antd";
import { useCallback, useState } from "react";
import { EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { LLMHistory } from "@/types/llm";

type ChatHistoryGroup = {
  label: string
  items: LLMHistory[]
}

type ChatHistory = {
  isModalOpen: boolean
  history: LLMHistory
  groupedHistory: ChatHistoryGroup[]
  onClose: () => void
  onSelect: (id: string) => void
  onDelete: (item: LLMHistory) => void
  onRename: (item: LLMHistory, title: string) => void
}

export default function ChatHistory({
  isModalOpen,
  history,
  groupedHistory,
  onClose,
  onSelect,
  onDelete,
  onRename,
}: ChatHistory) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState<string>('')

  const handleSelectHistory = useCallback((id: string) => {
    onSelect(id)
    onClose()
  }, [onSelect, onClose])
  const handleEditHistory = useCallback((item: LLMHistory) => {
    setEditingId(item.id)
    setEditingTitle(item.title)
  }, [])
  const handleDeleteHistory = useCallback((item: LLMHistory) => {
    onDelete(item)
  }, [onDelete])
  const handleSaveEdit = useCallback((item: LLMHistory) => {
    onRename(item, editingTitle)
    setEditingId(null)
  }, [onRename, editingTitle])
  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
  }, [])

  const handleCancel = useCallback(() => {
    setEditingId(null)
    setEditingTitle('')
    onClose()
  }, [onClose])
  return (
    <Modal title="历史记录" open={isModalOpen} footer={<></>} onCancel={handleCancel} >
      {
        groupedHistory.map((group) => (
          <div key={group.label}>
            <div className="text-sm font-bold mb-2">{group.label}</div>
            {group.items.map((item) => (
              <div className={
                `flex items-center justify-between text-base p-2 pt-1 pb-1 mb-1 rounded-lg 
                hover:bg-[var(--ant-color-bg-text-hover)]
                ${(history && history.id === item.id) ? 'bg-[var(--ant-color-bg-text-hover)]' : ''}
                cursor-pointer group`
              }
                key={item.id}
              >
                {editingId === item.id ? (
                  <div className="flex-1 flex items-center">
                    <input
                      className="flex-1"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex items-center ml-2">
                      <Button type="text" size="small" icon={<CheckOutlined />} onClick={() => handleSaveEdit(item)} />
                      <Button type="text" size="small" icon={<CloseOutlined />} onClick={handleCancelEdit} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 truncate" onClick={() => handleSelectHistory(item.id)}>{item.title}</div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditHistory(item)} />
                      <Button type="text" size="small" icon={<DeleteOutlined />} onClick={() => handleDeleteHistory(item)} />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ))
      }
    </Modal>
  )
}