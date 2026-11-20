import getSystemTTS, { type TTSStatus, type TTSStatusListener } from '@/services/tts/cpns/system'
import type { Voice } from '@/types/tts'
import { isTauriAndroid } from '@/utils/platform'

export interface SystemTTSDriver {
  isAvailable: () => Promise<boolean>
  getVoices: () => Promise<Voice[]>
  speak: (text: string, voiceType: string, speedRatio: number) => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  stop: () => Promise<void>
  getStatus: () => TTSStatus
  subscribeStatus: (listener: TTSStatusListener) => () => void
}

let webSpeechDriver: SystemTTSDriver | null = null
let androidSpeechDriver: SystemTTSDriver | null = null

function createWebSpeechDriver(): SystemTTSDriver {
  const instance = getSystemTTS()
  return {
    isAvailable: () => instance.isAvailable(),
    getVoices: () => instance.getVoices(),
    speak: (text, voiceType, speedRatio) => instance.speak(text, voiceType, speedRatio),
    pause: async () => instance.pause(),
    resume: async () => instance.resume(),
    stop: async () => instance.stop(),
    getStatus: () => instance.getStatus(),
    subscribeStatus: (listener) => instance.subscribeStatus(listener),
  }
}

function createAndroidNativeTTSDriver(): SystemTTSDriver {
  let status: TTSStatus = { isSpeaking: false, isPaused: false }
  const listeners = new Set<TTSStatusListener>()
  const voiceIdByKey = new Map<string, string>()
  let eventsPromise: Promise<void> | null = null

  const updateStatus = (next: TTSStatus) => {
    status = next
    listeners.forEach(listener => listener({ ...status }))
  }

  const ensureEventListeners = async () => {
    if (eventsPromise) return eventsPromise
    eventsPromise = (async () => {
      try {
        const { onSpeechEvent } = await import('tauri-plugin-tts-api')
        await onSpeechEvent('speech:start', () => {
          updateStatus({ isSpeaking: true, isPaused: false })
        })
        await onSpeechEvent('speech:finish', () => {
          updateStatus({ isSpeaking: false, isPaused: false })
        })
        await onSpeechEvent('speech:cancel', () => {
          updateStatus({ isSpeaking: false, isPaused: false })
        })
        await onSpeechEvent('speech:error', () => {
          updateStatus({ isSpeaking: false, isPaused: false })
        })
        await onSpeechEvent('speech:interrupted', () => {
          updateStatus({ isSpeaking: false, isPaused: false })
        })
        await onSpeechEvent('speech:backgroundPause', () => {
          updateStatus({ isSpeaking: false, isPaused: false })
        })
      } catch (error) {
        eventsPromise = null
        console.error('Failed to attach Android TTS speech events:', error)
      }
    })()
    return eventsPromise
  }

  const getVoices = async (): Promise<Voice[]> => {
    if (!isTauriAndroid()) return []
    try {
      const tts = await import('tauri-plugin-tts-api')
      await ensureEventListeners()

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const initState = await tts.isInitialized().catch(() => ({ initialized: true, voiceCount: 0 }))
        if (initState.initialized) break
        await new Promise(resolve => setTimeout(resolve, 250))
      }

      const nativeVoices = await tts.getVoices()
      voiceIdByKey.clear()
      nativeVoices.forEach(voice => {
        voiceIdByKey.set(voice.id, voice.id)
        if (voice.name) {
          voiceIdByKey.set(voice.name, voice.id)
        }
      })

      return nativeVoices.map((voice, index) => ({
        name: voice.name || voice.id,
        lang: voice.language || 'en-US',
        default: index === 0,
      }))
    } catch (error) {
      console.error('Failed to get Android TTS voices:', error)
      return []
    }
  }

  return {
    isAvailable: async () => {
      if (!isTauriAndroid()) return false
      try {
        const tts = await import('tauri-plugin-tts-api')
        const state = await tts.isInitialized()
        return state.initialized || state.voiceCount >= 0
      } catch {
        return false
      }
    },

    getVoices,

    speak: async (text, voiceType, speedRatio) => {
      if (!isTauriAndroid() || !text.trim()) return
      try {
        const tts = await import('tauri-plugin-tts-api')
        await ensureEventListeners()

        if (voiceIdByKey.size === 0 && voiceType) {
          await getVoices()
        }

        const resolvedVoiceId = voiceType ? voiceIdByKey.get(voiceType) : undefined
        const clampedRate = Math.min(4.0, Math.max(0.1, Number.isFinite(speedRatio) ? speedRatio : 1.0))

        updateStatus({ isSpeaking: true, isPaused: false })
        await tts.speak({
          text,
          voiceId: resolvedVoiceId ?? null,
          rate: clampedRate,
          queueMode: 'flush',
        })
      } catch (error) {
        updateStatus({ isSpeaking: false, isPaused: false })
        console.error('Android native TTS speak failed:', error)
      }
    },

    pause: async () => {
      if (!isTauriAndroid()) return
      try {
        const tts = await import('tauri-plugin-tts-api')
        await tts.stop()
      } finally {
        updateStatus({ isSpeaking: false, isPaused: false })
      }
    },

    resume: async () => {
      // Android TextToSpeech does not support resuming an interrupted utterance.
    },

    stop: async () => {
      if (!isTauriAndroid()) return
      try {
        const tts = await import('tauri-plugin-tts-api')
        await tts.stop()
      } catch (error) {
        console.error('Android native TTS stop failed:', error)
      } finally {
        updateStatus({ isSpeaking: false, isPaused: false })
      }
    },

    getStatus: () => ({ ...status }),

    subscribeStatus: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export function getSystemTTSDriver(): SystemTTSDriver {
  if (isTauriAndroid()) {
    if (!androidSpeechDriver) {
      androidSpeechDriver = createAndroidNativeTTSDriver()
    }
    return androidSpeechDriver
  }

  if (!webSpeechDriver) {
    webSpeechDriver = createWebSpeechDriver()
  }
  return webSpeechDriver
}
