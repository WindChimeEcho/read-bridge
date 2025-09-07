import { getSystemTTS, getVolcengineTTS } from '@/services/tts'
import { message } from 'antd'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TTSStore {
  ttsProvider: string
  setTTSProvider: (ttsProvider: string) => void
  ttsConfig: {
    system: {
      voiceType: string
      speedRatio: number
    }
    volcengine: {
      voiceType: string
      speedRatio: number
      appid: string
      token: string
    }
  }
  setTTSConfig: (type: string, config: {
    voiceType: string
    speedRatio: number
    appid?: string
    token?: string
  }) => void
  ttsGlobalConfig: {
    autoSentenceTTS: boolean
    autoWordTTS: boolean
  }
  setTTSGlobalConfig: (config: {
    autoSentenceTTS?: boolean
    autoWordTTS?: boolean
  }) => void
  getSpeak: () => ((text: string) => void) | null
}

export const useTTSStore = create<TTSStore>()(
  persist(
    (set, get) => ({
      ttsProvider: 'system',
      setTTSProvider: (ttsProvider) => set({ ttsProvider }),

      ttsConfig: {
        system: {
          voiceType: 'Google US English',
          speedRatio: 1.0,
        },
        volcengine: {
          voiceType: '',
          speedRatio: 1.0,
          appid: '',
          token: '',
        },
      },
      setTTSConfig: (type, config) => set((state) => ({
        ttsConfig: {
          ...state.ttsConfig,
          [type]: config,
        },
      })),

      ttsGlobalConfig: {
        autoSentenceTTS: true,
        autoWordTTS: true,
      },
      setTTSGlobalConfig: (config) => set((state) => ({
        ttsGlobalConfig: {
          ...state.ttsGlobalConfig,
          ...config,
        },
      })),
      getSpeak: () => {
        const { ttsProvider, ttsConfig } = get()

        switch (ttsProvider) {
          case 'system':
            return (text: string) => getSystemTTS().speak(text, ttsConfig.system.voiceType, ttsConfig.system.speedRatio)
          case 'volcengine':
            if (ttsConfig.volcengine.token && ttsConfig.volcengine.appid) {
              return (text: string) => getVolcengineTTS(ttsConfig.volcengine.token, ttsConfig.volcengine.appid).speak(text, ttsConfig.volcengine.voiceType, ttsConfig.volcengine.speedRatio)
            }
            else {
              message.error('请先配置火山引擎TTS的 token 和 appid')
              return null
            }
          default:
            message.error('请选择TTS提供商')
            return null
        }
      },
    }),
    {
      name: 'tts-storage',
    }
  )
) 