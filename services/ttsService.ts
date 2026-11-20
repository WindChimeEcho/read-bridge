import { getVolcengineTTS } from '@/services/tts'
import { getSystemTTSDriver } from '@/services/platform/ttsAdapter'
import { notify } from '@/services/platform/notify'
import type { TTSStatus, TTSStatusListener } from '@/services/tts/cpns/system'
import type { TTSConfig, Voice } from '@/types/tts'

export interface TTSController {
  speak: (text: string) => Promise<void>
  stop: () => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  getVoices: () => Promise<Voice[]>
  getStatus: () => TTSStatus
  subscribeStatus: (listener: TTSStatusListener) => () => void
}

const NOOP_CONTROLLER: TTSController = {
  speak: async () => {},
  stop: async () => {},
  pause: async () => {},
  resume: async () => {},
  getVoices: async () => [],
  getStatus: () => ({ isSpeaking: false, isPaused: false }),
  subscribeStatus: () => () => {},
}

export function createTTSController(provider: string, config: TTSConfig): TTSController {
  switch (provider) {
    case 'system': {
      const driver = getSystemTTSDriver()
      return {
        speak: (text: string) => driver.speak(text, config.system.voiceType, config.system.speedRatio),
        stop: () => driver.stop(),
        pause: () => driver.pause(),
        resume: () => driver.resume(),
        getVoices: () => driver.getVoices(),
        getStatus: () => driver.getStatus(),
        subscribeStatus: (listener) => driver.subscribeStatus(listener),
      }
    }
    case 'volcengine': {
      if (!config.volcengine.token || !config.volcengine.appid) {
        notify.error('请先配置火山引擎TTS的 token 和 appid')
        return NOOP_CONTROLLER
      }
      const volcengineTTS = getVolcengineTTS(config.volcengine.token, config.volcengine.appid)
      return {
        speak: async (text: string) => volcengineTTS.speak(text, config.volcengine.voiceType, config.volcengine.speedRatio),
        stop: async () => volcengineTTS.stop(),
        pause: async () => volcengineTTS.pause(),
        resume: async () => volcengineTTS.resume(),
        getVoices: () => volcengineTTS.getVoices(),
        getStatus: () => volcengineTTS.getStatus(),
        subscribeStatus: () => () => {},
      }
    }
    default:
      notify.error('请选择TTS提供商')
      return NOOP_CONTROLLER
  }
}

export function createTTSSpeak(provider: string, config: TTSConfig): ((text: string) => void) {
  const controller = createTTSController(provider, config)
  return (text: string) => {
    void controller.speak(text)
  }
}
