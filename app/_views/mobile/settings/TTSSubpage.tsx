'use client'

import { useEffect, useMemo, useState } from 'react'
import { PauseCircleOutlined, SoundOutlined } from '@ant-design/icons'
import { useTranslation } from '@/i18n/useTranslation'
import { getSystemTTSDriver } from '@/services/platform/ttsAdapter'
import { useTTSStore } from '@/store/useTTSStore'
import type { Voice } from '@/types/tts'
import { getRuntimePlatform } from '@/utils/platform'
import { SectionCard, SubpageHeader, ToggleSwitch } from './SettingsPrimitives'

const SAMPLE_TEXT_BY_LANG: Record<string, string> = {
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
}

export default function TTSSubpage({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  const { ttsConfig, setTTSConfig, ttsGlobalConfig, setTTSGlobalConfig } = useTTSStore()
  const driver = useMemo(() => getSystemTTSDriver(), [])
  const runtime = useMemo(() => getRuntimePlatform(), [])

  const [available, setAvailable] = useState(true)
  const [voices, setVoices] = useState<Voice[]>([])
  const [isSpeaking, setIsSpeaking] = useState(false)

  useEffect(() => {
    let active = true
    void driver.isAvailable().then(flag => {
      if (active) setAvailable(flag)
    })
    void driver.getVoices().then(list => {
      if (active) setVoices(list)
    })
    const unsubscribe = driver.subscribeStatus(status => {
      setIsSpeaking(status.isSpeaking)
    })
    return () => {
      active = false
      unsubscribe()
      void driver.stop()
    }
  }, [driver])

  const groupedVoices = useMemo(() => {
    const byLang: Record<string, Voice[]> = {}
    voices.forEach(voice => {
      const lang = voice.lang || 'Unknown'
      if (!byLang[lang]) byLang[lang] = []
      byLang[lang].push(voice)
    })
    const entries = Object.entries(byLang).map(([lang, items]) => ({ lang, items }))
    const priority = entries.filter(item => item.lang === 'en-US' || item.lang === 'zh-CN')
    const others = entries.filter(item => item.lang !== 'en-US' && item.lang !== 'zh-CN')
    return [...priority, ...others]
  }, [voices])

  const systemConfig = ttsConfig.system

  const handleTestSpeech = () => {
    if (isSpeaking) {
      void driver.stop()
      return
    }
    const matched = voices.find(v => v.name === systemConfig.voiceType)
    const lang = matched?.lang || 'en-US'
    const sample = SAMPLE_TEXT_BY_LANG[lang] || SAMPLE_TEXT_BY_LANG['en-US']
    void driver.speak(sample, systemConfig.voiceType, systemConfig.speedRatio)
  }

  return (
    <div className="h-full w-full flex flex-col bg-[var(--rb-bg-canvas)] text-[var(--rb-text-primary)]">
      <SubpageHeader title={t('mobileSettings.ttsSettings')} onBack={onBack} />

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 pb-safe space-y-4">
        <div
          className={`rounded-2xl border px-3.5 py-3 text-xs leading-relaxed ${
            available
              ? 'border-[var(--rb-border)] bg-[var(--rb-bg-chrome)] text-[var(--rb-text-secondary)]'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          }`}
        >
          {!available
            ? t('mobileSettings.ttsUnavailable')
            : runtime === 'tauri-android'
              ? t('mobileSettings.ttsEnvAndroid')
              : t('mobileSettings.ttsEnvWeb')}
        </div>

        <SectionCard className="space-y-4">
          <h2 className="text-sm font-semibold">{t('settings.globalTTSSettings')}</h2>

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">{t('settings.autoSentenceTTS')}</span>
            <ToggleSwitch
              checked={ttsGlobalConfig.autoSentenceTTS}
              onChange={checked => setTTSGlobalConfig({ autoSentenceTTS: checked })}
              ariaLabel={t('settings.autoSentenceTTS')}
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--rb-border)]">
            <span className="text-sm">{t('settings.autoWordTTS')}</span>
            <ToggleSwitch
              checked={ttsGlobalConfig.autoWordTTS}
              onChange={checked => setTTSGlobalConfig({ autoWordTTS: checked })}
              ariaLabel={t('settings.autoWordTTS')}
            />
          </div>
        </SectionCard>

        <SectionCard className="space-y-4">
          <h2 className="text-sm font-semibold">{t('settings.systemTTS')}</h2>

          <div>
            <label className="block text-xs font-medium text-[var(--rb-text-secondary)] mb-1">
              {t('settings.ttsVoice')}
            </label>
            <select
              value={systemConfig.voiceType}
              onChange={e =>
                setTTSConfig('system', {
                  ...systemConfig,
                  voiceType: e.target.value,
                })
              }
              className="w-full h-10 px-3 rounded-xl border border-[var(--rb-border)] bg-[var(--rb-bg-canvas)] text-sm outline-none focus:border-[var(--rb-accent)]"
            >
              {systemConfig.voiceType && !voices.some(v => v.name === systemConfig.voiceType) && (
                <option value={systemConfig.voiceType}>{systemConfig.voiceType}</option>
              )}
              {groupedVoices.map(group => (
                <optgroup key={group.lang} label={group.lang}>
                  {group.items.map(voice => (
                    <option key={`${group.lang}-${voice.name}`} value={voice.name}>
                      {voice.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[var(--rb-text-secondary)]">
                {t('settings.ttsSpeed')}
              </label>
              <span className="text-xs font-semibold text-[var(--rb-accent)]">
                {systemConfig.speedRatio.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={systemConfig.speedRatio}
              onChange={e =>
                setTTSConfig('system', {
                  ...systemConfig,
                  speedRatio: parseFloat(e.target.value),
                })
              }
              className="w-full accent-[var(--rb-accent)]"
            />
          </div>

          <button
            type="button"
            disabled={!available}
            onClick={handleTestSpeech}
            className="w-full h-10 rounded-full bg-[var(--rb-accent)] text-white text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-45 active:opacity-90"
          >
            {isSpeaking ? <PauseCircleOutlined /> : <SoundOutlined />}
            <span>
              {isSpeaking ? t('mobileSettings.stopSpeech') : t('mobileSettings.testSpeech')}
            </span>
          </button>
        </SectionCard>
      </div>
    </div>
  )
}
