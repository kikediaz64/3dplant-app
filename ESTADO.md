# ESTADO — 3dPlant v2 (2026-09-27)

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
- Tres arreglos de la auditoría de código: commit `c2de8f4`, subido a `main` el 2026-09-26.
  **Confirmado en producción por Kike, con capturas:**
  - Datos de Mi Jardín corruptos (`plantStorage.ts`): probado en incógnito con datos rotos (`{"a":1}`); la
    app lo detectó ("Saved plants data is not an array, ignoring it"), guardó la copia en
    `savedPlants_corrupt_backup` y el jardín nuevo se guardó bien sin perder nada.
  - Cámara (`CameraView.tsx`): diagnóstico normal (Pothos, 70% coincidencia, 65/100) sin errores; sigue sin
    verse específicamente la luz de la cámara apagándose al salir antes de tiempo.
  - Respuesta de la IA mal formada (`aiService.ts`): cubierto por el mismo diagnóstico normal sin errores;
    no se ha forzado en producción un caso de JSON inválido/`null`.
  - En local pasan `tsc --noEmit` y `npm run build`, y las pruebas en Node contra el código anterior (que sí
    fallaba) para los tres casos.
- Fallo de `confidence` en `aiService.ts` arreglado: `normalizeConfidence` sustituye a
  `Math.round((confidence ?? 0) * 100)`. Acepta fracción (0-1) o ya-porcentaje (0-100), texto con "%", y
  cualquier valor no numérico ("alta", `null`) cae a 0 en vez de dar NaN%. Verificado con `tsc --noEmit`
  (sin errores) y un script Node suelto con 9 casos (0.85→85, 85→85, 100→100, 1→100, "85%"→85, "alta"→0,
  null→0, undefined→0, 0→0), todos OK. **Sin probar aún** contra la IA real ni en pantalla.
- Mejora de precisión, paso 1: `detail: 'low'` → `'high'` en la imagen enviada a OpenAI en
  `ai.mjs` (diagnóstico, no `ask`). La imagen que llega ya está redimensionada a 1024px por
  `CameraView.tsx`. Coste estimado ×4 por diagnóstico (de ~0,001 $ a ~0,004-0,005 $), dentro
  del tope duro de 5 $/mes (~1.000-1.200 diagnósticos/mes de margen). Timeout de 24s sin
  cambios, con margen de sobra. Verificado con `node --check` (sintaxis OK); **sin probar
  aún** contra la IA real ni en producción. Copia de seguridad en `ai.mjs.bak`. El paso 2
  (separar identificación de especie y diagnóstico en dos llamadas) queda pendiente, solo si
  hace falta tras probar este cambio.
- Troceado de `DiagnosisResult.tsx` (componente gigante, aviso de React Doctor) en marcha, con diff aprobado
  + `tsc` + `build` + prueba visual entre cada pieza. Alcance de la sesión: solo `LoadingView`,
  `RootCausesList` y `ActionPlanList`; `SummaryCard`, `BottomBar` y `TopBar` quedan para otra sesión.
  `handleSavePlant`, el `useEffect` inicial y `DiagnosisError` no se tocan; la key `idx` de `ActionPlanList`
  se deja igual, fuera de alcance. Extraídas y confirmadas visualmente: `LoadingView` y `RootCausesList`.
  **`ActionPlanList` diagnosticada y con diff mostrado, pero sin aprobar ni aplicar** — el archivo real
  sigue con el bloque de "Plan de Acción Inmediato" tal cual estaba, sin extraer.

## Qué está roto o sin verificar
- Pendiente, gravedad baja, no bloqueante: en consola de producción sale repetido "Uncaught (in promise)
  TypeError: Failed to execute 'put' on 'Cache': Request method 'POST' is unsupported" (`sw.js:48`). El
  service worker intenta cachear cualquier respuesta 200 sin mirar el método, y cae en las peticiones POST
  a `/api/ai`; los navegadores no soportan cachear POST. No impide el funcionamiento (todo funciona bien a
  pesar del error). Sin tocar código a propósito.
- El hook de pre-commit de React Doctor dio 8 avisos, 74/100 en `c2de8f4` (avisó de «regresiones» y no
  bloqueó). No se ha comprobado cuáles de los 8 son nuevos; los que se vieron ya figuraban abajo.
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
- `types.ts` no fue leído por el auditor y no hay tests automáticos ni script de tipos en `package.json`
  (`tsc --noEmit` se ha lanzado a mano).

## Siguiente paso
1. Retomar el troceado de `DiagnosisResult.tsx`: aprobar y aplicar el diff de `ActionPlanList` (ya
   diagnosticado), verificar (`tsc` + `build` + pantalla), y seguir con `SummaryCard`, `BottomBar` y
   `TopBar` en otra sesión.
2. **Pendiente de diagnóstico, sin empezar:** mejora de precisión en `netlify/functions/ai.mjs` — separar
   identificación de especie y diagnóstico en dos llamadas a OpenAI (en vez de una sola), y cambiar
   `detail: 'low'` a `'high'` en la imagen. Sin código tocado, sin medir tiempo/coste/impacto en el rate
   limit todavía. Antes de implementar: diagnóstico completo (qué cambia en la latencia con dos llamadas,
   coste extra por doble llamada + `detail: 'high'` más caro, y si el rate limit de 3/min por IP sigue
   siendo suficiente con llamadas más lentas).
3. Prioridad 2, lo que queda: resto de avisos de React Doctor.
4. ~~Recomendado (lo hace Kike en OpenAI): límite mensual de gasto en Billing → Limits.~~ Hecho:
   límite duro de 5 $/mes configurado el 2026-09-26, con aviso por email.

## Prioridad 4 (backlog)
- Botones de resultado (Guardar en Mi Jardín / Volver al Jardín) descolocados en escritorio (>768px) —
  cosmético, sin impacto en móvil, no priorizado
- Curiosidad menor, sin prioridad: en iOS, al salir de la cámara el indicador de grabación pasa de verde a
  naranja brevemente, aunque el código pide `audio: false` (CameraView.tsx) y no hay ningún acceso a
  micrófono en todo el proyecto (confirmado por búsqueda de código: sin `getUserMedia` con audio, sin
  `MediaRecorder`, sin `SpeechRecognition`). Probablemente comportamiento propio de iOS/Safari con la sesión
  de audio del sistema, no un fallo de la app. No se ha encontrado fuente que lo confirme con exactitud;
  queda documentado sin más investigación.

## Commits de esta sesión
Prioridad 1: 569e35b rate limiting + validación · 2a09e6e límite a 3/min · 9604b48 quita recuadro falso
Prioridad 2, punto 1: 54c00da mensaje amable del 429 (publicado en producción)
Prioridad 2, claves de React: 7130244 claves estables en DiagnosisResult + puntuación de React Doctor
Prioridad 2, botón Reintentar: ca3a93f Reintentar en el error 429 reutilizando la foto (publicado)
Historial de diagnósticos: 7e48e75 historial por planta con reescaneo desde la ficha (publicado) · 52f527c docs de cierre · c47a806 docs
Auditoría de código: c2de8f4 datos corruptos del jardín, cámara encendida al salir y respuestas de IA mal formadas (subido a main)
Confirmación en producción: e6b6ab7 docs (junto con 4dc50a3, que llevaba un commit sin subir)
Fix confidence: b058115 normalizar confidence para evitar 8500% o NaN en pantalla
Troceado DiagnosisResult (sin commitear aún): LoadingView y RootCausesList extraídos y verificados;
ActionPlanList diagnosticada, diff mostrado, sin aplicar
