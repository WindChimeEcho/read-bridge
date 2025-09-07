import { Form, Select, Slider, Row, Col, Button, Tooltip } from 'antd';
import { SoundOutlined } from "@ant-design/icons";
import useTranslation from "@/i18n/useTranslation";
import { useState, useEffect } from 'react';
import { TTSAPI } from '@/types/tts';

const { Option } = Select;

// 测试语音文本映射
const testTextByLanguage: Record<string, string> = {
  'zh-CN': '这是一个文字转语音的测试',
  'zh-TW': '這是一個文字轉語音的測試',
  'zh-HK': '這是一個文字轉語音的測試',
  'en-US': 'This is a test for text to speech',
  'en-GB': 'This is a test for text to speech',
  'ja-JP': 'これは音声合成のテストです',
  'ko-KR': '이것은 텍스트 음성 변환 테스트입니다',
  'fr-FR': 'Ceci est un test de synthèse vocale',
  'de-DE': 'Dies ist ein Test für Text-zu-Sprache',
  'es-ES': 'Esta es una prueba de texto a voz',
  'ru-RU': 'Это тест преобразования текста в речь',
};

interface TTSConfig {
  voiceType: string;
  speedRatio: number;
}

interface TTSFormProps {
  ttsConfig: TTSConfig;
  providerId: string;
  setTTSConfig: (provider: string, config: TTSConfig) => void;
  TTS: TTSAPI
}

export default function TTSForm({
  ttsConfig,
  providerId,
  setTTSConfig,
  TTS
}: TTSFormProps) {
  const { t } = useTranslation();
  const [voiceOptions, setVoiceOptions] = useState<Array<{
    label: string;
    options: Array<{ label: string; value: string }>;
  }>>([]);
  const [voiceLanguageMap, setVoiceLanguageMap] = useState<Record<string, string>>({});

  // 获取系统可用的声音列表
  useEffect(() => {
    TTS.getVoices().then(voices => {
      // 按语言分组
      const voicesByLang: Record<string, { label: string, value: string }[]> = {};
      const voiceLangMap: Record<string, string> = {};

      voices.forEach(voice => {
        const lang = voice.lang || 'Unknown';
        if (!voicesByLang[lang]) {
          voicesByLang[lang] = [];
        }
        voicesByLang[lang].push({
          label: voice.name,
          value: voice.name
        });

        // 保存每个声音对应的语言
        voiceLangMap[voice.name] = lang;
      });

      // 转换为分组后的选项
      const allOptions = Object.entries(voicesByLang).map(([lang, voices]) => ({
        label: lang,
        options: voices
      }));
      
      // 一次遍历分类，将 en-US 和 zh-CN 移到最前面
      const priorityOptions: typeof allOptions = [];
      const otherOptions: typeof allOptions = [];
      
      allOptions.forEach(opt => {
        if (opt.label === 'en-US' || opt.label === 'zh-CN') {
          priorityOptions.push(opt);
        } else {
          otherOptions.push(opt);
        }
      });
      
      setVoiceOptions([...priorityOptions, ...otherOptions]);

      // 保存声音到语言的映射
      setVoiceLanguageMap(voiceLangMap);
    })
  }, [TTS]);

  // 处理声音类型变更
  const handleVoiceChange = (value: string) => {
    setTTSConfig(providerId, {
      ...ttsConfig,
      voiceType: value
    });
  };

  // 处理语速变更
  const handleSpeedChange = (value: number) => {
    setTTSConfig(providerId, {
      ...ttsConfig,
      speedRatio: value
    });
  };

  // 测试TTS功能
  const testTTS = () => {
    const selectedVoice = ttsConfig.voiceType;
    const voiceLanguage = voiceLanguageMap[selectedVoice] || 'en-US';

    // 获取对应语言的测试文本，如果没有则使用英文
    const testText = testTextByLanguage[voiceLanguage] || testTextByLanguage['en-US'];

    TTS.speak(
      testText,
      selectedVoice,
      ttsConfig.speedRatio
    );
  };

  return (
    <div className="space-y-6">
      <Form layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
        <Form.Item label={t('settings.ttsVoice')}>
          <Row gutter={8} align="middle">
            <Col>
              <Select
                style={{ width: 240 }}
                value={ttsConfig.voiceType}
                onChange={handleVoiceChange}
                placeholder={t('settings.ttsVoice')}
              >
                {voiceOptions.map(group => (
                  <Select.OptGroup key={group.label} label={group.label}>
                    {group.options.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select.OptGroup>
                ))}
              </Select>
            </Col>
            <Col>
              <Tooltip title={t('settings.testVoice')}>
                <Button
                  icon={<SoundOutlined />}
                  onClick={testTTS}
                  type="text"
                  shape="circle"
                />
              </Tooltip>
            </Col>
          </Row>
        </Form.Item>

        <Form.Item label={t('settings.ttsSpeed')}>
          <Slider
            min={0.5}
            max={2}
            step={0.1}
            value={ttsConfig.speedRatio}
            onChange={handleSpeedChange}
            tooltip={{ formatter: (value) => `${value}x` }}
            style={{ width: 240 }}
          />
        </Form.Item>
      </Form>
    </div>
  );
} 