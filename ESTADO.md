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
- Diagnóstico real desde el móvil con la ruta /api/ai: funciona de punta a punta (confirmado por Kike).
- Botón "Reintentar" en el error 429 (commit ca3a93f), verificado en producción con capturas reales:
  se ve la cuenta atrás (de 55 s a 42 s) y el mensaje amable del 429; la pulsación de "Reintentar"
  solo probada en local.
  - Sustituye a "Tomar otra foto" solo en los errores 429; el resto (500, timeout, etc.) la mantienen.
  - Rate limit: deshabilitado con cuenta atrás de 60 s. Cuota agotada: activo sin cuenta atrás.

## Historial de diagnósticos por planta (commit 7e48e75, solo local, sin push)
- Cada planta guarda hasta 10 diagnósticos (fecha, estado, puntuación, miniatura); el más reciente es el
  «actual». Desde la ficha, «Nuevo diagnóstico» abre el escaneo de esa planta y guardar añade al historial
  (no crea planta nueva ni toca el riego). Las plantas antiguas muestran su diagnóstico de siempre como
  una fila; no hay migración.
- Visto en el navegador local (planta antigua sembrada a mano): la tarjeta con su fila, el botón «Nuevo
  diagnóstico» abre el escaneo, cancelar vuelve a la ficha, la X de la ficha va al jardín. `tsc` y build OK;
  lógica de guardado probada con datos simulados (13 pruebas).
- NO visto: un reescaneo real con la IA (guardar y ver la fila nueva), la doble pulsación en pantalla,
  móvil y modo claro. Nada en producción (falta push).

## Qué está roto o sin verificar
- Reescaneo real con IA sin probar (ver arriba). Hasta confirmarlo se mantienen 6 copias `.bak` sin borrar
  (types, plantStorage, CameraView, DiagnosisResult ×2, PlantDetail).
- Sin verificar en producción: el caso de cuota de OpenAI agotada (mensaje "no está disponible" y
  "Reintentar" activo sin cuenta atrás); solo probado en local con respuestas simuladas.
- React Doctor: el gancho de pre-commit (escanea solo los ficheros del commit) dio 14 avisos, 64/100 en
  7e48e75; antes eran 7 avisos, 69/100 en el escaneo completo. Alcance distinto: no se sabe cuántos son
  nuevos. Lo que salió: componente gigante en DiagnosisResult.tsx:102 y PlantDetail.tsx:15 (la ficha
  creció con la tarjeta del historial), complejidad alta en DiagnosisResult.tsx:102, índice como key
  (DiagnosisResult.tsx:415, PlantDetail.tsx:296/:311), claves de localStorage sin versión ×6 en
  plantStorage.ts (ya existían; `addDiagnosis` usa la misma), createObjectURL sin revoke en
  CameraView.tsx:84 y función pura dentro del componente en CameraView.tsx:65.

## Siguiente paso
1. Probar un reescaneo real con la IA (en producción tras el push, o en local si el endpoint /api/ai
   responde). Si sale bien: borrar los `.bak` y decidir el push de 7e48e75.
2. Prioridad 2, lo que queda: avisos de React Doctor.
3. Recomendado (lo hace Kike en OpenAI): límite mensual de gasto en Billing → Limits.

## Prioridad 4 (backlog)
- Botones de resultado (Guardar en Mi Jardín / Volver al Jardín) descolocados en escritorio (>768px) —
  cosmético, sin impacto en móvil, no priorizado

## Commits de esta sesión
Prioridad 1: 569e35b rate limiting + validación · 2a09e6e límite a 3/min · 9604b48 quita recuadro falso
Prioridad 2, punto 1: 54c00da mensaje amable del 429 (publicado en producción)
Prioridad 2, claves de React: 7130244 claves estables en DiagnosisResult + puntuación de React Doctor
Prioridad 2, botón Reintentar: ca3a93f Reintentar en el error 429 reutilizando la foto (publicado)
Historial de diagnósticos: 7e48e75 historial por planta con reescaneo desde la ficha (sin push)
