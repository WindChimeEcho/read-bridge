import { Card, Typography, Space, Button, Popconfirm } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Model } from '@/types/llm';
import { useTranslation } from '@/i18n/useTranslation';
interface ModelCardProps {
  model: Model;
  onEdit: (model: Model) => void;
  onDelete: (modelId: string) => void;
}

const ModelCard = ({ model, onEdit, onDelete }: ModelCardProps) => {
  const { t } = useTranslation()
  return (
    <Card key={model.id} size="small">
      <div className="flex justify-between items-center">
        <div className='flex justify-start items-center'>
          <Typography.Text strong>{model.name}</Typography.Text>
          <Typography.Text className='ml-2 text-gray-500'>{model.id}</Typography.Text>
        </div>
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => onEdit(model)}
          />
          <Popconfirm
            title={t('common.templates.confirmDelete', { entity: t('common.entities.modelAsObject') })}
            onConfirm={() => onDelete(model.id)}
            okText={t('common.ok')}
            cancelText={t('common.cancel')}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
            />
          </Popconfirm>
        </Space>
      </div>

    </Card>
  );
};

export default ModelCard; 