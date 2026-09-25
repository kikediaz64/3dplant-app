# ESTADO — 3dPlant v2 (2026-09-25)

## Qué funciona
- Diagnóstico por foto (OpenAI gpt-4o-mini vía función Netlify), Mi Jardín, riego, chat/asistente,
  PWA, respaldo JSON. Producción: https://famous-churros-89c618.netlify.app
- Deploy en Netlify activo (créditos repuestos; los pushes vuelven a publicarse solos).
- Función de IA protegida: la app llama a /api/ai (no a /.netlify/functions/ai, que ya da 404).
  - Rate limit nativo: 3 peticiones/min por IP y dominio (medido: en ráfaga pasan ~7 antes del 429,
    Netlify tarda hasta 10 s en empezar a bloquear).
  - Topes: imagen 1,5 MB (base64), pregunta 500 caracteres, contexto 1.000 (413 si se pasan).
  - 400 si la pregunta no es texto, está vacía o solo espacios. GET ya no devuelve hasKey.
- Recuadro falso "Área Afectada" eliminado del resultado del diagnóstico.

## Qué está roto o sin verificar
- Sin verificar: diagnóstico REAL desde el móvil con la ruta nueva /api/ai (solo se probó con
  peticiones de acción inválida, sin gastar OpenAI).
- El 429 llega al usuario sin mensaje amable (la respuesta va vacía; el cliente muestra "HTTP 429").
- Botones inferiores del resultado ("Guardar", "Volver") quedan fuera de la columna en escritorio.
- React Doctor: 7 avisos en DiagnosisResult.tsx (componente gigante, complejidad, valor estático en
  cada render línea 37, índice de array como key en líneas 269/279/304/328). Puntuación 67-69/100.

## Siguiente paso
1. Kike: un diagnóstico real desde el móvil para cerrar la verificación de extremo a extremo.
2. Prioridad 2: mensaje amable del 429, botones inferiores en escritorio, avisos de React Doctor.
3. Recomendado (lo hace Kike en OpenAI): límite mensual de gasto en Billing → Limits.

## Commits de esta sesión (Prioridad 1)
569e35b rate limiting + validación · 2a09e6e límite a 3/min · 9604b48 quita recuadro falso
