'use client'

import { useEffect, useState } from 'react'
import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import {
  DeleteOutlined,
  EditOutlined,
  MenuOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useTranslation } from '@/i18n/useTranslation'
import { registerBackHandler } from '@/services/platform/backAdapter'
import { notify } from '@/services/platform/notify'
import { useOutputOptions } from '@/store/useOutputOptions'
import type { PromptOption } from '@/types/llm'
import { SectionCard, SubpageHeader } from './SettingsPrimitives'

export default function PromptRulesSubpage({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  const {
    promptOptions,
    selectedId,
    setSelectedId,
    addPromptOptions,
    updatePromptOptions,
    deletePromptOptions,
    reorderPromptOptions,
    resetPromptOptions,
  } = useOutputOptions()

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PromptOption | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [promptInput, setPromptInput] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    if (!editorOpen) return
    return registerBackHandler(75, () => {
      setEditorOpen(false)
      return true
    })
  }, [editorOpen])

  const openAdd = () => {
    setEditingItem(null)
    setNameInput('')
    setPromptInput('')
    setEditorOpen(true)
  }

  const openEdit = (item: PromptOption) => {
    setEditingItem(item)
    setNameInput(item.name)
    setPromptInput(item.prompt)
    setEditorOpen(true)
  }

  const handleSave = () => {
    const trimmedName = nameInput.trim()
    const trimmedPrompt = promptInput.trim()
    if (!trimmedName || !trimmedPrompt) {
      notify.warning(t('settings.promptNameRequired'))
      return
    }
    if (editingItem) {
      updatePromptOptions({ ...editingItem, name: trimmedName, prompt: trimmedPrompt })
    } else {
      addPromptOptions({ id: '', name: trimmedName, prompt: trimmedPrompt })
    }
    setEditorOpen(false)
  }

  const handleDelete = (item: PromptOption) => {
    if (confirmDeleteId !== item.id) {
      setConfirmDeleteId(item.id)
      return
    }
    deletePromptOptions(item)
    setConfirmDeleteId(null)
  }

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    resetPromptOptions()
    setConfirmReset(false)
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    reorderPromptOptions(result.source.index, result.destination.index)
  }

  return (
    <div className="h-full w-full flex flex-col bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)]">
      <SubpageHeader
        title={t('mobileSettings.promptRules')}
        onBack={onBack}
        rightSlot={
          <button
            type="button"
            onClick={openAdd}
            className="h-8 px-3 rounded-full bg-[var(--rb-accent)] text-white text-xs font-semibold flex items-center gap-1"
          >
            <PlusOutlined />
            <span>{t('settings.addPrompt')}</span>
          </button>
        }
      />

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-safe-4 space-y-4">
        <p className="text-xs text-[var(--rb-text-secondary)] px-1">
          {t('mobile.dragToReorder')}
        </p>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="mobile-prompt-rules">
            {provided => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-2.5"
              >
                {promptOptions.map((item, index) => {
                  const isActive = item.id === selectedId
                  return (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(dragProvided, snapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={`rounded-2xl border bg-[var(--rb-bg-surface)] p-3.5 flex items-start gap-2.5 ${
                            snapshot.isDragging || isActive
                              ? 'border-[var(--rb-accent)]'
                              : 'border-[var(--rb-border)]'
                          }`}
                        >
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold truncate">{item.name}</span>
                              <button
                                type="button"
                                onClick={() => setSelectedId(item.id)}
                                className={`h-5 px-2 rounded-full text-[10px] font-semibold ${
                                  isActive
                                    ? 'bg-[var(--rb-accent)] text-white'
                                    : 'bg-[var(--rb-bg-muted)] text-[var(--rb-text-secondary)]'
                                }`}
                              >
                                {isActive
                                  ? t('mobileSettings.activeRule')
                                  : t('mobileSettings.setAsActive')}
                              </button>
                            </div>
                            <p className="text-xs text-[var(--rb-text-secondary)] line-clamp-2 leading-relaxed">
                              {item.prompt}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--rb-text-secondary)] active:bg-[var(--rb-bg-muted)]"
                              aria-label={t('common.edit')}
                            >
                              <EditOutlined />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              className={`h-8 px-2 rounded-lg flex items-center justify-center text-xs font-medium ${
                                confirmDeleteId === item.id
                                  ? 'bg-red-500 text-white'
                                  : 'text-red-500 active:bg-red-500/10'
                              }`}
                              aria-label={t('common.delete')}
                            >
                              {confirmDeleteId === item.id ? (
                                <span>{t('mobile.confirmDelete')}</span>
                              ) : (
                                <DeleteOutlined />
                              )}
                            </button>
                            <button
                              type="button"
                              {...dragProvided.dragHandleProps}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--rb-text-secondary)] touch-none cursor-grab active:cursor-grabbing"
                              aria-label={t('mobile.dragToReorder')}
                            >
                              <MenuOutlined />
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  )
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <SectionCard>
          <button
            type="button"
            onClick={handleReset}
            className={`w-full h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 ${
              confirmReset
                ? 'bg-red-500 text-white'
                : 'border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)]'
            }`}
          >
            <ReloadOutlined />
            <span>
              {confirmReset ? t('mobileSettings.confirmReset') : t('settings.resetPrompt')}
            </span>
          </button>
        </SectionCard>
      </div>

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)]">
          <SubpageHeader
            title={editingItem ? t('settings.editPrompt') : t('settings.addPrompt')}
            onBack={() => setEditorOpen(false)}
            rightSlot={
              <button
                type="button"
                onClick={handleSave}
                className="h-8 px-4 rounded-full bg-[var(--rb-accent)] text-white text-xs font-semibold"
              >
                {t('mobile.save')}
              </button>
            }
          />
          <div className="flex-1 min-h-0 flex flex-col px-4 pt-4 pb-safe-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--rb-text-secondary)] mb-1">
                {t('settings.promptName')}
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder={t('settings.promptName')}
                className="w-full h-10 px-3 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] text-sm outline-none focus:border-[var(--rb-accent)]"
              />
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <label className="block text-xs font-medium text-[var(--rb-text-secondary)] mb-1">
                {t('settings.promptContent')}
              </label>
              <textarea
                value={promptInput}
                onChange={e => setPromptInput(e.target.value)}
                placeholder={t('settings.promptContent')}
                className="flex-1 min-h-0 w-full p-3 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] text-sm leading-relaxed outline-none focus:border-[var(--rb-accent)] resize-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
