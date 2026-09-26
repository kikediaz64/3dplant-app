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
- Historial de diagnósticos por planta (commit 7e48e75, publicado en Netlify; el JS de producción,
  index-BV1cbvnZ.js, lleva los textos nuevos):
  - Cada planta guarda hasta 10 diagnósticos (fecha, estado, puntuación, miniatura); el más reciente es el
    «actual». Desde la ficha, «Nuevo diagnóstico» abre el escaneo de esa planta y guardar añade al historial
    (no crea planta nueva ni toca el riego). Las plantas antiguas muestran su diagnóstico de siempre como
    una fila; no hay migración.
  - Visto en producción (Kike, con captura): una planta con dos entradas en el historial (65/100 «Actual» y
    60/100 debajo), miniaturas distintas por entrada y el resto de la ficha intacto; el reescaneo funciona
    de punta a punta.
  - Visto solo en local: cancelar en el escaneo vuelve a la ficha y la X de la ficha va al jardín; la lógica
    de guardado con datos simulados (13 pruebas).
- Tres arreglos de la auditoría de código (2026-09-26), **solo en local: sin commit ni publicar**.
  Pasan `tsc --noEmit` y `npm run build`, y una prueba en Node contra el código anterior (que sí fallaba):
  - Datos de Mi Jardín corruptos (`plantStorage.ts`): ya no se pisan al guardar; el texto original se
    copia una vez en `savedPlants_corrupt_backup` de localStorage. No se recupera solo: hay que sacarlo a mano.
  - Cámara (`CameraView.tsx`): si sales antes de que responda, el stream se apaga (contador `requestRef`).
    Probado el componente real con jsdom y `getUserMedia` simulado; la luz real de la cámara no se ha visto.
  - Respuesta de la IA mal formada (`aiService.ts`): un JSON inválido o `null` da un mensaje amable con
    "Reintentar" (`AIUserError`, `unavailable`); una lista que llega como texto se convierte en lista de uno.
    Probado con `fetch` simulado (4 casos); no probado contra la IA real ni en pantalla.

## Qué está roto o sin verificar
- Historial de diagnósticos, sin comprobar en producción: la doble pulsación de «Guardar», el modo claro y
  cancelar un reescaneo. El caso de planta borrada antes de llegar a /result está sin proteger a propósito.
- Sin verificar en producción: el caso de cuota de OpenAI agotada (mensaje "no está disponible" y
  "Reintentar" activo sin cuenta atrás); solo probado en local con respuestas simuladas.
- React Doctor: el gancho de pre-commit (escanea solo los ficheros del commit) dio 14 avisos, 64/100 en
  7e48e75; antes eran 7 avisos, 69/100 en el escaneo completo. Alcance distinto: no se sabe cuántos son
  nuevos. Lo que salió: componente gigante en DiagnosisResult.tsx:102 y PlantDetail.tsx:15 (la ficha
  creció con la tarjeta del historial), complejidad alta en DiagnosisResult.tsx:102, índice como key
  (DiagnosisResult.tsx:415, PlantDetail.tsx:296/:311), claves de localStorage sin versión ×6 en
  plantStorage.ts (ya existían; `addDiagnosis` usa la misma), createObjectURL sin revoke en
  CameraView.tsx:84 y función pura dentro del componente en CameraView.tsx:65.

## Pendientes de endurecimiento (auditoría de code-auditor, 2026-09-26)
Salen de una lectura del código, sin ejecutarlo; ninguno está reproducido. Sin tocar código a propósito.
Las líneas son las del momento de la auditoría y pueden haberse movido en los archivos ya arreglados.
- 1. `aiService.ts:58-62` + `ai.mjs:141`: el 429 de Netlify se distingue del de OpenAI solo por si el cuerpo
  trae JSON con `error`. Si Netlify cambiara su respuesta, saldría "no disponible" sin cuenta atrás.
  Idea: campo explícito (`code: 'quota'`) en `ai.mjs` y que el cliente lo use.
- 2. `ai.mjs:71-75`: `diagnose` sin imagen o con base64 basura llega a OpenAI y gasta cuota (solo se mira
  el tope superior). Idea: 400 si viene vacía o no es base64 válido.
- 3. `ai.mjs:66-67`: cuerpo `null` o que no es JSON da 500 con el mensaje crudo, en vez de 400.
- 4. `ai.mjs:120-131`: el `clearTimeout` se ejecuta antes de leer el cuerpo de OpenAI; un corte ahí da
  500 "This operation was aborted" sin traducir.
- 8. `PlantDetail.tsx:58-62`: en una planta de ejemplo, "regar" cambia la pantalla pero no guarda nada
  (`updatePlant` no encuentra la planta).
- Gravedad baja:
  - 9. `DiagnosisResult.tsx:123-142`: no se cancela la llamada al salir; en desarrollo (StrictMode) hace 2
    llamadas y gasta el límite de 3/min; recargar `/result` sin guardar vuelve a diagnosticar la foto.
  - 10. `DiagnosisResult.tsx:247`: el `setTimeout` de navegación no se limpia al salir.
  - 11. `CameraView.tsx:93-105`: tras un error no se puede volver a elegir la misma foto (falta
    `input.value=''`); un comentario habla de Gemini pero el modelo es OpenAI.
  - 12. `PlantAssistant.tsx:113`: el campo de texto no tiene `maxLength`; con más de 500 caracteres llega
    un 413 y se pierde lo escrito.
  - 13. `ai.mjs:144`: el texto de error de OpenAI se reenvía tal cual al cliente.
- Nuevo, fuera de la lista del auditor (`aiService.ts`, `confidence`): la fórmula
  `Math.round((c ?? 0) * 100)` da 8500% si la IA devuelve el número ya en porcentaje (85) y NaN% si
  devuelve un texto como "alta" o "85%". Comprobado ejecutando la fórmula; no se ha visto en la app.
- `types.ts` no fue leído por el auditor y no hay tests automáticos ni script de tipos en `package.json`
  (`tsc --noEmit` se ha lanzado a mano).

## Siguiente paso
1. Decidir el commit de los 3 arreglos de la auditoría (pendiente de aprobación de Kike) y, ya publicados,
   comprobarlos en producción. Al aprobarlo, borrar los `.bak` (`plantStorage.ts.bak`, `CameraView.tsx.bak`,
   `aiService.ts.bak`), que no están en `.gitignore`.
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
Historial de diagnósticos: 7e48e75 historial por planta con reescaneo desde la ficha (publicado) · 52f527c docs de cierre
