import { afterEach, expect, it, vi } from 'vitest';
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.resetModules(); });
it('allows an urgent cue to interrupt a calm cue but bounds urgent repetition', async () => {
  vi.useFakeTimers(); vi.setSystemTime(10000);
  const speak = vi.fn(), cancel = vi.fn();
  vi.stubGlobal('window', { speechSynthesis: { speak, cancel } });
  vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(public text: string) {} });
  const service = await import('./ttsService');
  service.speakCalm('calm'); service.speakUrgent('urgent'); service.speakUrgent('repeated');
  expect(speak).toHaveBeenCalledTimes(2);
  vi.advanceTimersByTime(8000); service.speakUrgent('later'); expect(speak).toHaveBeenCalledTimes(3);
  service.stopSpeech(); expect(cancel).toHaveBeenCalledTimes(4);
});
