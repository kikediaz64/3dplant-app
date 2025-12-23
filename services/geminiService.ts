
import { GoogleGenAI, Type } from "@google/genai";
import { DiagnosisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

// Timeout wrapper for API calls
const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

export const diagnosePlant = async (base64Image: string): Promise<DiagnosisResult> => {
  console.log('diagnosePlant called');
  console.log('API Key exists:', !!import.meta.env.VITE_GEMINI_API_KEY);
  console.log('Image data length:', base64Image.length);

  const model = 'gemini-1.5-flash';
  console.log('Using model:', model);

  try {
    const apiCall = ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1] || base64Image,
            },
          },
          {
            text: "Analyze this plant image. Identify the species and check for any diseases or nutrient deficiencies. Provide a professional diagnosis following the strategic product guidelines: identify what it is, its impact, an immediate action plan, and root causes. Return the response in Spanish.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            speciesName: { type: Type.STRING, description: "Common name of the plant" },
            scientificName: { type: Type.STRING, description: "Scientific name" },
            problemName: { type: Type.STRING, description: "Main issue detected (e.g., Potassium Deficiency)" },
            confidence: { type: Type.NUMBER, description: "Confidence score 0-1" },
            impact: { type: Type.STRING, description: "Brief explanation of how this affects the plant" },
            isContagious: { type: Type.BOOLEAN },
            severity: {
              type: Type.STRING,
              description: "low, moderate, or high"
            },
            actionPlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  icon: { type: Type.STRING, description: "Material symbol icon name related to the action" }
                },
                required: ["title", "description", "icon"]
              }
            },
            rootCauses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  image: { type: Type.STRING, description: "A placeholder URL for the cause visual" }
                },
                required: ["title", "description", "image"]
              }
            }
          },
          required: ["speciesName", "scientificName", "problemName", "confidence", "impact", "severity", "actionPlan", "rootCauses"]
        }
      }
    });

    console.log('Waiting for API response...');
    const response = await withTimeout(apiCall, 30000); // 30 second timeout
    console.log('API response received');

    const result = JSON.parse(response.text || '{}');
    console.log('Parsed result:', result);

    return {
      ...result,
      confidence: Math.round(result.confidence * 100)
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error(`Error al analizar la planta: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
};
