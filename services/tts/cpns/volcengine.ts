import { TTSAPI, Voice } from "@/types/tts";

function getVolcengineTTS(token: string, appid: string): TTSAPI {

  function getVoices(): Promise<Voice[]> {
    return Promise.resolve([])
  }

  function speak(text: string, voiceType: string, speedRatio: number): void {
    console.log(text, voiceType, speedRatio, token, appid)
  }
  function stop(): void {
    console.log('stop')
  }
  function pause(): void {
    console.log('pause')
  }
  function resume(): void {
    console.log('resume')
  }
  function getStatus(): { isSpeaking: boolean; isPaused: boolean } {
    return { isSpeaking: false, isPaused: false }
  }


  return {
    getVoices,
    speak,
    pause,
    resume,
    stop,
    getStatus
  }
}

export default getVolcengineTTS
