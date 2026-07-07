import type { SafetyAssessment, TemporalAnalysis, LocalFaceSnapshot } from '../types';

let geminiModule: typeof import('./geminiService') | null = null;

async function loadGemini() {
  if (!geminiModule) {
    geminiModule = await import('./geminiService');
  }
  return geminiModule;
}

export async function analyzeDrivingEnvironmentLazy(
  base64Image: string,
  history: SafetyAssessment[],
  temporal?: TemporalAnalysis | null,
  localSnapshot?: LocalFaceSnapshot | null
) {
  const mod = await loadGemini();
  return mod.analyzeDrivingEnvironment(base64Image, history, temporal, localSnapshot);
}

export async function generateSpeechLazy(text: string) {
  const mod = await loadGemini();
  return mod.generateSpeech(text);
}
