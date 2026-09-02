const MODEL = 'gemini-3.6-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

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
- "rootCauses": array de objetos { "title": string, "description": string, "image": string (URL de imagen de ejemplo) } con 2 a 4 causas

Responde todo en español.`;

const ASK_SYSTEM_PROMPT = `Eres un experto en jardinería y cuidado de plantas (botánico y fitopatólogo). Responde dudas sobre riego, abono, plagas, enfermedades y remedios caseros.

Reglas obligatorias:
- Sé veraz y basado en evidencia. Si un remedio viral (leche, vinagre, bicarbonato, etc.) es un mito o es peligroso, dilo claramente.
- Da dosis exactas y seguras (ej. "jabón potásico 15-20 ml por litro").
- Advierte de riesgos (toxicidad, quemaduras por sol, exceso de riego o abono).
- Responde en español, claro y breve (máximo 3-4 párrafos o una lista).
- Si no estás seguro de algo, dilo en lugar de inventar.`;

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return new Response(JSON.stringify({ error: 'Clave de IA no configurada en el servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { action } = body;

    let payload;
    if (action === 'diagnose') {
      const base64 = (body.imageBase64 || '').split(',')[1] || body.imageBase64;
      payload = {
        contents: [{ parts: [{ inline_data: { mime_type: 'image/jpeg', data: base64 } }, { text: DIAGNOSE_PROMPT }] }],
        generationConfig: { responseMimeType: 'application/json' }
      };
    } else if (action === 'ask') {
      const { question, plantContext } = body;
      const context = plantContext ? `\n\nPlanta en cuestión: ${plantContext}` : '';
      payload = {
        contents: [{ parts: [{ text: `${ASK_SYSTEM_PROMPT}${context}\n\nPregunta del usuario: ${question}` }] }]
      };
    } else {
      return new Response(JSON.stringify({ error: 'Acción desconocida' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: `HTTP ${res.status}: ${errText.slice(0, 200)}` }), { status: res.status, headers: { 'Content-Type': 'application/json' } });
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return new Response(JSON.stringify({ text }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
