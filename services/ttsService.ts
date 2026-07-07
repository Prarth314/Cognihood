
import { generateSpeechLazy } from './geminiLoader';

let audioCtx: AudioContext | null = null;
let lastSpokenAt = 0;
const MIN_INTERVAL_MS = 8000;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioCtx;
}

async function playBase64Audio(base64: string): Promise<void> {
  const ctx = getAudioContext();
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);
  source.start();
}

function speakWithBrowserTTS(text: string): void {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

export async function speakAlert(text: string, force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastSpokenAt < MIN_INTERVAL_MS) return;
  lastSpokenAt = now;

  try {
    if (process.env.API_KEY && process.env.API_KEY !== 'PLACEHOLDER_API_KEY') {
      const audioData = await generateSpeechLazy(text);
      if (audioData) {
        await playBase64Audio(audioData);
        return;
      }
    }
  } catch {
    // fall through to browser TTS
  }

  speakWithBrowserTTS(text);
}

export function speakCalm(message: string): void {
  speakAlert(message, false);
}

export function speakUrgent(message: string): void {
  speakAlert(message, true);
}
