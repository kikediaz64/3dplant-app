
import { DiagnosisResult } from "../types";

const FUNCTION_URL = '/api/ai';

// Error con un mensaje ya listo para enseñar al usuario tal cual (sin prefijos técnicos).
export type AIUserErrorKind = 'rate-limit' | 'unavailable';

export class AIUserError extends Error {
  kind: AIUserErrorKind;
  constructor(message: string, kind: AIUserErrorKind) {
    super(message);
    this.kind = kind;
  }
}

const RATE_LIMIT_MESSAGE = 'Has hecho varias consultas muy seguidas. Espera un minuto y vuelve a intentarlo.';
const UNAVAILABLE_MESSAGE = 'El servicio de diagnóstico no está disponible en este momento. Inténtalo más tarde.';

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
      const err = await res.json().catch(() => null);
      if (res.status === 429) {
        // Con cuerpo JSON: el 429 lo generó ai.mjs por cuota/saldo de OpenAI (detalle solo a consola).
        // Sin cuerpo: es el rate limit de Netlify (demasiadas consultas seguidas).
        if (err?.error) {
          console.error('IA no disponible (cuota o saldo de OpenAI):', err.error);
          throw new AIUserError(UNAVAILABLE_MESSAGE, 'unavailable');
        }
        throw new AIUserError(RATE_LIMIT_MESSAGE, 'rate-limit');
      }
      throw new Error(err?.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.text ?? '';
  } catch (error) {
    if (error instanceof AIUserError) throw error;
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
