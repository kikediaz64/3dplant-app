# Handoff — 3dPlant v2

## Sesión 2026-09-26 — Claves de React, botón «Reintentar» del 429 y cierre de verificación

**Qué se hizo**
1. Limpieza barata de React Doctor en `DiagnosisResult.tsx` (commit `7130244`): claves estables
   (`key={s}`, `key={p}`, `key={cause.title}`) en síntomas, plagas y causas, y `loadingMessages` sacado
   fuera del componente. React Doctor 67→69/100 y 10→7 avisos (react-doctor 0.9.14; con esa versión el
   recuento de la sesión anterior, «8 avisos, 68/100», ya no coincidía). Se dejó a propósito la clave por
   índice del plan de acción (el estado `completedActions` va por posición) y no se tocó el troceado del
   componente ni `handleSavePlant`.
2. Botón «Reintentar» en el error 429 (commit `ca3a93f`): `AIUserError` gana un campo `kind`
   (`'rate-limit'` | `'unavailable'`) y la pantalla de error pasa a un subcomponente `DiagnosisError`.
   Rate limit: botón deshabilitado con cuenta atrás de 60 s. Cuota agotada: botón activo sin cuenta atrás.
   Cualquier otro error (500, timeout, sin foto) mantiene «Tomar otra foto». Reutiliza la foto ya cargada.
3. `ESTADO.md` actualizado (commit `0005cb5`): Reintentar y diagnóstico real del móvil pasan a «Qué
   funciona»; «Siguiente paso» queda en React Doctor + límite de gasto en OpenAI; botones de escritorio
   a Prioridad 4 (backlog); commits `7130244` y `ca3a93f` añadidos a la lista.
4. Todo subido: `main` = `origin/main` en `0005cb5`.

**Qué se descubrió y por qué**
- La foto no se pierde al fallar: `image` sigue en el estado del componente y en `localStorage`
  (`capturedPlantImage`) hasta guardar la planta. Por eso Reintentar basta con relanzar `handleDiagnosis(image)`.
- Los dos 429 eran indistinguibles en pantalla (mismo `AIUserError`, solo mensaje). Por eso `kind`.
- Cuenta atrás solo en el rate limit: 60 s es una cota segura de la ventana de 3/min. En cuota agotada la
  espera depende del saldo de OpenAI; un contador sería engañoso.
- El temporizador cuenta contra una hora objetivo (`Date.now()`), no restando de 1 en 1: el navegador
  frena los temporizadores en pestañas en segundo plano.
- En desarrollo salen 2 llamadas a `/api/ai` al entrar en la pantalla por el `StrictMode` de React
  (`index.tsx:13`). No lo causa este cambio; en producción es una sola. No verificado en producción.
- Error propio detectado en el diff y corregido: el primer arreglo dejó `key={s}className` sin espacio.

**Verificación (salida real)**
- `npm run build` OK (302,13 kB) y `tsc --noEmit` sin errores.
- React Doctor: 69/100, 7 avisos, ninguno nuevo. El hook de commit lo vuelve a lanzar sobre el archivo
  staged y avisa de los mismos 3 avisos; no bloquea.
- Prueba local con `fetch` simulado y el reloj adelantado 61 s: 429 vacío (contador 59→45, activo tras
  saltar), 429 con JSON (activo sin contador), 500 («Tomar otra foto», sin Reintentar), reintento correcto
  (llega al resultado). En todos los casos se envía la misma foto.
- Producción (Kike, capturas reales): cuenta atrás de 55 s a 42 s y mensaje amable del 429; diagnóstico
  real desde el móvil de punta a punta.
- **No visto en producción:** la pulsación de «Reintentar» (solo local) y el caso de cuota agotada.

**Estado final y pendientes**
- React Doctor (Prioridad 2, lo que queda): componente gigante y complejidad en `DiagnosisResult.tsx:102`;
  clave por índice en `DiagnosisResult.tsx:370` (plan de acción, intencionada), `PlantAssistant.tsx:89`,
  `PlantDetail.tsx:243/:258`; `createObjectURL` sin `revokeObjectURL` en `CameraView.tsx:79`.
- Kike: límite mensual de gasto en OpenAI (Billing → Limits).
- Backlog (Prioridad 4): botones «Guardar en Mi Jardín / Volver al Jardín» descolocados en escritorio.
- Sin verificar en producción: cuota de OpenAI agotada (mensaje y «Reintentar» sin cuenta atrás).
- `ESTADO.md` → «Commits de esta sesión» no incluye `0005cb5` (el commit de docs no puede llevar su
  propio hash).

## Sesión 2026-09-26 — Historial de diagnósticos por planta, con reescaneo desde la ficha

**Punto de partida (diagnóstico, solo lectura).** No existía «reescanear»: cada escaneo creaba una planta
nueva (`savePlant`, id nuevo) y cada planta guardaba un único diagnóstico, como texto
(`"Aviso · 64/100"`). No había nada que se sobrescribiera.

**Decisiones de Kike**
- Flujo de reescaneo desde la ficha: botón «Nuevo diagnóstico» → `/scan?plantId=X` → `/result` → «Añadir al
  historial» (en vez de crear planta nueva).
- Tope de 10 diagnósticos por planta (se descarta el más antiguo) y fotos del historial más comprimidas.
- El diagnóstico más reciente es el «actual» (PlantCard y resumen de la ficha), sin selección manual.
- Cancelar un reescaneo vuelve a la ficha de la planta. El reescaneo NO toca riego (`needsWater`,
  `lastWateredAt`, `wateringFrequencyDays`), nombre ni ubicación.
- Tarjeta del historial al principio de la ficha (antes de «Historia»), no al final como se propuso.
- Caso «planta borrada antes de llegar a /result»: se deja sin proteger (la X/volver lleva a una ficha que
  dirá «Planta no encontrada»). Si al guardar la planta ya no existe, se guarda como planta nueva y el botón
  lo dice.

**Qué se hizo** (por bloques, con diff literal aprobado y copia `.bak` antes de cada uno)
1. `types.ts`, `services/plantStorage.ts`: `DiagnosisEntry`, `Plant.diagnosisHistory?` (opcional, sin
   migración), `getDiagnosisHistory` (planta antigua = una entrada sintética con su diagnóstico de siempre) y
   `addDiagnosis` (una sola escritura; tope 10). `savePlant` no se tocó: el llamador pasa
   `diagnosisHistory: [entry]`.
2. `CameraView.tsx`, `DiagnosisResult.tsx`: `plantId` por query string en `/scan` y `/result`; cancelar y
   «Volver» → ficha; «Tomar otra foto» conserva `plantId`. Variación aprobada: `plantData` queda fuera del
   `if/else` (mismo resultado, diff más corto). `compressForStorage` ahora acepta tamaño y calidad.
3. Bloqueo de doble pulsación en guardar (`useRef` + estado `saving`; se libera si falla). Copia `.bak2`.
4. `PlantDetail.tsx`: tarjeta «Historial de diagnósticos» (miniatura, fecha, estado, puntuación, etiqueta
   «Actual»), botón «Nuevo diagnóstico» (no en plantas de ejemplo) y el botón cerrar pasa de `navigate(-1)` a
   `navigate('/')` para no caer en `/scan` o `/result` tras un reescaneo.
5. Commit `7e48e75` «feat: historial de diagnósticos por planta, con reescaneo desde la ficha» (5 ficheros,
   +204/−32). Publicado después (ver «Actualización»).

**Qué se comprobó y con qué resultado**
- `tsc --noEmit` y `vite build`: exit 0 tras cada bloque (no se repitieron después del commit).
- Lógica de `plantStorage` con un `localStorage` falso (esbuild + node, fuera del proyecto): 13 pruebas OK
  (planta antigua, texto sin puntuación, mock, historial corrupto, tope 10, riego intacto, id inexistente,
  cuota llena).
- Navegador local (dev server en `127.0.0.1:5199`, planta antigua sembrada a mano): la ficha muestra la
  tarjeta arriba con una fila («1 ago 2026, 12:30 · Aviso · Actual · 64/100»); `localStorage` no se modificó;
  «Nuevo diagnóstico» abre `#/scan?plantId=…`; cancelar vuelve a la ficha; la X de la ficha va a `#/`.
  Consola sin mensajes, pero solo se leyó después de cargar la página (prueba débil).
- Medición de miniaturas con 7 fotos reales de baterías (no de plantas): principal 512 px/0,7 ≈ 33 KB;
  miniatura 240 px/0,5 ≈ 7,3 KB (5,8–9,5). Cota baja; con follaje puede pesar más.
- El gancho de pre-commit ejecuta React Doctor: 14 avisos, 64/100, no bloqueó el commit (exit 0). Escaneó
  solo los 5 ficheros del commit; sin línea base para separar avisos nuevos de antiguos.

**Qué NO se comprobó**
- Un reescaneo real con la IA se comprobó después, en producción (ver «Actualización»).
- El bloqueo de doble pulsación en pantalla, el aspecto en móvil y en modo claro.

**Descubrimientos útiles**
- La app usa `HashRouter`: las rutas para probar son `/#/plant/<id>`, no `/plant/<id>`; cambiar la URL con
  `pushState` sin recargar no re-renderiza.
- Hay un gancho de pre-commit con React Doctor: avisa de «regresiones» pero no bloquea.
- `.bak` no está en `.gitignore`: para commitear se añadieron los ficheros por nombre.

**Actualización (misma sesión)**
- Push de `7e48e75` y despliegue en Netlify. Producción pasó de `index-ChxaCMpm.js` a `index-BV1cbvnZ.js`,
  con «Historial de diagnósticos», «Nuevo diagnóstico», «Añadir al historial» y «Guardando…» dentro.
- Kike confirmó la prueba real en producción, con captura: dos entradas (65/100 «Actual» y 60/100),
  miniaturas distintas y el resto de la ficha intacto.
- Los 6 `.bak` se borraron después de esa confirmación.


## Sesión 2026-09-26 — Auditoría de código y tres arreglos (datos corruptos, cámara, respuesta de IA)

**Punto de partida.** Kike pidió una revisión de los commits de la sesión (`00f8b56..c47a806`: Prioridad 1
hasta el historial de diagnósticos) con `/codex:review`.

**Qué pasó con Codex (no funcionó, y no se ha investigado)**
- `--base 00f8b56` fue aceptado por el comando, pero la revisión no leyó código. Primer intento: 12 errores
  `Failed to create unified exec process: helper_unknown_error: setup refresh had errors`. Segundo intento:
  «the filesystem sandbox failed during every attempt to inspect the requested diff». En ambos, «sin
  hallazgos» con confianza muy baja: **no vale como revisión**.
- `/codex:setup` salió limpio (codex-cli 0.155.1, login de ChatGPT activo). Por tanto el fallo está en el
  sandbox de Codex en Windows, no en la instalación. Kike lo deja para otro día.
- Se usó en su lugar el subagente `code-auditor` (Claude, solo lectura), que revisó el estado actual del
  código (no el diff commit a commit, porque no puede ejecutar git; y no leyó `types.ts`).

**Qué salió de la auditoría:** 13 hallazgos (8 medios, 5 bajos), todo por lectura, sin reproducir. Kike eligió
arreglar tres; el resto quedó documentado en `ESTADO.md` («Pendientes de endurecimiento») sin tocar código:
- 7 `plantStorage.ts`: con datos corruptos, `savePlant` pisaba todo el jardín.
- 5 `CameraView.tsx`: si sales mientras se pide la cámara, el stream llega tarde y no se apaga.
- 6 `aiService.ts`: `JSON.parse` sin proteger y listas mal formadas rompían la pantalla.

**Qué se hizo** (diff literal aprobado uno a uno, copia `.bak` antes de cada uno; `sonnet-builder` los preparó
sin aplicar)
1. `plantStorage.ts`: `getSavedPlants` comprueba `Array.isArray`; si no lo es, copia el texto original una
   sola vez en `savedPlants_corrupt_backup` (con `try/catch`) y devuelve `[]`. Cubre `savePlant`,
   `deletePlant`, `updatePlant`, `addDiagnosis` y `getStorageInfo`. No se recupera solo.
2. `CameraView.tsx`: contador `requestRef` que sube en cada petición y al salir; si al llegar el stream el
   número ya no coincide, se apagan sus tracks. **Variante sobre el diff del builder**, que cambiaba la firma
   de `startCamera` y habría roto `onClick={startCamera}` (línea 176): React le pasa el evento como primer
   argumento.
3. `aiService.ts`: JSON inválido o no objeto → `AIUserError('La IA devolvió una respuesta que no se pudo
   entender…', 'unavailable')` (botón «Reintentar» sin cuenta atrás); `toArray` normaliza `actionPlan`,
   `rootCauses`, `symptoms` y `pests` (texto suelto → lista de uno; otra cosa → `[]`). Un texto suelto en
   `actionPlan`/`rootCauses` pasa a objeto con `description`, con `icon: 'task_alt'` (existe en Material
   Symbols, comprobado en la lista oficial de Google).
4. `ESTADO.md` con los pendientes 1, 2, 3, 4, 8, los de gravedad baja (9 a 13) y el fallo de `confidence`.
5. Commit `c2de8f4` «fix: datos corruptos del jardín, cámara encendida al salir, y respuestas de IA mal
   formadas» (4 ficheros, +96/−10), push `c47a806..c2de8f4` a `main`.

**Qué se comprobó y con qué resultado**
- `tsc --noEmit` (exit 0) y `npm run build` (✓) tras cada arreglo.
- Punto 7, en Node con un `localStorage` falso: `{"a":1}` + guardar planta → `savedPlants_corrupt_backup`
  = `{"a":1}` y `savedPlants` solo con la planta nueva; un JSON roto después no pisa la primera copia.
- Punto 5, componente real con jsdom (instalado fuera del proyecto, en la carpeta temporal) y `getUserMedia`
  simulado que no responde hasta que se decide: en el código original la cámara queda encendida (0 tracks
  apagados) al salir antes de tiempo, con y sin StrictMode; en el nuevo se apagan. Con StrictMode y sin
  salir, el último stream sigue activo.
- Punto 6, `diagnosePlant` con `fetch` simulado, original contra nuevo: `"hola"` (SyntaxError → mensaje
  amable), `{"actionPlan":"beber agua"}` (`.map` rompía → lista de uno), JSON válido (idéntico) y `null`
  (TypeError → mensaje amable).
- Hook de pre-commit de React Doctor: 8 avisos, 74/100, avisó de «regresiones» y no bloqueó. No se comprobó
  cuáles son nuevos.

**Qué NO se comprobó**
- **Nada de esto se ha visto en producción.** Kike dice que el commit está publicado; Claude no comprobó el
  despliegue de Netlify. La prueba real la hace Kike al día siguiente.
- La luz real de la cámara (navegador o móvil) y `diagnosePlant` contra la IA real o en pantalla.
- El botón «Reintentar cámara» en concreto: el diseño lo cubre sin tocarlo, pero no se ejercitó.

**Descubrimientos útiles**
- `aiService.ts` usa CRLF; `ESTADO.md`, `CameraView.tsx` y `plantStorage.ts` usan LF. Un script que lea con
  saltos de línea universales reescribe el archivo entero (pasó con el primer diff de `aiService.ts`; se
  detectó antes de aplicarlo y se rehízo con `newline=''`). Git avisa de LF→CRLF, sin cambiar contenido.
- El fallo de `confidence` (fuera del arreglo): `Math.round((c ?? 0) * 100)` da 8500% si la IA devuelve 85 y
  NaN% si devuelve un texto. Comprobado ejecutando la fórmula; no visto en la app; sin arreglar.
- Un comando `bash` con error de sintaxis puede haber ejecutado ya parte de la cadena: comprobar el estado
  real antes de reintentar (aquí la copia `.bak` y el cambio ya estaban hechos).
- `.bak` sigue sin estar en `.gitignore`; para commitear se añadieron los ficheros por nombre.

**Pendiente**
- Kike prueba en producción los 3 arreglos (con datos de prueba para el jardín corrupto: la prueba pisa
  `savedPlants`). Después, borrar `services/plantStorage.ts.bak`, `screens/CameraView.tsx.bak` y
  `services/aiService.ts.bak` (siguen ahí, sin seguimiento en git).
- Pendientes de endurecimiento (1, 2, 3, 4, 8, 9 a 13) y `confidence`, en `ESTADO.md`.
- Investigar por qué falla el sandbox de Codex en Windows (otro día).
- Avisos de React Doctor y límite mensual de gasto en OpenAI (lo hace Kike), como antes.

---

# Handoff — 3dPlant v2

## Sesión 2026-09-27 — Confirmación en producción, fix de `confidence` y troceado de DiagnosisResult

**Punto de partida.** Kike confirmó en producción, con capturas, los tres arreglos de la auditoría anterior
(`c2de8f4`): datos corruptos del jardín, cámara y respuesta de IA mal formada. Todo funcionó bien, con un
hallazgo nuevo en consola (service worker).

**Qué se hizo**
1. Búsqueda de código (micrófono/audio): confirmado que no hay `getUserMedia` con audio, `MediaRecorder` ni
   `SpeechRecognition` en el proyecto; el botón de "auriculares" (icono `support_agent`) es el chat de texto
   del asistente (`GardenGallery.tsx`, `PlantDetail.tsx` → `PlantAssistant.tsx`), no pide voz. Único uso de
   `getUserMedia` es la cámara con `audio: false` explícito (`CameraView.tsx:37-40`).
2. Confirmación en producción documentada en `ESTADO.md`; borrados los 3 `.bak`
   (`plantStorage.ts.bak`, `CameraView.tsx.bak`, `aiService.ts.bak`).
3. Commit `e6b6ab7` (docs) + push junto con `4dc50a3`, que llevaba un commit sin subir desde la sesión
   anterior.
4. Arreglo de `confidence` en `aiService.ts`: `normalizeConfidence` sustituye a
   `Math.round((confidence ?? 0) * 100)`. Acepta fracción (0-1) o ya-porcentaje (0-100), texto con "%", y
   cualquier valor no numérico cae a 0 en vez de NaN. Commit `b058115`, subido a `main`.
5. Diagnóstico y plan de troceado de `DiagnosisResult.tsx` (aviso de React Doctor: componente gigante y
   complejidad alta en la línea 102). Alcance acordado para hoy: solo `LoadingView`, `RootCausesList` y
   `ActionPlanList`; `SummaryCard`, `BottomBar` y `TopBar` quedan para otra sesión. `handleSavePlant`, el
   `useEffect` inicial y `DiagnosisError` no se tocan. La key `idx` de `ActionPlanList` se deja tal cual,
   fuera de alcance.
6. Extraídos y aplicados, uno a uno con diff aprobado + `tsc --noEmit` + `npm run build` + prueba visual en
   pantalla entre medias:
   - `LoadingView` (props: `message`). Confirmado visualmente igual.
   - `RootCausesList` (props: `causes`). Confirmado visualmente igual.

**Qué se comprobó y con qué resultado**
- `tsc --noEmit` sin errores y `npm run build` correcto tras cada extracción (`LoadingView`, `RootCausesList`).
- Verificación visual en pantalla de Kike, positiva, para ambas piezas.
- Script Node suelto (scratchpad, no en el repo) con 9 casos de `normalizeConfidence`: todos OK.

**Qué NO se comprobó**
- El fix de `confidence` no se ha probado contra la IA real ni en pantalla (solo `tsc` + script Node).
- `ActionPlanList`: el diff se enseñó y quedó pendiente de aprobación cuando llegó el cierre de sesión.
  **No se aplicó.** El archivo real (`DiagnosisResult.tsx`) sigue con `LoadingView` y `RootCausesList` ya
  extraídos, pero el bloque de "Plan de Acción Inmediato" sigue igual que antes (sin extraer).

**Descubrimientos útiles**
- Hallazgo nuevo, gravedad baja, no bloqueante, visto en consola de producción: `sw.js:48` intenta
  `cache.put` sobre peticiones POST (a `/api/ai`), que los navegadores no soportan
  (`Failed to execute 'put' on 'Cache': Request method 'POST' is unsupported`). No impide el funcionamiento.
  Documentado en `ESTADO.md`, sin tocar código.
- Curiosidad menor sin prioridad: en iOS, el indicador de grabación pasa de verde a naranja brevemente al
  salir de la cámara, pese a `audio: false` y ningún acceso a micrófono en el proyecto. Probablemente
  comportamiento propio de iOS/Safari, sin fuente que lo confirme. Documentado en `ESTADO.md`, sin investigar
  más.

**Pendiente**
- Retomar el troceado de `DiagnosisResult.tsx` desde `ActionPlanList` (diff ya diagnosticado y mostrado, solo
  falta aprobarlo y aplicarlo), y seguir después con `SummaryCard`, `BottomBar` y `TopBar` en otra sesión.
- **Sin empezar, pendiente de diagnóstico:** mejora de precisión en `netlify/functions/ai.mjs` — separar la
  identificación de especie y el diagnóstico en dos llamadas a OpenAI (hoy es una sola), y subir
  `detail: 'low'` a `'high'` en la imagen enviada. No se ha tocado código ni medido nada todavía: falta el
  diagnóstico de qué pasa con la latencia (dos llamadas en vez de una), el coste (doble llamada + `detail:
  'high'` es más caro por imagen) y si el rate limit actual (3/min por IP) sigue teniendo sentido con
  llamadas más lentas.
- Fix de `confidence`: verificar en pantalla real cuando la IA devuelva un caso límite.
- Hallazgo del service worker (`sw.js:48`): sin arreglar, sin priorizar.
- Resto de pendientes de endurecimiento y avisos de React Doctor: siguen igual, ver `ESTADO.md`.
