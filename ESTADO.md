# ESTADO — 3dPlant v2 (2026-09-26)

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
- Mensajes amables para el 429 (commit 54c00da, publicado y verificado en producción):
  - Rate limit de Netlify (429 con cuerpo vacío): "Has hecho varias consultas muy seguidas. Espera un
    minuto y vuelve a intentarlo."
  - Cuota/saldo de OpenAI agotado (429 con JSON): "El servicio de diagnóstico no está disponible en este
    momento. Inténtalo más tarde." El detalle técnico va solo a la consola.
  - Se muestran sin prefijo en el diagnóstico y en el chat (clase AIUserError en aiService.ts).

## Qué está roto o sin verificar
- Sin verificar: diagnóstico REAL desde el móvil con la ruta nueva /api/ai (solo se probó con
  peticiones de acción inválida y GET, sin gastar OpenAI).
- Sin verificar: ver el mensaje amable del 429 EN PANTALLA en producción (verificado en local con
  respuestas simuladas; en producción se confirmó el JS publicado y que el 429 real llega vacío).
  El caso de cuota de OpenAI agotada solo está probado con simulación.
- Sin verificar: botón "Reintentar" en el error 429 (commit local, sin push: no está en producción).
  Probado solo en local con respuestas simuladas: reutiliza la misma foto; con rate limit sale
  deshabilitado con cuenta atrás de 60 s; con cuota agotada sale activo sin cuenta atrás; el resto de
  errores (500, timeout, etc.) siguen con "Tomar otra foto". Falta verlo con un 429 real.
- React Doctor: 7 avisos, puntuación 69/100 (react-doctor 0.9.14): componente gigante y complejidad
  alta en DiagnosisResult.tsx:102; índice de array como key en DiagnosisResult.tsx:370 (plan de acción,
  no tocado a propósito), PlantAssistant.tsx:89 y PlantDetail.tsx:243/:258; createObjectURL sin
  revokeObjectURL en CameraView.tsx:79.

## Siguiente paso
1. Kike: un diagnóstico real desde el móvil para cerrar la verificación de extremo a extremo (esperar
   1-2 min desde la última ráfaga de pruebas: el límite es por IP, 3/min).
2. Push del commit del botón "Reintentar" cuando Kike lo pida (Netlify publica solo) y comprobarlo en
   producción con un 429 real: debe salir "Reintentar en 60s" y activarse al terminar la cuenta atrás.
3. Prioridad 2, lo que queda: avisos de React Doctor.
4. Recomendado (lo hace Kike en OpenAI): límite mensual de gasto en Billing → Limits.

## Prioridad 4 (backlog)
- Botones de resultado (Guardar en Mi Jardín / Volver al Jardín) descolocados en escritorio (>768px) —
  cosmético, sin impacto en móvil, no priorizado

## Commits de esta sesión
Prioridad 1: 569e35b rate limiting + validación · 2a09e6e límite a 3/min · 9604b48 quita recuadro falso
Prioridad 2, punto 1: 54c00da mensaje amable del 429 (publicado en producción)
