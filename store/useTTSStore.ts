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
}

export const useTTSStore = create<TTSStore>()(
  persist(
    (set) => ({
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
    }),
    {
      name: 'tts-storage',
    }
  )
) 