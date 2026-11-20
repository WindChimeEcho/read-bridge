'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { useTranslation } from '@/i18n/useTranslation'
import { fetchProviderModels, type RemoteModel } from '@/services/ai/models'
import { registerBackHandler } from '@/services/platform/backAdapter'
import { notify } from '@/services/platform/notify'
import { useLLMStore } from '@/store/useLLMStore'
import type { Model, Provider, ProviderProtocol } from '@/types/llm'
import { SectionCard, SubpageHeader, ToggleSwitch } from './SettingsPrimitives'

export default function AiProvidersSubpage({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  const { providers, addProvider, editProvider, deleteProvider } = useLLMStore()

  const [selectedId, setSelectedId] = useState<string>(() => providers[0]?.id ?? '')
  const [showApiKey, setShowApiKey] = useState(false)
  const [confirmDeleteProviderId, setConfirmDeleteProviderId] = useState<string | null>(null)
  const [fetchingModels, setFetchingModels] = useState(false)

  const [modelModalOpen, setModelModalOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<Model | null>(null)
  const [modelIdInput, setModelIdInput] = useState('')
  const [modelNameInput, setModelNameInput] = useState('')

  const [pickerOpen, setPickerOpen] = useState(false)
  const [remoteModels, setRemoteModels] = useState<RemoteModel[]>([])
  const [selectedImportIds, setSelectedImportIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const activeProvider = useMemo(
    () => providers.find(item => item.id === selectedId) ?? providers[0] ?? null,
    [providers, selectedId]
  )

  const activeProviderId = activeProvider?.id

  useEffect(() => {
    if (activeProviderId && activeProviderId !== selectedId) {
      setSelectedId(activeProviderId)
    }
  }, [activeProviderId, selectedId])

  useEffect(() => {
    setConfirmDeleteProviderId(null)
    setShowApiKey(false)
  }, [activeProviderId])

  useEffect(() => {
    if (!modelModalOpen && !pickerOpen) return
    return registerBackHandler(75, () => {
      if (modelModalOpen) {
        setModelModalOpen(false)
        return true
      }
      if (pickerOpen) {
        setPickerOpen(false)
        return true
      }
      return false
    })
  }, [modelModalOpen, pickerOpen])

  const updateActiveProvider = (patch: Partial<Provider>) => {
    if (!activeProvider) return
    editProvider({ ...activeProvider, ...patch })
  }

  const handleAddProvider = () => {
    addProvider()
    const created = useLLMStore.getState().providers.at(-1)
    if (created) {
      setSelectedId(created.id)
    }
  }

  const handleDeleteProvider = (provider: Provider) => {
    if (confirmDeleteProviderId !== provider.id) {
      setConfirmDeleteProviderId(provider.id)
      return
    }
    deleteProvider(provider.id)
    setConfirmDeleteProviderId(null)
  }

  const handleFetchModels = async () => {
    if (!activeProvider) return
    if (!activeProvider.apiKey.trim()) {
      notify.warning(t('settings.pleaseEnterApiKey'))
      return
    }
    setFetchingModels(true)
    try {
      const fetched = await fetchProviderModels(activeProvider)
      if (fetched.length === 0) {
        notify.info(t('settings.noModelsFound'))
        return
      }
      notify.success(t('settings.fetchModelsSuccess', { count: String(fetched.length) }))
      setRemoteModels(fetched)
      setSelectedImportIds(activeProvider.models.map(item => item.id))
      setSearchQuery('')
      setPickerOpen(true)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      notify.error(`${t('settings.fetchModelsFailed')}: ${msg}`)
    } finally {
      setFetchingModels(false)
    }
  }

  const filteredRemoteModels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return remoteModels
    return remoteModels.filter(item =>
      item.id.toLowerCase().includes(q) || (item.name && item.name.toLowerCase().includes(q))
    )
  }, [remoteModels, searchQuery])

  const handleSavePicker = () => {
    if (!activeProvider) return
    const selectedSet = new Set(selectedImportIds)
    const existingMap = new Map(activeProvider.models.map(m => [m.id, m]))
    const nextModels: Model[] = []

    remoteModels.forEach(remote => {
      if (!selectedSet.has(remote.id)) return
      const existing = existingMap.get(remote.id)
      nextModels.push(
        existing ?? {
          id: remote.id,
          name: remote.name || remote.id,
          providerId: activeProvider.id,
        }
      )
    })

    activeProvider.models.forEach(existing => {
      if (selectedSet.has(existing.id) && !nextModels.some(item => item.id === existing.id)) {
        nextModels.push(existing)
      }
    })

    updateActiveProvider({ models: nextModels })
    setPickerOpen(false)
  }

  const openAddModelModal = () => {
    setEditingModel(null)
    setModelIdInput('')
    setModelNameInput('')
    setModelModalOpen(true)
  }

  const openEditModelModal = (model: Model) => {
    setEditingModel(model)
    setModelIdInput(model.id)
    setModelNameInput(model.name)
    setModelModalOpen(true)
  }

  const handleSaveModel = () => {
    if (!activeProvider) return
    const trimmedId = modelIdInput.trim()
    const trimmedName = modelNameInput.trim() || trimmedId
    if (!trimmedId) {
      notify.warning(t('mobileSettings.modelId'))
      return
    }

    if (editingModel) {
      const duplicate = activeProvider.models.some(
        item => item.id === trimmedId && item.id !== editingModel.id
      )
      if (duplicate) {
        notify.warning(t('settings.modelAlreadyExists'))
        return
      }
      updateActiveProvider({
        models: activeProvider.models.map(item =>
          item.id === editingModel.id
            ? { id: trimmedId, name: trimmedName, providerId: activeProvider.id }
            : item
        ),
      })
    } else {
      if (activeProvider.models.some(item => item.id === trimmedId)) {
        notify.warning(t('settings.modelAlreadyExists'))
        return
      }
      updateActiveProvider({
        models: [
          ...activeProvider.models,
          { id: trimmedId, name: trimmedName, providerId: activeProvider.id },
        ],
      })
    }
    setModelModalOpen(false)
  }

  const handleDeleteModel = (modelId: string) => {
    if (!activeProvider) return
    updateActiveProvider({
      models: activeProvider.models.filter(item => item.id !== modelId),
    })
  }

  const effectiveProtocol =
    activeProvider?.protocol ?? (activeProvider?.id === 'openai' ? 'openai' : 'openai-compatible')

  return (
    <div className="h-full w-full flex flex-col bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)]">
      <SubpageHeader
        title={t('mobileSettings.aiProviders')}
        onBack={onBack}
        rightSlot={
          <button
            type="button"
            onClick={handleAddProvider}
            className="h-8 px-3 rounded-full bg-[var(--rb-highlight-bg)] text-[var(--rb-accent)] text-xs font-semibold flex items-center gap-1"
          >
            <PlusOutlined />
            <span>{t('mobileSettings.addProvider')}</span>
          </button>
        }
      />

      <div className="px-4 py-2.5 border-b border-[var(--rb-border)] bg-[var(--rb-bg-chrome)] shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {providers.map(provider => {
            const active = activeProvider?.id === provider.id
            return (
              <button
                key={provider.id}
                type="button"
                onClick={() => setSelectedId(provider.id)}
                className={`h-8 px-3.5 rounded-full text-xs font-medium shrink-0 border transition-colors flex items-center gap-1.5 ${
                  active
                    ? 'border-[var(--rb-accent)] bg-[var(--rb-accent)] text-white'
                    : 'border-[var(--rb-border)] bg-[var(--rb-bg-surface)] text-[var(--rb-text-primary)]'
                }`}
              >
                <span>{provider.name}</span>
                <span className={`text-[10px] ${active ? 'text-white/80' : 'text-[var(--rb-text-secondary)]'}`}>
                  ({provider.models.length})
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {activeProvider && (
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 pb-safe space-y-4">
          <SectionCard className="space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold truncate">{activeProvider.name}</h2>
              {!activeProvider.isDefault && (
                <button
                  type="button"
                  onClick={() => handleDeleteProvider(activeProvider)}
                  className={`h-7 px-2.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                    confirmDeleteProviderId === activeProvider.id
                      ? 'bg-red-500 text-white'
                      : 'text-red-500 bg-red-500/10'
                  }`}
                >
                  <DeleteOutlined className="text-[11px]" />
                  <span>
                    {confirmDeleteProviderId === activeProvider.id
                      ? t('mobileSettings.confirmDeleteAction')
                      : t('settings.deleteProvider')}
                  </span>
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--rb-text-secondary)] mb-1">
                {t('settings.providerName')}
              </label>
              <input
                type="text"
                value={activeProvider.name}
                onChange={e => updateActiveProvider({ name: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] text-sm outline-none focus:border-[var(--rb-accent)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--rb-text-secondary)] mb-1">
                {t('settings.providerProtocol')}
              </label>
              <select
                value={effectiveProtocol}
                onChange={e =>
                  updateActiveProvider({ protocol: e.target.value as ProviderProtocol })
                }
                className="w-full h-10 px-3 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] text-sm outline-none focus:border-[var(--rb-accent)]"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google Gemini</option>
                <option value="openai-compatible">{t('settings.openAICompatible')}</option>
              </select>
            </div>

            {effectiveProtocol === 'openai-compatible' && (
              <div className="flex items-center justify-between gap-3 py-1">
                <div className="min-w-0">
                  <div className="text-xs font-medium">{t('settings.structuredOutputs')}</div>
                  <div className="text-[11px] text-[var(--rb-text-secondary)] mt-0.5">
                    {t('settings.structuredOutputsTooltip')}
                  </div>
                </div>
                <ToggleSwitch
                  checked={activeProvider.supportsStructuredOutputs ?? true}
                  onChange={checked =>
                    updateActiveProvider({ supportsStructuredOutputs: checked })
                  }
                  ariaLabel={t('settings.structuredOutputs')}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[var(--rb-text-secondary)] mb-1">
                {t('settings.baseURL')}
              </label>
              <input
                type="url"
                value={activeProvider.baseUrl}
                onChange={e => updateActiveProvider({ baseUrl: e.target.value })}
                placeholder={t('settings.baseURL')}
                className="w-full h-10 px-3 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] text-sm outline-none focus:border-[var(--rb-accent)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--rb-text-secondary)] mb-1">
                {t('settings.apiKey')}
              </label>
              <div className="relative flex items-center">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={activeProvider.apiKey}
                  onChange={e => updateActiveProvider({ apiKey: e.target.value })}
                  placeholder={t('settings.apiKey')}
                  className="w-full h-10 pl-3 pr-10 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] text-sm outline-none focus:border-[var(--rb-accent)]"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(prev => !prev)}
                  className="absolute right-2 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--rb-text-secondary)]"
                  aria-label={showApiKey ? t('mobileSettings.hideKey') : t('mobileSettings.showKey')}
                >
                  {showApiKey ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-sm font-semibold">
                {t('settings.model')} ({activeProvider.models.length})
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={fetchingModels}
                  onClick={() => {
                    void handleFetchModels()
                  }}
                  className="h-8 px-3 rounded-full border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                >
                  <SyncOutlined spin={fetchingModels} />
                  <span>{t('settings.fetchModels')}</span>
                </button>
                <button
                  type="button"
                  onClick={openAddModelModal}
                  className="h-8 px-3 rounded-full bg-[var(--rb-accent)] text-white text-xs font-semibold flex items-center gap-1"
                >
                  <PlusOutlined />
                  <span>{t('settings.addModel')}</span>
                </button>
              </div>
            </div>

            {activeProvider.models.length === 0 ? (
              <div className="py-6 text-center text-xs text-[var(--rb-text-secondary)]">
                {t('settings.noModelsFound')}
              </div>
            ) : (
              <div className="space-y-2">
                {activeProvider.models.map(model => (
                  <div
                    key={model.id}
                    className="rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] px-3 py-2.5 flex items-center gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{model.name}</div>
                      <div className="text-[11px] text-[var(--rb-text-secondary)] truncate">
                        {model.id}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEditModelModal(model)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--rb-text-secondary)] active:bg-[var(--rb-bg-muted)]"
                      aria-label={t('common.edit')}
                    >
                      <EditOutlined />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteModel(model.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 active:bg-red-500/10"
                      aria-label={t('common.delete')}
                    >
                      <DeleteOutlined />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {modelModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)]">
          <SubpageHeader
            title={editingModel ? t('common.edit') : t('settings.addModel')}
            onBack={() => setModelModalOpen(false)}
            rightSlot={
              <button
                type="button"
                onClick={handleSaveModel}
                className="h-8 px-4 rounded-full bg-[var(--rb-accent)] text-white text-xs font-semibold"
              >
                {t('mobile.save')}
              </button>
            }
          />
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--rb-text-secondary)] mb-1">
                {t('mobileSettings.modelId')}
              </label>
              <input
                type="text"
                value={modelIdInput}
                onChange={e => setModelIdInput(e.target.value)}
                placeholder="gpt-4o-mini / claude-3-5-sonnet..."
                className="w-full h-10 px-3 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] text-sm outline-none focus:border-[var(--rb-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--rb-text-secondary)] mb-1">
                {t('mobileSettings.modelName')}
              </label>
              <input
                type="text"
                value={modelNameInput}
                onChange={e => setModelNameInput(e.target.value)}
                placeholder={t('mobileSettings.modelName')}
                className="w-full h-10 px-3 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] text-sm outline-none focus:border-[var(--rb-accent)]"
              />
            </div>
          </div>
        </div>
      )}

      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)]">
          <SubpageHeader
            title={t('settings.fetchModels')}
            onBack={() => setPickerOpen(false)}
            rightSlot={
              <button
                type="button"
                onClick={handleSavePicker}
                className="h-8 px-3.5 rounded-full bg-[var(--rb-accent)] text-white text-xs font-semibold"
              >
                {t('mobileSettings.importSelected', { count: String(selectedImportIds.length) })}
              </button>
            }
          />

          <div className="p-3 border-b border-[var(--rb-border)] bg-[var(--rb-bg-chrome)]">
            <div className="relative flex items-center">
              <SearchOutlined className="absolute left-3 text-xs text-[var(--rb-text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('mobileSettings.searchModels')}
                className="w-full h-9 pl-8 pr-3 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-surface)] text-sm outline-none focus:border-[var(--rb-accent)]"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 pb-safe space-y-1.5">
            {filteredRemoteModels.map(item => {
              const checked = selectedImportIds.includes(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setSelectedImportIds(prev =>
                      prev.includes(item.id)
                        ? prev.filter(id => id !== item.id)
                        : [...prev, item.id]
                    )
                  }
                  className={`w-full px-3 py-2.5 rounded-xl border text-left flex items-center gap-3 ${
                    checked
                      ? 'border-[var(--rb-accent)] bg-[var(--rb-highlight-bg)]'
                      : 'border-[var(--rb-border)] bg-[var(--rb-bg-surface)]'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[11px] ${
                      checked
                        ? 'bg-[var(--rb-accent)] text-white'
                        : 'border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)]'
                    }`}
                  >
                    {checked && <CheckOutlined />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate">{item.name || item.id}</div>
                    <div className="text-[11px] text-[var(--rb-text-secondary)] truncate">
                      {item.id}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
