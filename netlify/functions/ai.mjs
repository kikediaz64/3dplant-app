// 3dPlant — Función serverless que conecta con la IA (OpenAI GPT-4o-mini).
import { getStore } from '@netlify/blobs';
import { validateImage, consumeDailyQuota, dailyStoreName } from '../lib/limites.mjs';
import { identifyPlant } from '../lib/plantnet.mjs';

const MODEL = 'gpt-4o-mini';
const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

// Topes de tamaño para que nadie dispare el gasto de tokens con payloads enormes.
const MAX_QUESTION_CHARS = 500;
const MAX_CONTEXT_CHARS = 1000;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

const DIAGNOSE_PROMPT = `Eres un botánico y fitopatólogo experto. Analiza la imagen de la planta y devuelve ÚNICAMENTE un objeto JSON válido (sin markdown, sin texto adicional) con exactamente estas claves:

- "speciesName": string (nombre común de la planta)
- "scientificName": string (nombre científico)
- "family": string (familia botánica)
- "problemName": string (problema principal detectado; si no se observa ninguno, "Sin problemas visibles")
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
- "actionPlan": array de objetos { "title": string, "description": string, "icon": string (nombre de icono Material Symbols) }; con problema, 3 a 5 acciones inmediatas; si está sana, 1 a 3 consejos de mantenimiento
- "rootCauses": array de objetos { "title": string, "description": string }; con problema, 2 a 4 causas plausibles; si está sana, puede ser []
- "careGuide": objeto con datos breves (1-2 frases cada uno) y específicos de la especie identificada: "origin" (origen), "soil" (suelo), "fertilizer" (abono), "seasonal" (cuidado estacional), "watering" (frecuencia y cómo regar), "light" (luz), "temperature" (rango en °C), "humidity" (humedad) y "commonPests" (array de plagas comunes)

No inventes síntomas ni problemas si la planta parece sana. En ese caso usa "healthStatus": "Saludable", "problemName": "Sin problemas visibles" y recomendaciones de mantenimiento. Si no conoces con seguridad un dato de careGuide, usa una cadena vacía o un array vacío en vez de inventarlo.

Responde todo en español.`;

const ASK_SYSTEM_PROMPT = `Eres un experto en jardinería y cuidado de plantas (botánico y fitopatólogo). Responde dudas sobre riego, abono, plagas, enfermedades y remedios caseros.

Reglas obligatorias:
- Sé veraz y basado en evidencia. Si un remedio viral (leche, vinagre, bicarbonato, etc.) es un mito o es peligroso, dilo claramente.
- Da dosis exactas y seguras (ej. "jabón potásico 15-20 ml por litro").
- Advierte de riesgos (toxicidad, quemaduras por sol, exceso de riego o abono).
- Responde en español, claro y breve (máximo 3-4 párrafos o una lista).
- Si no estás seguro de algo, dilo en lugar de inventar.`;

export default async (request, context) => {
  if (request.method === 'GET') {
    return json({ ok: true });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const API_KEY = process.env.OPENAI_API_KEY;
  if (!API_KEY) {
    return new Response(JSON.stringify({ error: 'Clave de IA (OPENAI_API_KEY) no configurada en el servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { action } = body;

    let payload;
    let diagnoseBase64;
    let diagnoseCandidates;
    if (action === 'diagnose') {
      const image = validateImage(body.imageBase64);
      if (!image.ok) {
        return json({ error: image.error }, image.status);
      }
      const base64 = image.base64;
      diagnoseBase64 = base64;
      payload = {
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: DIAGNOSE_PROMPT },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}`, detail: 'high' } }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 2000
      };
    } else if (action === 'ask') {
      const { question } = body;
      const plantContext = body.plantContext ?? '';
      if (typeof question !== 'string' || typeof plantContext !== 'string' || question.trim() === '') {
        return json({ error: 'Petición no válida.' }, 400);
      }
      if (question.length > MAX_QUESTION_CHARS) {
        return json({ error: `La pregunta es demasiado larga (máximo ${MAX_QUESTION_CHARS} caracteres).` }, 413);
      }
      if (plantContext.length > MAX_CONTEXT_CHARS) {
        return json({ error: `El contexto es demasiado largo (máximo ${MAX_CONTEXT_CHARS} caracteres).` }, 413);
      }
      const userMessage = plantContext
        ? `Planta en cuestión: ${plantContext}\n\nPregunta del usuario: ${question}`
        : `Pregunta del usuario: ${question}`;
      payload = {
        model: MODEL,
        messages: [
          { role: 'system', content: ASK_SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.4,
        max_tokens: 1000
      };
    } else {
      return new Response(JSON.stringify({ error: 'Acción desconocida' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Tope diario (A1): se cuenta antes de llamar a OpenAI, solo con peticiones ya validadas.
    // Si el almacén falla, no se llama a OpenAI (mejor sin servicio que sin control del gasto).
    if (!context?.ip) {
      console.warn('AVISO A1: no ha llegado la IP del visitante (context.ip vacío). Estas peticiones comparten un único cupo "desconocida".');
    }
    let quota;
    try {
      const store = getStore({ name: dailyStoreName(context?.deploy?.context), consistency: 'strong' });
      quota = await consumeDailyQuota(store, { action, ip: context?.ip });
    } catch (error) {
      console.error('No se pudo comprobar el tope diario:', error);
      return json({ error: 'El servicio no está disponible en este momento. Inténtalo más tarde.' }, 503);
    }
    if (!quota.allowed) {
      return json({ error: 'Se ha alcanzado el límite de consultas de hoy. Vuelve a intentarlo mañana.', code: 'daily-limit' }, 429);
    }

    const openAiStartedAt = Date.now();
    if (action === 'diagnose') {
      try {
        const candidates = await identifyPlant(diagnoseBase64);
        diagnoseCandidates = candidates?.filter(candidate => candidate.score >= 0.2);
        if (candidates?.some(candidate => candidate.score >= 0.2)) {
          const hints = candidates.map(candidate => {
            const commonNames = candidate.commonNames.length ? ` (${candidate.commonNames.join(', ')})` : '';
            return `${candidate.scientificName}${commonNames} (${Math.round(candidate.score * 100)} %)`;
          }).join(', ');
          payload.messages[0].content.unshift({
            type: 'text',
            text: `Pl@ntNet sugiere: ${hints}. Úsalo para speciesName/scientificName si encaja con lo que ves; si no, decide tú.`
          });
        }
      } catch {
        // La identificación es una pista opcional; un fallo no debe impedir el diagnóstico.
      }
    }

    const controller = new AbortController();
    const remainingMs = Math.max(0, 24000 - (Date.now() - openAiStartedAt));
    const timeoutId = setTimeout(() => controller.abort(), remainingMs);
    let res;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      let errText = '';
      try {
        const errJson = await res.json();
        errText = errJson?.error?.message || JSON.stringify(errJson).slice(0, 300);
      } catch {
        errText = await res.text().catch(() => '');
      }
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: 'Has alcanzado el límite de uso de OpenAI (cuota o saldo agotado). Revisa tu facturación o intenta más tarde.' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: `HTTP ${res.status}: ${errText.slice(0, 200)}` }), { status: res.status, headers: { 'Content-Type': 'application/json' } });
    }

    const data = await res.json();
    if (data?.choices?.[0]?.finish_reason === 'length') {
      return json({ error: 'La respuesta de la IA llegó incompleta. Vuelve a intentarlo.', code: 'truncated' }, 502);
    }
    const text = data?.choices?.[0]?.message?.content ?? '';
    return new Response(JSON.stringify({ text, ...(diagnoseCandidates?.length ? { candidates: diagnoseCandidates } : {}) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

// Rate limiting nativo de Netlify: 3 peticiones por minuto y por IP (respuesta 429 al pasarse).
// Netlify tarda hasta 10 s en empezar a bloquear, así que en ráfaga se cuelan algunas más.
export const config = {
  path: '/api/ai',
  rateLimit: {
    windowLimit: 3,
    windowSize: 60,
    aggregateBy: ['ip', 'domain']
  }
};
