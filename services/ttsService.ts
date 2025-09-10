import { getSystemTTS, getVolcengineTTS } from '@/services/tts'
import { TTSConfig } from '@/types/tts'
import { message } from 'antd'

export function createTTSSpeak(provider: string, config: TTSConfig): ((text: string) => void) {
  switch (provider) {
    case 'system':
      const systemTTS = getSystemTTS()
      return (text: string) => systemTTS.speak(text, config.system.voiceType, config.system.speedRatio)
    case 'volcengine':
      if (config.volcengine.token && config.volcengine.appid) {
        const volcengineTTS = getVolcengineTTS(config.volcengine.token, config.volcengine.appid)
        return (text: string) => volcengineTTS.speak(text, config.volcengine.voiceType, config.volcengine.speedRatio)
      }
      else {
        message.error('请先配置火山引擎TTS的 token 和 appid')
        return () => { }
      }
    default:
      message.error('请选择TTS提供商')
      return () => { }
  }
}

