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
import { BATCH_SIZES } from '@/constants/output'
import { OUTPUT_TYPE } from '@/constants/prompt'
import { useTranslation } from '@/i18n/useTranslation'
import { registerBackHandler } from '@/services/platform/backAdapter'
import { notify } from '@/services/platform/notify'
import { useOutputOptions } from '@/store/useOutputOptions'
import type { OutputOption } from '@/types/llm'
import type { OutputType } from '@/types/prompt'
import { SectionCard, SubpageHeader } from './SettingsPrimitives'

export default function SentenceRulesSubpage({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  const {
    sentenceOptions,
    addSentenceOptions,
    updateSentenceOptions,
    deleteSentenceOptions,
    reorderSentenceOptions,
    resetSentenceOptions,
    batchProcessingSize,
    setBatchProcessingSize,
  } = useOutputOptions()

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<OutputOption | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [typeInput, setTypeInput] = useState<OutputType>(OUTPUT_TYPE.MD)
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

  const typeLabelMap: Record<OutputType, string> = {
    [OUTPUT_TYPE.TEXT]: t('settings.text'),
    [OUTPUT_TYPE.SIMPLE_LIST]: t('settings.simpleList'),
    [OUTPUT_TYPE.KEY_VALUE_LIST]: t('settings.keyValueList'),
    [OUTPUT_TYPE.MD]: t('settings.markdown'),
  }

  const openAdd = () => {
    setEditingItem(null)
    setNameInput('')
    setTypeInput(OUTPUT_TYPE.MD)
    setPromptInput('')
    setEditorOpen(true)
  }

  const openEdit = (item: OutputOption) => {
    setEditingItem(item)
    setNameInput(item.name)
    setTypeInput(item.type)
    setPromptInput(item.rulePrompt)
    setEditorOpen(true)
  }

  const handleSave = () => {
    const trimmedName = nameInput.trim()
    const trimmedPrompt = promptInput.trim()
    if (!trimmedName || !trimmedPrompt) {
      notify.warning(t('settings.sentenceNameRequired'))
      return
    }
    if (editingItem) {
      updateSentenceOptions({
        ...editingItem,
        name: trimmedName,
        type: typeInput,
        rulePrompt: trimmedPrompt,
      })
    } else {
      addSentenceOptions({
        id: '',
        name: trimmedName,
        type: typeInput,
        rulePrompt: trimmedPrompt,
      })
    }
    setEditorOpen(false)
  }

  const handleDelete = (item: OutputOption) => {
    if (confirmDeleteId !== item.id) {
      setConfirmDeleteId(item.id)
      return
    }
    deleteSentenceOptions(item)
    setConfirmDeleteId(null)
  }

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    resetSentenceOptions()
    setConfirmReset(false)
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    reorderSentenceOptions(result.source.index, result.destination.index)
  }

  return (
    <div className="h-full w-full flex flex-col bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)]">
      <SubpageHeader
        title={t('mobileSettings.sentenceRules')}
        onBack={onBack}
        rightSlot={
          <button
            type="button"
            onClick={openAdd}
            className="h-8 px-3 rounded-full bg-[var(--rb-accent)] text-white text-xs font-semibold flex items-center gap-1"
          >
            <PlusOutlined />
            <span>{t('settings.addSentenceConfig')}</span>
          </button>
        }
      />

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 pb-safe space-y-4">
        <SectionCard className="space-y-2.5">
          <div>
            <div className="text-sm font-semibold">{t('mobileSettings.batchSize')}</div>
            <div className="text-xs text-[var(--rb-text-secondary)] mt-0.5">
              {t('settings.batchProcessingSizeTooltip')}
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {BATCH_SIZES.map(size => {
              const active = Number(batchProcessingSize) === size
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => setBatchProcessingSize(Number(size))}
                  className={`h-9 rounded-xl text-xs font-semibold border transition-colors ${
                    active
                      ? 'border-[var(--rb-accent)] bg-[var(--rb-highlight-bg)] text-[var(--rb-accent)]'
                      : 'border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] text-[var(--rb-text-secondary)]'
                  }`}
                >
                  {size}
                </button>
              )
            })}
          </div>
        </SectionCard>

        <p className="text-xs text-[var(--rb-text-secondary)] px-1">
          {t('mobile.dragToReorder')}
        </p>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="mobile-sentence-rules">
            {provided => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-2.5"
              >
                {sentenceOptions.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={`rounded-2xl border bg-[var(--rb-bg-surface)] p-3.5 flex items-start gap-2.5 ${
                          snapshot.isDragging
                            ? 'border-[var(--rb-accent)] shadow-lg'
                            : 'border-[var(--rb-border)]'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold truncate">{item.name}</span>
                            <span className="h-5 px-2 rounded-full bg-[var(--rb-highlight-bg)] text-[var(--rb-accent)] text-[10px] font-semibold inline-flex items-center">
                              {typeLabelMap[item.type] || item.type}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--rb-text-secondary)] line-clamp-2 leading-relaxed">
                            {item.rulePrompt}
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
                ))}
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
              {confirmReset
                ? t('mobileSettings.confirmReset')
                : t('settings.resetSentenceConfig')}
            </span>
          </button>
        </SectionCard>
      </div>

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)]">
          <SubpageHeader
            title={editingItem ? t('settings.editSentenceConfig') : t('settings.addSentenceConfig')}
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
          <div className="flex-1 min-h-0 flex flex-col p-4 pb-safe gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--rb-text-secondary)] mb-1">
                {t('settings.sentenceConfigName')}
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] text-sm outline-none focus:border-[var(--rb-accent)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--rb-text-secondary)] mb-1">
                {t('settings.sentenceType')}
              </label>
              <select
                value={typeInput}
                onChange={e => setTypeInput(e.target.value as OutputType)}
                className="w-full h-10 px-3 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] text-sm outline-none focus:border-[var(--rb-accent)]"
              >
                {Object.values(OUTPUT_TYPE).map(typeValue => (
                  <option key={typeValue} value={typeValue}>
                    {typeLabelMap[typeValue]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <label className="block text-xs font-medium text-[var(--rb-text-secondary)] mb-1">
                {t('settings.sentenceConfigPrompt')}
              </label>
              <textarea
                value={promptInput}
                onChange={e => setPromptInput(e.target.value)}
                className="flex-1 min-h-0 w-full p-3 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] text-sm leading-relaxed outline-none focus:border-[var(--rb-accent)] resize-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
