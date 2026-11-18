import { useLLMStore } from "@/store/useLLMStore";
import { Form, Select, Empty } from "antd";
import { useEffect, useMemo, useCallback } from "react";
import Card from "../Card";
import { useTranslation } from "@/i18n/useTranslation";
import { ThinkingMode, ReasoningEffort } from "@/types/llm";

export default function DefaultModelSection() {
  const { t } = useTranslation();
  const {
    chatModel,
    setChatModel,
    parseModel,
    setParseModel,
    providers,
    chatThinking,
    setChatThinking,
    parseThinking,
    setParseThinking
  } = useLLMStore();
  const [form] = Form.useForm();

  const configuredProviders = useMemo(() => {
    return providers.filter(provider => {
      const needsBaseUrl = !provider.protocol || provider.protocol === 'openai-compatible'
      return provider.apiKey && provider.models.length > 0 && (!needsBaseUrl || provider.baseUrl)
    });
  }, [providers]);

  const hasModels = configuredProviders.length > 0;

  // 获取所有可用模型并按提供商分组
  const availableModelsGrouped = useMemo(() => {
    return configuredProviders.map(provider => ({
      label: provider.name,
      options: provider.models.map(model => ({
        value: `${provider.id}:${model.id}`,
        label: `${model.name} (${model.id})`,
      }))
    }));
  }, [configuredProviders]);

  // 获取所有可用模型的平铺列表
  const availableModels = useMemo(() => {
    return configuredProviders.flatMap(provider => provider.models);
  }, [configuredProviders]);

  useEffect(() => {
    if (!hasModels) {
      if (chatModel) {
        setChatModel(null);
      }

      if (parseModel) {
        setParseModel(null);
      }

      form.resetFields();
    } else {
      form.setFieldsValue({
        chatModel: chatModel ? `${chatModel.providerId}:${chatModel.id}` : undefined,
        parseModel: parseModel ? `${parseModel.providerId}:${parseModel.id}` : undefined,
        chatThinkingMode: chatThinking.mode,
        chatThinkingEffort: chatThinking.effort,
        parseThinkingMode: parseThinking.mode,
        parseThinkingEffort: parseThinking.effort,
      });
    }
  }, [chatModel, parseModel, chatThinking, parseThinking, hasModels, form, setChatModel, setParseModel]);

  const handleChatModelChange = useCallback((modelKey: string) => {
    const selectedModel = availableModels.find(model => `${model.providerId}:${model.id}` === modelKey);
    if (selectedModel) {
      setChatModel(selectedModel);
    }
  }, [availableModels, setChatModel]);

  const handleParseModelChange = useCallback((modelKey: string) => {
    const selectedModel = availableModels.find(model => `${model.providerId}:${model.id}` === modelKey);
    if (selectedModel) {
      setParseModel(selectedModel);
    }
  }, [availableModels, setParseModel]);

  const handleClearChatModel = useCallback(() => {
    setChatModel(null);
    form.setFieldValue('chatModel', undefined);
  }, [setChatModel, form]);

  const handleClearParseModel = useCallback(() => {
    setParseModel(null);
    form.setFieldValue('parseModel', undefined);
  }, [setParseModel, form]);

  const handleChatThinkingModeChange = useCallback((mode: ThinkingMode) => {
    setChatThinking({ ...chatThinking, mode });
  }, [chatThinking, setChatThinking]);

  const handleChatThinkingEffortChange = useCallback((effort: ReasoningEffort) => {
    setChatThinking({ ...chatThinking, effort });
  }, [chatThinking, setChatThinking]);

  const handleParseThinkingModeChange = useCallback((mode: ThinkingMode) => {
    setParseThinking({ ...parseThinking, mode });
  }, [parseThinking, setParseThinking]);

  const handleParseThinkingEffortChange = useCallback((effort: ReasoningEffort) => {
    setParseThinking({ ...parseThinking, effort });
  }, [parseThinking, setParseThinking]);

  const thinkingModeOptions = [
    { value: 'default', label: t('settings.thinkingModeDefault') },
    { value: 'enabled', label: t('settings.thinkingModeEnabled') },
    { value: 'disabled', label: t('settings.thinkingModeDisabled') },
  ];

  const reasoningEffortOptions = [
    { value: 'low', label: t('settings.reasoningEffortLow') },
    { value: 'medium', label: t('settings.reasoningEffortMedium') },
    { value: 'high', label: t('settings.reasoningEffortHigh') },
  ];

  return (
    <Card>
      {hasModels ? (
        <Form form={form} layout="vertical">
          <Form.Item
            name="chatModel"
            label={t('settings.chatModel')}
            tooltip={t('settings.chatModelTooltip')}
          >
            <Select
              placeholder={t('settings.selectChatModel')}
              style={{ width: '100%' }}
              onChange={handleChatModelChange}
              onClear={handleClearChatModel}
              allowClear
              disabled={!hasModels}
              options={availableModelsGrouped}
              optionFilterProp="label"
            />
          </Form.Item>

          <div className="flex gap-4">
            <Form.Item
              name="chatThinkingMode"
              label={t('settings.thinkingMode')}
              tooltip={t('settings.thinkingModeTooltip')}
              className="flex-1"
            >
              <Select
                options={thinkingModeOptions}
                onChange={handleChatThinkingModeChange}
              />
            </Form.Item>
            <Form.Item
              noStyle
              shouldUpdate={(prev, curr) => prev.chatThinkingMode !== curr.chatThinkingMode}
            >
              {({ getFieldValue }) => getFieldValue('chatThinkingMode') === 'enabled' && (
                <Form.Item
                  name="chatThinkingEffort"
                  label={t('settings.reasoningEffort')}
                  tooltip={t('settings.reasoningEffortTooltip')}
                  className="flex-1"
                >
                  <Select
                    options={reasoningEffortOptions}
                    onChange={handleChatThinkingEffortChange}
                  />
                </Form.Item>
              )}
            </Form.Item>
          </div>

          <Form.Item
            name="parseModel"
            label={t('settings.analyticalModel')}
            tooltip={t('settings.analyticalModelTooltip')}
          >
            <Select
              placeholder={t('settings.selectAnalyticalModel')}
              style={{ width: '100%' }}
              onChange={handleParseModelChange}
              onClear={handleClearParseModel}
              allowClear
              disabled={!hasModels}
              options={availableModelsGrouped}
              optionFilterProp="label"
            />
          </Form.Item>

          <div className="flex gap-4">
            <Form.Item
              name="parseThinkingMode"
              label={t('settings.thinkingMode')}
              tooltip={t('settings.thinkingModeTooltip')}
              className="flex-1"
            >
              <Select
                options={thinkingModeOptions}
                onChange={handleParseThinkingModeChange}
              />
            </Form.Item>
            <Form.Item
              noStyle
              shouldUpdate={(prev, curr) => prev.parseThinkingMode !== curr.parseThinkingMode}
            >
              {({ getFieldValue }) => getFieldValue('parseThinkingMode') === 'enabled' && (
                <Form.Item
                  name="parseThinkingEffort"
                  label={t('settings.reasoningEffort')}
                  tooltip={t('settings.reasoningEffortTooltip')}
                  className="flex-1"
                >
                  <Select
                    options={reasoningEffortOptions}
                    onChange={handleParseThinkingEffortChange}
                  />
                </Form.Item>
              )}
            </Form.Item>
          </div>
        </Form>
      ) : (
        <Empty
          description={t('settings.noAvailableModel')}
          className="py-6"
        />
      )}
    </Card>
  );
}
