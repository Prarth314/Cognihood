
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { SafetyAssessment, SafetyState, DriverMetrics, AutonomyLevel } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeDrivingEnvironment = async (
  base64Image: string, 
  history: SafetyAssessment[]
): Promise<SafetyAssessment> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
          { text: `Analyze driver state from the current frame. Previous safety score was ${history[history.length-1]?.score || 100}. Determine fatigue, distraction, and cognitive load.` }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + `
        Ensure the following fields are also included in the JSON output:
        - cognitiveLoad: range 0-100
        - autonomyLevel: strictly one of "INFORM", "SUGGEST", "ASSIST", "OVERRIDE"
        - moodIntervention: a short string for audio/therapy suggestion
        - fingerprintDeviation: range 0-100 indicating deviation from baseline behavior`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["metrics", "explanation", "cognitiveLoad", "autonomyLevel"],
          properties: {
            metrics: {
              type: Type.OBJECT,
              required: ["ear", "blinkRate", "closureDuration", "headPose", "stressLevel", "distractionLevel"],
              properties: {
                ear: { type: Type.NUMBER },
                blinkRate: { type: Type.NUMBER },
                closureDuration: { type: Type.NUMBER },
                headPose: {
                  type: Type.OBJECT,
                  required: ["pitch", "yaw", "roll"],
                  properties: {
                    pitch: { type: Type.NUMBER },
                    yaw: { type: Type.NUMBER },
                    roll: { type: Type.NUMBER }
                  }
                },
                stressLevel: { type: Type.NUMBER },
                distractionLevel: { type: Type.NUMBER }
              }
            },
            cognitiveLoad: { type: Type.NUMBER },
            autonomyLevel: { type: Type.STRING },
            explanation: { type: Type.STRING },
            moodIntervention: { type: Type.STRING },
            fingerprintDeviation: { type: Type.NUMBER }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    const metrics: DriverMetrics = {
      ...result.metrics,
      cognitiveLoad: result.cognitiveLoad ?? 0
    };
    
    // Weighted safety score calculation
    // High distraction and stress significantly lower the score.
    const distractionWeight = (metrics.distractionLevel ?? 0) * 0.55;
    const stressWeight = (metrics.stressLevel ?? 0) * 0.25;
    const loadWeight = (metrics.cognitiveLoad ?? 0) * 0.15;
    const deviationWeight = (result.fingerprintDeviation ?? 0) * 0.05;

    let score = Math.max(0, 100 - (distractionWeight + stressWeight + loadWeight + deviationWeight));
    
    // If score is NaN due to unexpected model behavior, default to previous or 100
    if (isNaN(score)) score = history[history.length - 1]?.score || 100;

    let state = SafetyState.SAFE;
    if (score < 40) state = SafetyState.CRITICAL;
    else if (score < 70) state = SafetyState.WARNING;

    return {
      score,
      state,
      autonomyLevel: (result.autonomyLevel as AutonomyLevel) || AutonomyLevel.INFORM,
      explanation: result.explanation || "System monitoring active.",
      metrics,
      intervention: result.moodIntervention,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error("CogniIntelligence Analysis Failure", error);
    // Return a fallback assessment to prevent app crash
    return {
      score: history[history.length - 1]?.score || 100,
      state: SafetyState.SAFE,
      autonomyLevel: AutonomyLevel.INFORM,
      explanation: "Analysis interrupted. Maintaining baseline monitoring.",
      metrics: history[history.length - 1]?.metrics || { ear: 0.3, blinkRate: 12, closureDuration: 0.1, headPose: { pitch: 0, yaw: 0, roll: 0 }, stressLevel: 0, distractionLevel: 0, cognitiveLoad: 0 },
      timestamp: Date.now()
    };
  }
};

export const generateSpeech = async (text: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
};
