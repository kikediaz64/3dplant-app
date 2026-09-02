
import { DiagnosisResult } from "../types";

const API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL = 'gemini-3.6-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const PROMPT = `Eres un botánico y fitopatólogo experto. Analiza la imagen de la planta y devuelve ÚNICAMENTE un objeto JSON válido (sin markdown, sin texto adicional) con exactamente estas claves:

- "speciesName": string (nombre común de la planta)
- "scientificName": string (nombre científico)
- "family": string (familia botánica)
- "problemName": string (problema principal detectado, ej. "Deficiencia de potasio")
- "confidence": number (0 a 1)
- "impact": string (cómo afecta esto a la planta)
- "isContagious": boolean
- "severity": string ("low", "moderate" o "high")
- "healthScore": number (0 a 100)
- "healthStatus": string ("Saludable", "Aviso" o "Enferma")
- "urgency": string ("Baja", "Media" o "Alta")
- "hydration": string ("Sedienta", "Bien" o "Encharcada")
- "lightStatus": string ("Falta", "Adecuada" o "Exceso")
- "symptoms": array de strings (síntomas observados)
- "pests": array de strings (plagas o enfermedades detectadas)
- "isToxic": boolean (si es tóxica para mascotas o humanos)
- "zona": string ("Interior" o "Exterior")
- "luz": string ("Sol pleno", "Semisombra" o "Sombra")
- "tipo": string ("Aromática", "Floral", "Frutal", "Vegetal" u "Ornamental")
- "actionPlan": array de objetos { "title": string, "description": string, "icon": string (nombre de icono Material Symbols) } con 3 a 5 acciones inmediatas
- "rootCauses": array de objetos { "title": string, "description": string, "image": string (URL de imagen de ejemplo) } con 2 a 4 causas

Responde todo en español.`;

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

export const diagnosePlant = async (base64Image: string): Promise<DiagnosisResult> => {
  console.log('diagnosePlant called');
  console.log('API Key exists:', !!API_KEY);
  console.log('Image data length:', base64Image.length);

  const base64 = base64Image.split(',')[1] || base64Image;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: 'image/jpeg', data: base64 } },
              { text: PROMPT }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Gemini HTTP error:', res.status, errText);
      throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    console.log('Raw Gemini text:', text.slice(0, 200));

    const parsed = JSON.parse(extractJson(text));
    console.log('Parsed result:', parsed);

    return {
      ...parsed,
      confidence: Math.round((parsed.confidence ?? 0) * 100),
      severity: normalizeSeverity(parsed.severity),
      actionPlan: parsed.actionPlan || [],
      rootCauses: parsed.rootCauses || [],
      symptoms: parsed.symptoms || [],
      pests: parsed.pests || []
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Error al analizar la planta: la IA tardó demasiado. Por favor, intenta de nuevo.');
    }
    throw new Error(`Error al analizar la planta: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  } finally {
    clearTimeout(timeoutId);
  }
};

export const askPlantExpert = async (question: string, plantContext?: string): Promise<string> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const systemPrompt = `Eres un experto en jardinería y cuidado de plantas (botánico y fitopatólogo). Responde dudas sobre riego, abono, plagas, enfermedades y remedios caseros.

Reglas obligatorias:
- Sé veraz y basado en evidencia. Si un remedio viral (leche, vinagre, bicarbonato, etc.) es un mito o es peligroso, dilo claramente.
- Da dosis exactas y seguras (ej. "jabón potásico 15-20 ml por litro").
- Advierte de riesgos (toxicidad, quemaduras por sol, exceso de riego o abono).
- Responde en español, claro y breve (máximo 3-4 párrafos o una lista).
- Si no estás seguro de algo, dilo en lugar de inventar.`;

    const context = plantContext ? `\n\nPlanta en cuestión: ${plantContext}` : '';
    const fullPrompt = `${systemPrompt}${context}\n\nPregunta del usuario: ${question}`;

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }]
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return text || 'No pude generar una respuesta. Inténtalo de nuevo.';
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('La IA tardó demasiado. Inténtalo de nuevo.');
    }
    throw new Error(error instanceof Error ? error.message : 'Error desconocido');
  } finally {
    clearTimeout(timeoutId);
  }
};
