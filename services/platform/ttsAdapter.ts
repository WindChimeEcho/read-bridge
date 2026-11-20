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

export function getSystemTTSDriver(): SystemTTSDriver {
  if (!webSpeechDriver) {
    webSpeechDriver = createWebSpeechDriver()
  }

  // Stage 5 will wire tauri-plugin-tts here when running on Tauri Android.
  if (isTauriAndroid()) {
    return webSpeechDriver
  }

  return webSpeechDriver
}
