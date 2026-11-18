import { useEffect } from 'react';
import { Form, Input, Modal, AutoComplete } from 'antd';
import { Model } from '@/types/llm';
import { useTranslation } from '@/i18n/useTranslation';

interface ModelFormModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (model: Model) => void;
  initialValues?: Model;
  providerId: string;
  remoteModels?: { id: string; name: string }[];
}

const ModelFormModal = ({
  visible,
  onCancel,
  onSubmit,
  initialValues,
  providerId,
  remoteModels
}: ModelFormModalProps) => {
  const { t } = useTranslation()
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible && initialValues) {
      form.setFieldsValue(initialValues);
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, initialValues, form]);

  const handleSubmit = () => {
    form.validateFields().then(values => {
      const modelData: Model = {
        id: values.id,
        name: values.name || values.id,
        providerId: providerId,
      };
      onSubmit(modelData);
      form.resetFields();
    });
  };

  const handleIdChange = (val: string) => {
    const matched = remoteModels?.find(m => m.id === val);
    form.setFieldsValue({ name: matched?.name || val });
  };

  const autoCompleteOptions = remoteModels?.map(m => ({
    value: m.id,
    label: m.name && m.name !== m.id ? `${m.id} (${m.name})` : m.id,
  })) || [];

  return (
    <Modal
      title={initialValues ? t('settings.editModel') : t('settings.addModel')}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText={t('common.ok')}
      cancelText={t('common.cancel')}
    >
      <Form form={form} layout="vertical" initialValues={initialValues}>
        <Form.Item name="id" label={t('settings.modelID')} required tooltip={t('settings.modelIDTooltip')} rules={[{ required: true, message: t('common.templates.pleaseEnter', { field: t('common.entities.modelID') }) }]}>
          <AutoComplete
            options={autoCompleteOptions}
            placeholder={t('settings.modelIDPlaceholder')}
            onChange={handleIdChange}
            filterOption={(inputValue, option) => (option?.value?.toString().toLowerCase().includes(inputValue.toLowerCase()) || option?.label?.toString().toLowerCase().includes(inputValue.toLowerCase())) ?? false}
          />
        </Form.Item>
        <Form.Item name="name" label={t('settings.modelName')} tooltip={t('settings.modelNameTooltip')}>
          <Input placeholder={t('settings.modelNamePlaceholder')} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ModelFormModal;
