import { useEffect } from 'react';
import { Form, Input, Modal, Slider } from 'antd';
import { Model } from '@/types/llm';
import { useTranslation } from '@/i18n/useTranslation';

interface ModelFormModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (model: Model) => void;
  initialValues?: Model;
  providerId: string
}

const ModelFormModal = ({
  visible,
  onCancel,
  onSubmit,
  initialValues,
  providerId
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
        temperature: values.temperature ?? 0.5,
        topP: values.topP ?? 1
      };
      onSubmit(modelData);
      form.resetFields();
    });
  };

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idValue = e.target.value;
    form.setFieldsValue({ name: idValue });
  };

  return (
    <Modal
      title={initialValues ? t('settings.editModel') : t('settings.addModel')}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      okText={t('common.ok')}
      cancelText={t('common.cancel')}
    >
      <Form form={form} layout="vertical" initialValues={initialValues || { temperature: 0.5, topP: 1 }}>
        <Form.Item name="id" label={t('settings.modelID')} required tooltip={t('settings.modelIDTooltip')} rules={[{ required: true, message: t('common.templates.pleaseEnter', { field: t('common.entities.modelID') }) }]}>
          <Input
            placeholder={t('settings.modelIDPlaceholder')}
            onChange={handleIdChange}
          />
        </Form.Item>
        <Form.Item name="name" label={t('settings.modelName')} tooltip={t('settings.modelNameTooltip')}>
          <Input placeholder={t('settings.modelNamePlaceholder')} />
        </Form.Item>
        <Form.Item name="temperature" label={t('settings.temperature')} tooltip={t('settings.temperatureTooltip')}>
          <Slider min={0} max={2} step={0.1} />
        </Form.Item>
        <Form.Item name="topP" label={t('settings.topP')} tooltip={t('settings.topPTooltip')}>
          <Slider min={0} max={1} step={0.1} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ModelFormModal;
