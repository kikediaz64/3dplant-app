
import { DiagnosisResult } from "../types";

const FUNCTION_URL = '/api/ai';

// Error con un mensaje ya listo para enseñar al usuario tal cual (sin prefijos técnicos).
export type AIUserErrorKind = 'rate-limit' | 'daily-limit' | 'unavailable';

export class AIUserError extends Error {
  kind: AIUserErrorKind;
  constructor(message: string, kind: AIUserErrorKind) {
    super(message);
    this.kind = kind;
  }
}

const RATE_LIMIT_MESSAGE = 'Has hecho varias consultas muy seguidas. Espera un minuto y vuelve a intentarlo.';
const DAILY_LIMIT_MESSAGE = 'Has llegado al límite de diagnósticos de hoy. Vuelve mañana.';
const DAILY_QUESTION_LIMIT_MESSAGE = 'Has llegado al límite de preguntas de hoy. Vuelve mañana.';
const UNAVAILABLE_MESSAGE = 'El servicio de diagnóstico no está disponible en este momento. Inténtalo más tarde.';
const BAD_RESPONSE_MESSAGE = 'La IA devolvió una respuesta que no se pudo entender. Inténtalo de nuevo.';

const ACTION_PLAN_ICONS = new Set([
  'water_drop', 'wb_sunny', 'content_cut', 'compost', 'bug_report', 'pest_control',
  'eco', 'spa', 'thermostat', 'humidity_percentage', 'local_florist', 'grass',
  'potted_plant', 'healing', 'visibility', 'schedule', 'task_alt'
]);

const ACTION_PLAN_ICON_SYNONYMS: Record<string, string> = {
  scissors: 'content_cut', cut: 'content_cut', prune: 'content_cut', pruning: 'content_cut',
  water: 'water_drop', sun: 'wb_sunny', light: 'wb_sunny', fertilizer: 'compost',
  fertiliser: 'compost', bug: 'pest_control', pest: 'pest_control'
};

export function normalizeActionPlanIcon(value: unknown): string {
  if (typeof value !== 'string') return 'task_alt';
  const icon = value.trim().toLowerCase();
  if (ACTION_PLAN_ICONS.has(icon)) return icon;
  return ACTION_PLAN_ICON_SYNONYMS[icon] ?? 'task_alt';
}

function normalizeActionPlan(value: unknown) {
  const actions = toArray(value, s => ({ title: 'Recomendación', description: s, icon: 'task_alt' }));
  return actions.flatMap((action: unknown) => {
    if (typeof action === 'string') {
      return action.trim()
        ? [{ title: 'Recomendación', description: action, icon: 'task_alt' }]
        : [];
    }
    if (action === null || typeof action !== 'object' || Array.isArray(action)) return [];

    const item = action as { title?: unknown; description?: unknown; icon?: unknown };
    const hasTitle = typeof item.title === 'string' && item.title.trim().length > 0;
    const hasDescription = typeof item.description === 'string' && item.description.trim().length > 0;
    if (!hasTitle && !hasDescription) return [];

    return [{
      title: hasTitle ? item.title : 'Recomendación',
      description: typeof item.description === 'string' ? item.description : '',
      icon: normalizeActionPlanIcon(item.icon)
    }];
  });
}

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

// Acepta confianza como fracción (0-1) o ya en porcentaje (0-100), incluido texto con "%".
// Si no se puede interpretar como número, devuelve 0 en vez de NaN.
function normalizeConfidence(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace('%', ''));
  if (!Number.isFinite(n)) return 0;
  const percent = n > 1 ? n : n * 100;
  return Math.min(100, Math.max(0, Math.round(percent)));
}

// La IA a veces devuelve un texto donde debería ir una lista: lista tal cual, texto suelto -> lista de uno, otra cosa -> [].
function toArray<T>(value: unknown, fromString: (s: string) => T): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string' && value.trim()) return [fromString(value)];
  return [];
}

interface PlantCandidate {
  scientificName: string;
  commonNames: string[];
  score: number;
  imageUrl: string | null;
}

async function callAI(body: Record<string, unknown>): Promise<{ text: string; candidates?: PlantCandidate[] }> {
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
        if (err?.code === 'daily-limit') {
          const message = body.action === 'ask' ? DAILY_QUESTION_LIMIT_MESSAGE : DAILY_LIMIT_MESSAGE;
          throw new AIUserError(message, 'daily-limit');
        }
        // Sin cuerpo: rate limit de Netlify. JSON con error pero sin código: cuota/saldo de OpenAI.
        if (err?.error) {
          console.error('IA no disponible (cuota o saldo de OpenAI):', err.error);
          throw new AIUserError(UNAVAILABLE_MESSAGE, 'unavailable');
        }
        throw new AIUserError(RATE_LIMIT_MESSAGE, 'rate-limit');
      }
      throw new Error(err?.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return { text: data.text ?? '', candidates: Array.isArray(data.candidates) ? data.candidates : undefined };
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

export const diagnosePlant = async (
  base64Image: string | string[],
  confirmedSpecies?: { scientificName: string; commonName?: string }
): Promise<DiagnosisResult> => {
  const response = await callAI({
    action: 'diagnose',
    ...(Array.isArray(base64Image) ? { imagesBase64: base64Image } : { imageBase64: base64Image }),
    ...(confirmedSpecies ? { confirmedSpecies } : {})
  });
  const text = response.text;
  let parsed: any;
  try {
    parsed = JSON.parse(extractJson(text));
  } catch (error) {
    console.error('Respuesta de la IA no es JSON válido:', error, text);
    throw new AIUserError(BAD_RESPONSE_MESSAGE, 'unavailable');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    console.error('Respuesta de la IA con formato inesperado:', parsed);
    throw new AIUserError(BAD_RESPONSE_MESSAGE, 'unavailable');
  }
  return {
    ...parsed,
    candidates: response.candidates,
    confidence: normalizeConfidence(parsed.confidence),
    severity: normalizeSeverity(parsed.severity),
    actionPlan: normalizeActionPlan(parsed.actionPlan),
    rootCauses: toArray(parsed.rootCauses, s => ({ title: 'Posible causa', description: s })),
    symptoms: toArray<string>(parsed.symptoms, s => s),
    pests: toArray<string>(parsed.pests, s => s)
  };
};

export interface PlantExpertExchange {
  question: string;
  answer: string;
}

export const askPlantExpert = async (
  question: string,
  plantContext?: string,
  history?: PlantExpertExchange[]
): Promise<string> => {
  // Acota también las respuestas largas sin alterar lo que se muestra en pantalla.
  const recentHistory = history?.slice(-6).map(({ question, answer }) => ({
    question: question.slice(0, 500),
    answer: answer.slice(0, 500)
  }));
  const { text } = await callAI({
    action: 'ask', question, plantContext,
    ...(recentHistory ? { history: recentHistory } : {})
  });
  return text || 'No pude generar una respuesta. Inténtalo de nuevo.';
};
