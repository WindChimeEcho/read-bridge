import { useEffect, useMemo, useState, useCallback } from 'react';
import { Menu, Button, Form, Modal, Input, Checkbox, message } from 'antd';
import { Provider, Model } from '@/types/llm';
import { useLLMStore } from '@/store/useLLMStore';
import { ModelFormModal, ProviderForm } from './cpns';
import Card from '../Card';
import { useTranslation } from '@/i18n/useTranslation';
import { fetchProviderModels, RemoteModel } from '@/services/ai/models';

export default function AiSection() {
  const { t } = useTranslation()
  const { providers: defaultProviders, addProvider, editProvider, deleteProvider } = useLLMStore()
  const [providers, setProviders] = useState<Provider[]>([])
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [form] = Form.useForm();
  const [modelModalVisible, setModelModalVisible] = useState(false);
  const [currentModel, setCurrentModel] = useState<Model | undefined>(undefined);

  const [remoteModelsCache, setRemoteModelsCache] = useState<Record<string, RemoteModel[]>>({});
  const [fetchingModels, setFetchingModels] = useState<boolean>(false);

  // Model Picker Modal state
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [fetchedModelsList, setFetchedModelsList] = useState<RemoteModel[]>([]);
  const [selectedImportIds, setSelectedImportIds] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    setProviders([...defaultProviders])
    if (selectedProviderId === '') {
      setSelectedProviderId(defaultProviders[0].id)
      setSelectedProvider(defaultProviders[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultProviders])

  useEffect(() => {
    if (selectedProvider) {
      form.setFieldsValue({
        name: selectedProvider.name,
        protocol: selectedProvider.protocol ?? (selectedProvider.id === 'openai' ? 'openai' : 'openai-compatible'),
        supportsStructuredOutputs: selectedProvider.supportsStructuredOutputs ?? true,
        baseUrl: selectedProvider.baseUrl,
        apiKey: selectedProvider.apiKey,
      });
    }
  }, [selectedProvider, form]);

  const menuItems = useMemo(() => providers.map((provider: Provider) => ({
    key: provider.id,
    label: (
      <div className="flex flex-col justify-center">
        <span className="text-base font-medium">{provider.name}</span>
        <span className="text-sm text-gray-500">{`${provider.models.length} ${t('settings.models')}`}</span>
      </div>
    ),
  })), [providers, t]);

  const handleMenuSelect = ({ key }: { key: string }) => {
    setSelectedProviderId(key);
    setSelectedProvider(providers.find(p => p.id === key) || null)
  };

  const handleProviderUpdate = (values: Provider) => {
    if (selectedProvider) {
      const updatedProvider = {
        ...selectedProvider,
        ...values
      };
      editProvider(updatedProvider);
      setSelectedProvider(updatedProvider);
    }
  };

  const handleFetchModels = useCallback(async (isAuto: boolean) => {
    if (!selectedProvider) return;
    const currentApiKey = form.getFieldValue('apiKey') || selectedProvider.apiKey;
    if (!currentApiKey || !currentApiKey.trim()) {
      if (!isAuto) {
        message.warning(t('settings.pleaseEnterApiKey'));
      }
      return;
    }

    if (isAuto && selectedProvider.models.length > 0) {
      return;
    }

    setFetchingModels(true);
    try {
      const tempProvider: Provider = {
        ...selectedProvider,
        apiKey: currentApiKey,
        baseUrl: form.getFieldValue('baseUrl') ?? selectedProvider.baseUrl,
        protocol: form.getFieldValue('protocol') ?? selectedProvider.protocol,
      };

      const fetched = await fetchProviderModels(tempProvider);
      setRemoteModelsCache(prev => ({ ...prev, [selectedProvider.id]: fetched }));

      if (fetched.length === 0) {
        if (!isAuto) {
          message.info(t('settings.noModelsFound'));
        }
        setFetchingModels(false);
        return;
      }

      message.success(t('settings.fetchModelsSuccess', { count: String(fetched.length) }));

      if (isAuto) {
        if (selectedProvider.models.length === 0 && fetched.length <= 5) {
          const newModels: Model[] = fetched.map(m => ({
            id: m.id,
            name: m.name || m.id,
            providerId: selectedProvider.id
          }));
          const updated = {
            ...selectedProvider,
            apiKey: currentApiKey,
            models: newModels
          };
          editProvider(updated);
          setSelectedProvider(updated);
          message.success(t('settings.autoImportedModels', { count: String(newModels.length) }));
        } else if (fetched.length > 5) {
          setFetchedModelsList(fetched);
          setSelectedImportIds(selectedProvider.models.map(m => m.id));
          setSearchText('');
          setPickerModalVisible(true);
        }
      } else {
        setFetchedModelsList(fetched);
        setSelectedImportIds(selectedProvider.models.map(m => m.id));
        setSearchText('');
        setPickerModalVisible(true);
      }
    } catch (error: unknown) {
      if (!isAuto) {
        message.error(t('settings.fetchModelsFailed', { error: error instanceof Error ? error.message : String(error) }));
      }
    } finally {
      setFetchingModels(false);
    }
  }, [selectedProvider, form, editProvider, t]);

  const handleImportSelectedModels = () => {
    if (!selectedProvider) return;
    const modelsMap = new Map(selectedProvider.models.map(m => [m.id, m]));

    for (const id of selectedImportIds) {
      if (!modelsMap.has(id)) {
        const remote = fetchedModelsList.find(m => m.id === id);
        modelsMap.set(id, {
          id,
          name: remote?.name || id,
          providerId: selectedProvider.id
        });
      }
    }

    const updatedModels = Array.from(modelsMap.values());
    const updated = {
      ...selectedProvider,
      models: updatedModels
    };
    editProvider(updated);
    setSelectedProvider(updated);
    setPickerModalVisible(false);
    message.success(t('common.templates.updateSuccess', { entity: t('settings.model') }));
  };

  const filteredPickerModels = useMemo(() => {
    if (!searchText.trim()) return fetchedModelsList;
    const lower = searchText.toLowerCase();
    return fetchedModelsList.filter(m =>
      m.id.toLowerCase().includes(lower) || m.name.toLowerCase().includes(lower)
    );
  }, [fetchedModelsList, searchText]);

  const handleAddModel = () => {
    setCurrentModel(undefined);
    setModelModalVisible(true);
  };

  const handleEditModel = (model: Model) => {
    setCurrentModel(model);
    setModelModalVisible(true);
  };

  const handleModelSubmit = (model: Model) => {
    if (!selectedProvider) return;

    let updatedModels: Model[];
    if (currentModel) {
      // Edit existing model
      updatedModels = selectedProvider.models.map(m =>
        m.id === currentModel.id ? model : m
      );
    } else {
      // Add new model
      updatedModels = [...selectedProvider.models, model];
    }

    const updatedProvider = {
      ...selectedProvider,
      models: updatedModels
    };

    editProvider(updatedProvider);
    setSelectedProvider(updatedProvider);
    setModelModalVisible(false);
  };

  const handleDeleteModel = (modelId: string) => {
    if (!selectedProvider) return;

    const updatedProvider = {
      ...selectedProvider,
      models: selectedProvider.models.filter(m => m.id !== modelId)
    };

    editProvider(updatedProvider);
    setSelectedProvider(updatedProvider);
  };

  const handleDeleteProvider = () => {
    if (selectedProvider && !selectedProvider.isDefault) {
      deleteProvider(selectedProvider.id);
      // Reset selection to first provider
      if (providers.length > 1) {
        const firstRemainingProvider = providers.find(p => p.id !== selectedProvider.id);
        if (firstRemainingProvider) {
          setSelectedProviderId(firstRemainingProvider.id);
          setSelectedProvider(firstRemainingProvider);
        }
      }
    }
  };

  const remoteModelsForCurrent = selectedProvider ? remoteModelsCache[selectedProvider.id] || [] : [];

  return (
    <Card className='h-[50vh] flex justify-between overflow-hidden'>
      <div className='w-[20%] h-full flex flex-col overflow-y-auto'>
        <Menu
          mode="vertical"
          selectedKeys={[selectedProviderId]}
          className="w-full h-40vh"
          items={menuItems}
          onClick={handleMenuSelect}
        />
        <Button className='h-[10%] mb-2' type="text" onClick={addProvider}>+</Button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {selectedProvider && (
          <ProviderForm
            provider={selectedProvider}
            form={form}
            onProviderUpdate={handleProviderUpdate}
            onAddModel={handleAddModel}
            onEditModel={handleEditModel}
            onDeleteModel={handleDeleteModel}
            onDeleteProvider={handleDeleteProvider}
            onFetchModels={handleFetchModels}
            fetchingModels={fetchingModels}
          />
        )}
      </div>

      <ModelFormModal
        visible={modelModalVisible}
        onCancel={() => setModelModalVisible(false)}
        onSubmit={handleModelSubmit}
        initialValues={currentModel}
        providerId={selectedProviderId}
        remoteModels={remoteModelsForCurrent}
      />

      <Modal
        title={t('settings.selectModelsToImport')}
        open={pickerModalVisible}
        onCancel={() => setPickerModalVisible(false)}
        onOk={handleImportSelectedModels}
        okText={t('common.ok')}
        cancelText={t('common.cancel')}
        width={600}
      >
        <div className="mb-4">
          <Input
            placeholder={t('settings.searchModelsPlaceholder')}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            allowClear
          />
        </div>
        <div className="max-h-[350px] overflow-y-auto">
          <Checkbox.Group
            value={selectedImportIds}
            onChange={(checkedValues) => setSelectedImportIds(checkedValues as string[])}
            style={{ width: '100%' }}
          >
            <div className="flex flex-col gap-2">
              {filteredPickerModels.map(m => (
                <Checkbox key={m.id} value={m.id}>
                  <span className="font-medium">{m.id}</span>
                  {m.name && m.name !== m.id && (
                    <span className="text-gray-500 ml-2">({m.name})</span>
                  )}
                </Checkbox>
              ))}
            </div>
          </Checkbox.Group>
        </div>
      </Modal>
    </Card>
  );
}
