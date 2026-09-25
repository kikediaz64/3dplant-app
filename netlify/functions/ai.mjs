// 3dPlant — Función serverless que conecta con la IA (OpenAI GPT-4o-mini).
const MODEL = 'gpt-4o-mini';
const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

// Topes de tamaño para que nadie dispare el gasto de tokens con payloads enormes.
const MAX_IMAGE_BASE64_CHARS = 1_500_000; // ~1,1 MB reales; la app envía 150-500 KB
const MAX_QUESTION_CHARS = 500;
const MAX_CONTEXT_CHARS = 1000;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

const DIAGNOSE_PROMPT = `Eres un botánico y fitopatólogo experto. Analiza la imagen de la planta y devuelve ÚNICAMENTE un objeto JSON válido (sin markdown, sin texto adicional) con exactamente estas claves:

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
- "rootCauses": array de objetos { "title": string, "description": string } con 2 a 4 causas

Responde todo en español.`;

const ASK_SYSTEM_PROMPT = `Eres un experto en jardinería y cuidado de plantas (botánico y fitopatólogo). Responde dudas sobre riego, abono, plagas, enfermedades y remedios caseros.

Reglas obligatorias:
- Sé veraz y basado en evidencia. Si un remedio viral (leche, vinagre, bicarbonato, etc.) es un mito o es peligroso, dilo claramente.
- Da dosis exactas y seguras (ej. "jabón potásico 15-20 ml por litro").
- Advierte de riesgos (toxicidad, quemaduras por sol, exceso de riego o abono).
- Responde en español, claro y breve (máximo 3-4 párrafos o una lista).
- Si no estás seguro de algo, dilo en lugar de inventar.`;

export default async (request) => {
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
    if (action === 'diagnose') {
      const rawImage = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';
      if (rawImage.length > MAX_IMAGE_BASE64_CHARS) {
        return json({ error: 'La imagen es demasiado grande. Haz otra foto e inténtalo de nuevo.' }, 413);
      }
      const base64 = rawImage.split(',')[1] || rawImage;
      payload = {
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: DIAGNOSE_PROMPT },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}`, detail: 'low' } }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 1200
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 24000);
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
    const text = data?.choices?.[0]?.message?.content ?? '';
    return new Response(JSON.stringify({ text }), { status: 200, headers: { 'Content-Type': 'application/json' } });
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
