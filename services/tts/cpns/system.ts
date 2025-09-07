import { TTSAPI, Voice } from "@/types/tts";

function getSystemTTS(): TTSAPI {
  // 检查浏览器是否支持语音合成API
  const isSpeechSynthesisSupported = typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window;

  // 本地存储声音列表
  let voices: Voice[] = [];
  let isVoicesListenerAdded = false;

  // 判断是否正在播放语音
  let isSpeaking = false;
  // 判断是否暂停
  let isPaused = false;

  function getVoices(): Voice[] {
    if (!isSpeechSynthesisSupported) {
      console.warn('Speech synthesis is not supported in this browser');
      return [];
    }

    // 获取最新的声音列表
    const synthVoices = window.speechSynthesis.getVoices();

    if (synthVoices.length > 0) {
      voices = synthVoices;
    } else if (!isVoicesListenerAdded) {
      // 第一次调用返回空时，设置监听器等待 voiceschanged 事件
      const handleVoicesChanged = () => {
        voices = window.speechSynthesis.getVoices();
      };

      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      isVoicesListenerAdded = true;
    }

    return voices;
  }
  getVoices()
  function speak(text: string, voiceType: string, speedRatio: number): void {
    if (!isSpeechSynthesisSupported) {
      console.warn('Speech synthesis is not supported in this browser');
      return;
    }

    // 停止当前正在播放的语音
    window.speechSynthesis.cancel();
    isPaused = false;

    const utterance = new SpeechSynthesisUtterance(text);

    // 确保已获取最新的声音列表
    if (voices.length === 0) {
      voices = getVoices();
    }

    // 查找请求的声音类型
    const voice = voices.find(v => v.name === voiceType);

    if (voice) {
      utterance.voice = voice as SpeechSynthesisVoice;
    } else {
      console.warn(`Voice "${voiceType}" not found, using default voice`);
    }

    // 设置语音速率
    utterance.rate = speedRatio;

    // 添加超时检测
    let hasStarted = false;
    const timeoutId = setTimeout(() => {
      if (!hasStarted) {
        console.error('Speech synthesis timeout: Voice not started after 5 seconds');
        stop();
        isSpeaking = false;
      }
    }, 5000);

    // 设置事件处理器
    utterance.onstart = () => {
      hasStarted = true;
      clearTimeout(timeoutId);
      isSpeaking = true;
    };

    utterance.onend = () => {
      clearTimeout(timeoutId);
      isSpeaking = false;
      isPaused = false;
    };

    utterance.onerror = (event) => {
      clearTimeout(timeoutId);
      // 以防主动终端时显示预期中的报错
      if (event.error !== 'interrupted') {
        console.error('Speech synthesis error:', event);
      }
      isSpeaking = false;
      isPaused = false;
    };

    // 开始播放语音
    window.speechSynthesis.speak(utterance);
  }

  // 暂停语音播放
  function pause(): void {
    if (!isSpeechSynthesisSupported || !isSpeaking || isPaused) {
      return;
    }

    window.speechSynthesis.pause();
    isPaused = true;
  }

  // 恢复语音播放
  function resume(): void {
    if (!isSpeechSynthesisSupported || !isSpeaking || !isPaused) {
      return;
    }

    window.speechSynthesis.resume();
    isPaused = false;
  }

  // 停止语音播放
  function stop(): void {
    if (!isSpeechSynthesisSupported) {
      return;
    }

    window.speechSynthesis.cancel();
    isSpeaking = false;
    isPaused = false;
  }

  // 获取当前状态
  function getStatus(): { isSpeaking: boolean; isPaused: boolean } {
    return { isSpeaking, isPaused };
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

export default getSystemTTS

