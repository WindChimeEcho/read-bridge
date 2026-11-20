import { TTSAPI, Voice } from "@/types/tts";

export type TTSStatus = {
  isSpeaking: boolean;
  isPaused: boolean;
};

export type TTSStatusListener = (status: TTSStatus) => void;

export interface SystemTTSAPI extends TTSAPI {
  isAvailable: () => Promise<boolean>;
  speak: (text: string, voiceType: string, speedRatio: number) => Promise<void>;
  subscribeStatus: (listener: TTSStatusListener) => () => void;
}

function getSystemTTS(): SystemTTSAPI {
  const isSpeechSynthesisSupported = typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window;

  let isSpeaking = false;
  let isPaused = false;
  let startTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let activeUtteranceId = 0;
  const listeners = new Set<TTSStatusListener>();

  function emitStatus() {
    const snapshot = { isSpeaking, isPaused };
    listeners.forEach(listener => listener(snapshot));
  }

  function setStatus(speaking: boolean, paused: boolean) {
    if (isSpeaking === speaking && isPaused === paused) return;
    isSpeaking = speaking;
    isPaused = paused;
    emitStatus();
  }

  function clearStartTimeout() {
    if (startTimeoutId !== null) {
      clearTimeout(startTimeoutId);
      startTimeoutId = null;
    }
  }

  async function isAvailable(): Promise<boolean> {
    return isSpeechSynthesisSupported;
  }

  async function getVoices(): Promise<Voice[]> {
    return new Promise((resolve) => {
      if (!isSpeechSynthesisSupported) {
        resolve([]);
        return;
      }

      const synthVoices = window.speechSynthesis.getVoices();
      if (synthVoices.length > 0) {
        resolve(synthVoices);
        return;
      }

      const handleVoicesChanged = () => {
        clearTimeout(timeoutId);
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        resolve(window.speechSynthesis.getVoices());
      };

      const timeoutId = setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        resolve([]);
      }, 3000);

      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    });
  }

  if (isSpeechSynthesisSupported) {
    void getVoices();
  }

  async function speak(text: string, voiceType: string, speedRatio: number): Promise<void> {
    if (!isSpeechSynthesisSupported) {
      return;
    }

    const utteranceId = ++activeUtteranceId;
    clearStartTimeout();
    window.speechSynthesis.cancel();
    setStatus(false, false);

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = await getVoices();
    if (utteranceId !== activeUtteranceId) return;

    const voice = voices.find(v => v.name === voiceType);
    if (voice) {
      utterance.voice = voice as SpeechSynthesisVoice;
    }

    utterance.rate = speedRatio;

    let hasStarted = false;
    startTimeoutId = setTimeout(() => {
      if (utteranceId !== activeUtteranceId || hasStarted) return;
      console.error('Speech synthesis timeout: Voice not started after 5 seconds');
      stop();
    }, 5000);

    utterance.onstart = () => {
      if (utteranceId !== activeUtteranceId) return;
      hasStarted = true;
      clearStartTimeout();
      setStatus(true, false);
    };

    utterance.onend = () => {
      if (utteranceId !== activeUtteranceId) return;
      clearStartTimeout();
      setStatus(false, false);
    };

    utterance.onerror = (event) => {
      if (utteranceId !== activeUtteranceId) return;
      clearStartTimeout();
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        console.error('Speech synthesis error:', event);
      }
      setStatus(false, false);
    };

    window.speechSynthesis.speak(utterance);
  }

  function pause(): void {
    if (!isSpeechSynthesisSupported || !isSpeaking || isPaused) {
      return;
    }

    window.speechSynthesis.pause();
    setStatus(true, true);
  }

  function resume(): void {
    if (!isSpeechSynthesisSupported || !isSpeaking || !isPaused) {
      return;
    }

    window.speechSynthesis.resume();
    setStatus(true, false);
  }

  function stop(): void {
    activeUtteranceId += 1;
    clearStartTimeout();
    if (isSpeechSynthesisSupported) {
      window.speechSynthesis.cancel();
    }
    setStatus(false, false);
  }

  function getStatus(): TTSStatus {
    return { isSpeaking, isPaused };
  }

  function subscribeStatus(listener: TTSStatusListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    isAvailable,
    getVoices,
    speak,
    pause,
    resume,
    stop,
    getStatus,
    subscribeStatus,
  };
}

export default getSystemTTS;
