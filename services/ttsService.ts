
let lastSpokenAt = 0;
const MIN_INTERVAL_MS = 8000;

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

  speakWithBrowserTTS(text);
}

export function speakCalm(message: string): void {
  speakAlert(message, false);
}

export function speakUrgent(message: string): void {
  speakAlert(message, true);
}
