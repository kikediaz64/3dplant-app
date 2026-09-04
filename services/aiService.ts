
import { DiagnosisResult } from "../types";

const FUNCTION_URL = '/.netlify/functions/ai';

function extractJson(text: string): string {
  let cleaned = (text || '').trim();
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  return cleaned;
}

function normalizeSeverity(value: unknown): 'low' | 'moderate' | 'high' {
  const v = String(value ?? '').toLowerCase();
  if (v === 'alta' || v === 'high') return 'high';
  if (v === 'media' || v === 'moderate' || v === 'moderada' || v === 'medium') return 'moderate';
  return 'low';
}

async function callAI(body: Record<string, unknown>): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.text ?? '';
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('La IA tardó demasiado. Inténtalo de nuevo.');
    }
    throw new Error(error instanceof Error ? error.message : 'Error desconocido');
  } finally {
    clearTimeout(timeoutId);
  }
}

export const diagnosePlant = async (base64Image: string): Promise<DiagnosisResult> => {
  const text = await callAI({ action: 'diagnose', imageBase64: base64Image });
  const parsed = JSON.parse(extractJson(text));
  return {
    ...parsed,
    confidence: Math.round((parsed.confidence ?? 0) * 100),
    severity: normalizeSeverity(parsed.severity),
    actionPlan: parsed.actionPlan || [],
    rootCauses: parsed.rootCauses || [],
    symptoms: parsed.symptoms || [],
    pests: parsed.pests || []
  };
};

export const askPlantExpert = async (question: string, plantContext?: string): Promise<string> => {
  const text = await callAI({ action: 'ask', question, plantContext });
  return text || 'No pude generar una respuesta. Inténtalo de nuevo.';
};
