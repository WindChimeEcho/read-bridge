export type TTSRequest = {
  text: string;
  token: string;
  appid: string;
  voiceType: string;
  speedRatio: number;
}

export type TTSAPI = {
  speak: (text: string, voiceType: string, speedRatio: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  getVoices: () => Promise<Voice[]>;
  getStatus: () => { isSpeaking: boolean; isPaused: boolean };
}

export type Voice = {
  lang: string;
  name: string;
}
