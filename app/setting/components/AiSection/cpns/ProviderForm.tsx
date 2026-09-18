import { Form, Input, Button, Typography, Space, Popconfirm, FormInstance, Select, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Provider, Model } from '@/types/llm';
import ModelCard from './ModelCard';
import { useTranslation } from '@/i18n/useTranslation';
interface ProviderFormProps {
  provider: Provider;
  form: FormInstance<Provider>;
  onProviderUpdate: (values: Provider) => void;
  onAddModel: () => void;
  onEditModel: (model: Model) => void;
  onDeleteModel: (modelId: string) => void;
  onDeleteProvider: () => void;
}

const ProviderForm = ({
  provider,
  form,
  onProviderUpdate,
  onAddModel,
  onEditModel,
  onDeleteModel,
  onDeleteProvider
}: ProviderFormProps) => {
  const { t } = useTranslation()
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <Typography.Title level={4}>{provider.name}</Typography.Title>
        {!provider.isDefault && (
          <Popconfirm
            title={t('common.templates.confirmDelete', { entity: t('common.entities.providerAsObject') })}
            onConfirm={onDeleteProvider}
            okText={t('common.ok')}
            cancelText={t('common.cancel')}
          >
            <Button danger icon={<DeleteOutlined />}>{t('settings.deleteProvider')}</Button>
          </Popconfirm>
        )}
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onProviderUpdate}
        onValuesChange={(_, values) => onProviderUpdate(values)}
      >
        <Form.Item name="name" label={t('settings.providerName')} rules={[{ required: true }]}>
          <Input placeholder={t('settings.providerName')} />
        </Form.Item>

        <Form.Item name="protocol" label={t('settings.providerProtocol')} rules={[{ required: true }]}>
          <Select options={[
            { value: 'openai', label: 'OpenAI' },
            { value: 'anthropic', label: 'Anthropic' },
            { value: 'google', label: 'Google Gemini' },
            { value: 'openai-compatible', label: t('settings.openAICompatible') },
          ]} />
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(previous, current) => previous.protocol !== current.protocol}>
          {({ getFieldValue }) => getFieldValue('protocol') === 'openai-compatible' && (
            <Form.Item
              name="supportsStructuredOutputs"
              label={t('settings.structuredOutputs')}
              valuePropName="checked"
              tooltip={t('settings.structuredOutputsTooltip')}
            >
              <Switch />
            </Form.Item>
          )}
        </Form.Item>

        <Form.Item name="baseUrl" label={t('settings.baseURL')} tooltip={t('settings.baseURLTooltip')}>
          <Input placeholder={t('settings.baseURL')} />
        </Form.Item>

        <Form.Item name="apiKey" label={t('settings.apiKey')} rules={[{ required: true }]}>
          <Input.Password placeholder={t('settings.apiKey')} />
        </Form.Item>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <Typography.Title level={5}>{t('settings.model')}</Typography.Title>
            <Button type="primary" icon={<PlusOutlined />} onClick={onAddModel}>
              {t('settings.addModel')}
            </Button>
          </div>

          <Space direction="vertical" style={{ width: '100%' }}>
            {provider.models.map(model => (
              <ModelCard
                key={model.id}
                model={model}
                onEdit={onEditModel}
                onDelete={onDeleteModel}
              />
            ))}
          </Space>
        </div>
      </Form>
    </>
  );
};

export default ProviderForm;
