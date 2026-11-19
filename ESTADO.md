# ESTADO — 3dPlant v2 (2026-11-13)

## Preparación para el Kanban (2026-11-06)
- 3dPlant será el primer repo real del Kanban de kike-srv. Requisito: que `main` tenga pruebas (A1 las trae).
- **A1 FUSIONADO Y EN PRODUCCIÓN** (PR #1, merge `8e0810c`, 2026-11-06). Comprobado: vista previa con
  diagnóstico real OK en el móvil (Kike) → Blobs real funciona; en producción `/api/ai` ya rechaza imágenes
  no válidas con el mensaje de A1. `AWS_LAMBDA_JS_RUNTIME` no existe en Netlify; Blobs no sale como gasto
  aparte (0,1/1.000 créditos el 6-nov). Netlify muestra una factura de 9 $ vencida el 7-oct: la mira Kike.
  Probar las pruebas: `node --test --experimental-test-module-mocks` (27/27). Ojo: con `tests/` como
  argumento falla en Node 24; sin argumento o con el archivo funciona.
- El PR se abrió sin poner antes la `OPENAI_API_KEY` falsa en Deploy Previews: la vista previa usa la clave
  real, frenada por el propio tope de A1 (30 diagnósticos/día, contador aparte de producción).
- Rama `mejoras-diseno-apple` subida como PR en borrador (fusionar después de A1).
- Playwright descartado por ahora: `package.json`/`package-lock.json` vueltos a lo commiteado; versión con
  Playwright guardada en `*.bak-playwright-20261106` (sin seguir en git).
- Pendiente (propuesto, sin hacer): script `"test"` en `package.json` (cambio de código → Codex o
  «construye»); en kike-srv clonar el repo y `comandos_pruebas` =
  `["sh","-c","npm ci --no-audit --no-fund && npm run build && node --test --experimental-test-module-mocks 'tests/**/*.test.mjs'"]`.
  Sin el patrón, Node recoge también los `test-*.mjs` sueltos (ignorados por git) de la raíz y fallan 3.
- **PR #2 FUSIONADO** (`7be33ba`): el aviso ya está en producción (`index-BlpCIAp4.js`). `main` local al
  día con `origin/main`; en `main`: `npm ci` + build OK y 27/27 pruebas con el patrón de arriba.
  Primeras tarjetas: pruebas de los límites de pregunta (400/413) y `*.bak*` al `.gitignore`.

## A1 — Tope diario de gasto (rama `a1-tope-diario`, commiteado y en PR #1, sin fusionar)
- Trabajo en el worktree `G:\Laboratorio IA\3dplant-a1` (fuera del proyecto), rama `a1-tope-diario`
  creada desde `origin/main` (`0a11186`). Detalle y pasos para la vista previa:
  `G:\Laboratorio IA\3dPlant\handoff\A1_RESULTADO.md`.
- Qué hace: valida la imagen (solo JPEG, tamaño mín./máx.) y aplica un tope diario en Netlify Blobs:
  diagnósticos 10/IP y 30 globales, preguntas 30/IP y 100 globales (día UTC); 429 `daily-limit`, y 503 si
  Blobs falla. Contadores separados por contexto de despliegue. Aviso en el log si no llega la IP.
  `.nvmrc` = 24.
- Comprobado en local: 27/27 pruebas (Blobs y OpenAI simulados), build y empaquetado OK, mensaje amable
  del 429 mantenido. **Sin verificar en Netlify**: Blobs real, `context.ip`, `context.deploy.context` y la
  versión de Node real. Coste de Blobs en el plan: sin mirar.
- En producción hoy (sin A1): cualquiera puede llamar a `/api/ai` desde fuera de la app; solo frena el
  límite por minuto, que deja pasar ~5 antes del 429.
- Auditoría completa del diagnóstico (hallazgos A1-A5, M1-M6, B1-B6):
  `G:\Laboratorio IA\3dPlant\handoff\AUDITORIA_3DPLANT.md`. Solo A1 está construido.

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
- Aviso «Diagnóstico orientativo generado por IA» en `DiagnosisResult.tsx` (commit `35f84ba`, rama
  `mejoras-diseno-apple`, **sin fusionar con main**): 3 líneas, un `<p role="note">` bajo la tarjeta
  de resultado. **Comprobado solo con respuesta simulada**; sin probar con un diagnóstico real ni en
  el móvil. React Doctor al confirmar: 79/100, 3 avisos (componente gigante y complejidad alta en
  :156, índice como key en :460), sin corregir a propósito.
- Playwright: probado el 2026-10-08 y **descartado el 2026-11-06** (sin pruebas escritas, 3 avisos de
  seguridad). Sigue en `node_modules` hasta el próximo `npm ci`; copia en `*.bak-playwright-20261106`.

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
- `npm install` de Playwright avisa de 3 vulnerabilidades (1 moderada, 2 altas), sin revisar ni saber si
  ya existían. Copias `package.json.bak-20261008-192557` y `package-lock.json.bak-20261008-192557` sin
  seguir en git, pendientes de borrar cuando Kike dé por buena la instalación.

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

## Pendientes de la revisión de diseño (skill apple-design, 2026-10-08)
Salen de revisar `DiagnosisResult.tsx` con la skill; ninguno está tocado. Los puntos 9-12 de la lista
original ya figuran en otras secciones y se enlazan aquí.
- A1. Accesibilidad en `DiagnosisResult.tsx`: `aria-label` en el botón de volver; casilla del plan de
  acción con `role="checkbox"`, `aria-checked`, `aria-label` y área pulsable de 44x44; «Ver guía
  completa» no hace nada (quitarlo o hacerlo un enlace real).
- A2. Contraste de textos pequeños: en modo oscuro `gray-500` sobre `#162e16` da 3,02:1 («Familia» y
  similares); subir a `gray-600` / `dark:gray-300`.
- A3. Modo claro: el verde `#13ec13` da 1,61:1 sobre blanco, e `index.html` fuerza `class="dark"`.
  Arreglarlo o eliminar el modo claro. Usar `prefers-color-scheme` y `prefers-reduced-motion`.
- A4. Jerarquía: subir «problema detectado» y el estado bajo el nombre; plegar chips secundarios.
- A5. Botón «Corregir especie» (funcionalidad nueva, requiere decidir cómo funciona).
- A6. Sustituir el `alert()` bloqueante al fallar el guardado por un mensaje en pantalla con
  reintento.
- A7. Quitar la foto aleatoria de `picsum.photos` en las causas sin imagen.
- A8. Mensajes de carga que rotan por tiempo sin reflejar lo real, y sin opción de cancelar.
- A9. Ya recogidos arriba: React Doctor (79/100, :156 y :460), `sw.js` con POST y versión antigua en
  desarrollo (ver «Qué está roto»), botones inferiores en ventana ancha (Prioridad 4) y doble
  diagnóstico en desarrollo (endurecimiento nº 9; comprobar si pasa en producción).
- A10. Antes de fusionar a `main`: probar el aviso con un diagnóstico real y en el móvil.
- A11. La skill apple-design está en `G:\Laboratorio IA\3dPlant\.claude\skills` (carpeta padre), no en
  la raíz del proyecto; decidir si moverla.
- A12. `netlify/functions/ai.mjs.bak` sigue sin seguimiento en git y `.gitignore` no incluye
  `.netlify`.

## Siguiente paso
0. Kanban: **3dPlant dado de alta en kike-srv (2026-11-06)**. Clon `/srv/kanban/repos/3dplant-app`;
   `procesador.json` (copia `procesador.json.bak-3dplant-20261106`) con `comandos_pruebas` =
   `sh -c "npm install --no-audit --no-fund --no-package-lock && npm run build && node --test --experimental-test-module-mocks 'tests/**/*.test.mjs'"`
   (en el servidor: build OK y 27/27). `npm ci` FALLA en Linux: `package-lock.json` desfasado (`@emnapi/core`,
   `@emnapi/runtime`). Sin `node_modules` las pruebas dan 17/17 en vez de 27 (se pierden 10 sin avisar).
   `comprobar_servidor.py`: todo OK salvo AVISO «.env no ignorado» en 3dPlant (`.gitignore` no tiene `.env`)
   y el «candado» (normal con el servicio en marcha). Servicio reiniciado y activo. `tablero.json`
   `github.repo` no se usa en el código (cada tarjeta lleva su repo). Etiquetas del Kanban creadas en el repo.
   **Primera tarjeta** (issue #3, `.gitignore`) → **PR #4** en 7 min, APROBADO; verificado a mano (check-ignore,
   27/27, build): **fusionado** (`09a20fd`, con el sí de Kike); issue #3 cerrado, pero la tarjeta sigue en
   «En revisión» en el tablero #1 (la plataforma no la movió a «Hecho»). El auditor dijo no tener Bash (revisó solo leyendo): fallo de la
   plataforma, anotado para el hilo del Kanban. Tickets del auditor #5 y #6 cerrados con pruebas (sin claves
   reales en el historial). Ticket #7 → **PR #8 cerrado sin fusionar** (y #7, #9, #10 cerrados): se construyó
   sobre `7be33ba` porque el clon del servidor **no hace fetch antes de cada tarjeta** (fallo grave de la
   plataforma); además `*.bak*` del PR #4 ya cubre las copias `.bakN`. No mandar más tarjetas hasta que el hilo
   Kanban arregle: fetch del clon, revisor sin Bash, tarjeta que no pasa a «Hecho».
   Tablero #1 ordenado a mano: #3, #5 (historial revisado otra vez: sin claves) y #7 en «Hecho»; #6, #9 y #10
   juntados en el **#11** (tabla de `check-ignore`, cerrado, en «Hecho») y archivados.
   Apps de referencia (Kike, 6-nov): PictureThis (+web), Plantix (+biblioteca), Plant Parent, Planta (Dr. Planta),
   Pl@ntNet. Solo ideas, no copiar contenido ni API internas. Pl@ntNet API: gratis 500/día, comercial OK, con
   enfermedades (my.plantnet.org/pricing, comprobado 6-nov). **Tarjeta #12** creada (6-nov, «Pendiente», P2,
   riesgo:ámbar): Pl@ntNet identifica la especie y se la pasa como pista a gpt-4o-mini; si falla, todo como hoy.
   Pasarla a «Listo» solo cuando el Kanban tenga arreglados sus 3 fallos. `PLANTNET_API_KEY` **ya guardada** en
   Netlify (6-nov, secreta, comprobado solo el nombre): valor en Production y en Deploy Previews (comprobado
   6-nov), así que el PR de la #12 se podrá probar en su vista previa.
   **7-nov: la fábrica (ya arreglada, hito 11) sacó el PR #13** desde `09a20fd` (main al día). Revisado aquí:
   3 archivos, build OK y **39/39** pruebas en una copia aparte; si Pl@ntNet falla, sigue como antes. Detalles
   menores: si un candidato pasa del 20 %, se mandan también los flojos; tickets #14 (acortar nombres comunes) y
   #15 (prueba de 5 s más rápida) son mejoras pequeñas; #16 cerrado y archivado (la clave ya estaba). **PR #13 fusionado** con el
   sí de Kike (7-nov, `35c3202`): Netlify «Published» en producción; prueba gratis con imagen mala → 400 de A1
   (la función responde). La tarjeta #12 pasó sola a «Hecho» (fallo 3 del Kanban arreglado). Kike hizo fotos reales
   (7-nov) y **acertó la especie**; el panel de uso de my.plantnet.org decía «No data available» justo después (¿retraso de sus
   estadísticas o no se llamó?). Revisar el panel más tarde; si sigue a cero, investigar. Quedan #14 y #15 en «Pendiente».
   **Queja de Kike (7-nov) y causa encontrada:** el problema y el remedio salen al final; y en `PlantDetail.tsx`
   Historia, suelo, abono, estaciones, riego, luz, temperatura, humedad, plagas y remedios son **texto fijo igual
   para todas las plantas**; al guardar, `water/temp/humidity` también fijos («Media», «18-24°C»); el prompt obliga
   a 3-5 acciones y 2-4 causas (se inventa problema aunque esté sana). Tarjetas: **#17** (problema y remedio
   primero, solo pantallas) → PR #19 revisado en copia aparte (build OK, 39/39) y **fusionado con el sí de Kike
   (`91668b1`, 7-nov)**; en producción comprobado (el bundle de la web ya lleva «No vemos problemas importantes»);
   #17 pasó sola a «Hecho». **#18** (cuidados reales por especie + permitir planta sana): la fábrica agotó 3
   intentos (queda `ready-for-human`); el 3.º solo fallaba en `max_tokens: 1200` (riesgo de JSON cortado). Codex
   lo subió a 2000 + 502 `truncated` si `finish_reason: length` + `tests/truncated.test.mjs`; revisado aquí
   (build OK, 48/48) y subido con el sí de Kike → **PR #23**, vista previa lista
   (`deploy-preview-23--famous-churros-89c618`). Kike lo probó en el móvil y **se fusionó (`bf59751`, 7-nov)**:
   en producción comprobado (el bundle lleva «Sin datos para esta planta»). #18 movida a mano a «Hecho» (la
   fábrica no la mueve sola si quedó en «Pendiente» con `ready-for-human`).
   **Estudio de la competencia (7-nov), hecho:** solo lo público (decisión de Kike); REA disponible aquí (6.8.0) y
   capturó 5 webs. Nota: `E:\Obsidian\Cerebro Central\research\3dplant-competencia.md`. Tarjetas en «Pendiente»:
   #24 candidatas con foto, #25 hasta 3 fotos + aviso de foto mala, #28 recordatorios `.ics`, #29 puntuación de
   salud y evolución, #30 aviso de tóxica (#26/#27 duplicadas por error, cerradas). Van **de una en una**:
   #24, #25 y #30 tocan `ai.mjs`/`plantnet.mjs`. Aparcadas: zonas marcadas en la foto y Plant.id (de pago).
   **#24 → PR #31** (fábrica, APROBADO, pero al elegir otra especie borraba el diagnóstico). Kike decidió «que lo
   repita»: commit `1d281ae` (hecho por sonnet-builder; Codex no podía escribir en la copia del scratchpad) →
   elegir otra especie repite el diagnóstico con `confirmedSpecies` (sin Pl@ntNet, 1 consulta más). Revisado:
   build OK, tsc OK, 54/54; vista previa lista. Prueba de Kike: el escaneo va bien, pero no salían alternativas
   (Pl@ntNet da >0,8 a la primera y el resto <0,2) → commit `55736a7`: alternativas desde 0,05 y 4 resultados
   (la pista a la IA sigue en ≥0,2); 55/55, vista previa actualizada. **Tope diario de vistas previas agotado
   hoy para la IP de casa** (10/día, compartido por todas las vistas previas): probar mañana o con datos móviles.
   Tarjetas nuevas: #35 «Regar ahora» sin señal (en «Listo»), #40 iconos inventados salen como texto («SCISSORS»).
   Con datos móviles también salió «servicio no disponible»: OpenAI va bien (producción respondió 200), así que es
   el **tope global de vistas previas (30/día)**. La app lo muestra como avería → tarjeta #41.
   **Fusionados con el sí de Kike (7-nov):** PR #36 (#35 «Regada ✓» + «Último riego», `84512f5`) y PR #31 (#24,
   `d0cb050`). `main` junto: build OK, 56/56; producción comprobada (el bundle lleva los dos cambios). Kike lo
   prueba en la web de verdad. Norma nueva: lo que espera a Kike va a «Necesita a Kike» en el tablero 3dPlant.
   **#25 → PR #42** (hasta 3 fotos + aviso de foto oscura/borrosa; revisado: build, tsc, 68/68) **fusionado**
   (`251b05f`) con el sí de Kike y en producción (comprobado el bundle; API responde 400 a imagen mala).
   **#30 → PR #46** (aviso de tóxica para mascotas/personas; añadido `c275b3a`: avisa si cualquier fuente dice
   tóxica; 74/74) **fusionado** (`1ac324c`) con el sí de Kike y en producción (bundle comprobado).
   **#28 → PR #50** (recordatorio de riego/abono en calendario `.ics`; añadido `80feedf`: en iPhone abre el
   calendario con data URL, primer aviso el día del próximo riego a las 9:00 locales, con alarma; 81/81)
   **fusionado** (`aa67ea7`) y en producción. Sin probar aún en iPhone real (lo más delicado: el data URL).
   **#29 → PR #54** (puntuación de salud: línea SVG en el historial + «Mejorando/Igual/Empeorando» con margen ±5;
   82/82) **fusionado** (`5246d4f`) y en producción (bundle comprobado). Estudio de la competencia: 5/5 hechas.
   **#40 → PR #58** (iconos del plan de acción: lista blanca + sinónimos → `task_alt`, caja de ancho fijo; 85/85)
   **fusionado** (`6018dcc`) y en producción (bundle `index-DHpurNQE.js` comprobado).
   **#41 → PR #62** (429 `daily-limit` → «Has llegado al límite de diagnósticos de hoy. Vuelve mañana.», sin
   «Reintentar»; 91/91) **fusionado** (`f6bfc90`) y en producción (bundle `index-CyyIT36X.js` comprobado).
   Detalle menor: en el chat de preguntas dice «diagnósticos» aunque sean preguntas.
   Fábrica: tope subido de 20 a 25 tarjetas/día el 7-nov con el sí de Kike; al cerrar, **devuelto a 20** (copia `dispatcher.json.bak-tope20`).
   **#43 → PR #65** (5 pruebas de interfaz de CameraView con jsdom, nueva devDependency; 96/96; 3.er intento)
   **fusionado** (`be7d26d`); Netlify «success», web 200 y mismo bundle (solo pruebas).
   **#45 → PR #69** (2026-11-09: «1 foto»/«2 fotos», un solo aviso agrupado de fotos malas con «Repetir fotos» /
   «Continuar igualmente», límite de 3 como texto). Kike no veía el aviso: quedaba tapado por los botones de abajo;
   Codex lo pasó a una capa centrada encima de todo (`5dfec50`), comprobado en vista móvil, 96/96. **Fusionado**
   (`bd5e984`) y en producción (bundle `index-CmKlsxmb.js` con «Continuar igualmente»).
   **#44 → PR #73** (2026-11-09): con 7 fotos reales de Kike (`G:\Laboratorio IA\3dPlant\fotos-prueba`, fuera del
   repo) la oscura (media <40) ya acertaba; la borrosa no saltaba nunca (ratio .015 inalcanzable). Ahora borrosa =
   estructura (grad >4) y varianza del laplaciano <100 (nítidas 201-479, movidas 18-41). 98/98 y 7/7 fotos bien
   (script `scratchpad\medir_fotos.py` + `probar44.mjs`). **Fusionado** (`46bf069`), producción `index-BVMMegcY.js`
   = el bundle revisado.
   **#64 → PR #76** (tope diario en el asistente: «límite de preguntas»; diagnósticos igual; 98/98) **fusionado**
   (`ecb024d`), producción `index-CCv4a3gg.js`. Cerrados sin código el 9-nov: #52 (ya hecho), #70 y #72 (superados
   por la capa del PR #69), #47 y #48 (ya hechos en el PR #46).
   **#49 → PR #78** (fuera «Toxicidad: sin datos fiables» de la lista de Mi Jardín; el detalle lo mantiene) y
   **#68 → PR #81** (`engines.node >=22.15`) **fusionados** (`9a86f3b`, `d5c6044`); main 98/98, producción
   `index-ac-4eMmB.js` = build local de main.
   **#14 → PR #85** (a la IA solo 3 nombres comunes por especie, recortados a 60, sin repetidos;
   `formatCandidateHint` en `netlify/lib/plantnet.mjs`) y **#60 → PR #87** (el plan de acción descarta
   elementos vacíos o raros) **fusionados** el 2026-11-10 (`95f3290`, `ee47594`); main 100/100, producción
   `index-DaIK36Uh.js` = build local de main. Tarjetas en Hecho en los dos tableros.
   **#34 → PR #91** (umbral 0.2 de pistas a la IA en una constante `HINT_MIN_SCORE` de `plantnet.mjs`, mismo
   resultado) **fusionado** el 2026-11-10 (`0684677`); main 101/101. Solo toca el servidor: el paquete web no
   cambia y Netlify no publica estado en GitHub, así que no hay prueba directa del despliegue de la función;
   producción responde bien (`/api/ai` vacío → 400). Tarjeta en Hecho en los dos tableros.
   2026-11-11: **#15 → PR #94** (la prueba de tiempo agotado de Pl@ntNet pasa de 5 s a ~9 ms y falla si se
   rompe el corte) y **#21 → PR #96** (`utils/actionPlanDisplay.ts`: la pantalla de diagnóstico no se cae sin
   `actionPlan`) **fusionados** (`c48eabd`, `60f14d7`); main 103/103, producción `index-BlIfYJNz.js` = build local.
   **Fallo encontrado por Kike en su iPhone:** «Añadir recordatorio de riego» no hace nada (Safari bloquea abrir una
   URL `data:`). **#98 → PR #99**: el .ics lo sirve `/api/recordatorio` (`netlify/functions/recordatorio.mjs`,
   texto del calendario en `services/calendarIcs.mjs`). Kike lo probó en la vista previa en su iPhone: **sale la
   ficha «Añadir a Calendario»**. **Fusionado** (`b9761a0`); main 115/115, producción `index-JND8faDJ.js` = build
   local y `/api/recordatorio` → 200 `text/calendar`. Kike confirma que el recordatorio **se guardó bien en su
   calendario** (2026-11-11).
   **#20 → PR #103** («Recomendaciones» siempre en verde con 💡, `utils/plantDetailTones.ts`) y **#33 → PR #106**
   (botón «Volver a la propuesta inicial» tras elegir otra especie, sin otra llamada a la IA) **fusionados**
   (`e2337de`, `c615730`); main 119/119, producción `index-D_O4o7a4.js` = build local (2026-11-11). Ninguno se pudo
   ver en pantalla (las plantas de ejemplo no tienen recomendaciones; el botón pide un diagnóstico real).
   **La fábrica ya exige ficha** (hito 12): las especificaciones van con `### Qué debe pasar / Afectado / Depende de /
   Hecho cuando / Comprobación / Nivel / Riesgo / Prioridad`; comprobar con `ficha.py` antes de pasar a «Listo».
   **#108 → PR #110** (guarda `canReturnToOriginal` en «Volver a la propuesta inicial») y **#100 → PR #112** (el
   nombre se recorta a 80 antes de `/api/recordatorio` en iOS) **fusionados** con el sí de Kike (`bdc04a4`,
   `6524c08`); main 122/122, producción `index-CpF61QCy.js` = build local (2026-11-11). #100 lo subió Claude a mano
   (rama del worktree de la fábrica) porque la fábrica tuvo dos fallos suyos: instalación cortada por una
   publicación a medias de Babel, y «sin cambios» contado como fallo. Avisada la sesión del Kanban. React Doctor
   de #112 falló la primera vez por atasco de GitHub (sin máquina en 14 min); relanzado, verde.
   **#88 → PR #113** (`normalizeActionPlan` ya no copia `...item`: solo title, description, icon) y **#92 → PR #114**
   (`MIN_ALTERNATIVE_SCORE` exportada en ai.mjs + prueba de que coincide con la de diagnosisCandidates.ts)
   **fusionados** con el sí de Kike (`8310db7`, `5c83499`); main 124/124, producción `index-DSFVBURA.js` = build
   local (2026-11-12). #92 solo toca servidor y pruebas: el bundle no cambia, así que la publicación de `5c83499`
   no se comprobó directamente (la vista previa del PR sí salió bien). #92 lo subió Claude a mano: otra vez la
   fábrica hizo el commit en el intento 1, no lo subió y contó «sin cambios» como fallo (mismo fallo que #100).
   **#90 → PR #115** (3 pruebas de casos raros de `normalizeActionPlan`) y **#101 → PR #116**
   (`isValidFloatingDate` en services/calendarIcs.mjs, usada también por recordatorio.mjs) **fusionados** con el sí
   de Kike (`64df92f`, `45fa33a`); main 128/128, producción `index-D6Ahp2aM.js` = build local y
   `/api/recordatorio` responde 200 con fecha buena y 400 con 29-feb no bisiesto (2026-11-12). La fábrica abrió
   estos dos PRs sola y a la primera.
   **#56 → PR #118** (pruebas de bordes de `getHealthTrend`/`isValidScore`) **fusionado** (`41daa43`); main 130/130,
   producción `index-D6Ahp2aM.js` = build local (2026-11-12). **#84 → PR #120 CERRADO SIN FUSIONAR**: cambiar
   `namedExports` por `exports` en `mock.module` pasa con Node 24.22.1 (kike-srv) pero rompe 3 archivos con Node
   24.12.0 (PC de Kike), y el proyecto admite `>=22.15`. #84 aparcada en «Pendiente» hasta subir el mínimo de Node.
   Ojo: la fábrica solo prueba con el Node de kike-srv; revisar siempre también en el PC.
   **#105 → PR #122** (el cargador de TypeScript de las pruebas vive solo en `tests/helpers/tsLoader.mjs`)
   **fusionado** (`26ddfe5`); main 130/130, producción sin cambios (`index-D6Ahp2aM.js`). El helper lee
   `tsconfig.json`. Las pruebas nuevas deben hacer `import './helpers/tsLoader.mjs'`, no copiar `registerHooks`.
   **#32 → PR #125** (prueba que monta DiagnosisResult con candidatas, sin red) y **#55 → PR #128** (`components/
   HealthChart.tsx`; el aria-label ahora incluye las puntuaciones) **fusionados** con el sí de Kike (`fe067d0`,
   `0141fe5`); main 138/138, producción `index-CQ70EGKA.js` = build local (2026-11-12). #55 cambia una pantalla
   y no se vio en el móvil (solo código y pruebas; vista previa: deploy-preview-128).
   **#97 → PR #132** (prueba que monta DiagnosisResult sin plan de acción) y **#63 → PR #130** (dos pruebas de
   DiagnosisError: con tope diario sale «Volver» y no «Reintentar») **fusionados** con el sí de Kike (`cd00207`,
   `a21b8d5`); main 141/141, producción `index-CQ70EGKA.js` = build local (2026-11-13). Solo añaden pruebas.
   Pendiente de ordenar: el montaje con jsdom está repetido en `diagnosisResult`, `diagnosisResultSinPlan` y
   `diagnosisError` (candidato a un helper, como se hizo con #105). **#107 → PR #133** (prueba del flujo
   «Volver a la propuesta inicial», `tests/diagnosisResultVolver.test.mjs`): **fusionado** con el sí de Kike
   (`9bf2261`); main 142/142, producción sin cambios. Ya son cuatro copias del montaje: **#134** (helper
   `tests/helpers/montajePantalla.mjs`, ficha escrita por Claude) → **PR #135** (head `698a605`): **fusionado** con el sí de Kike (`076af4b`); main 142/142,
   producción sin cambios. Las pruebas de pantalla nuevas deben usar `montarPantalla()` de ese helper.
   #129 cerrado por estar ya hecho (el `<svg>` de HealthChart ya lleva `role="img"` y aria-label desde #128).
   **#127** (quitar los 4 `console.log` de `screens/DiagnosisResult.tsx`, ficha de Claude; cambia el bundle →
   publicación) y **#53** (pruebas de los botones de recordatorio en PlantDetail) enviados a la fábrica el 13-nov.
   #39 depende de #53. La fábrica abrió **PR #136** para #53 (head `5e44e67`): 18 pruebas nuevas en
   `tests/plantDetailRecordatorios.test.mjs`, usa `montarPantalla()`; revisado en el PC, 160/160. Para #127,
   **PR #139** (head `d7b6204`): quita solo los 4 `console.log`, los `console.error` siguen; 142/142, bundle
   nuevo `index-D9UVXifD.js`. Los dos **fusionados** con el sí de Kike (`eb9ebee`, `7a0ca8e`); main 160/160, producción
   `index-D9UVXifD.js` = build local (2026-11-13). **#39** (temporizador de «Regada ✓» en un solo sitio + prueba;
   toca PlantDetail y PlantCard, nivel 2, ámbar) → **PR #141** (head `6679778`): `hooks/useJustWatered.ts` nuevo,
   usado por las dos pantallas; `tests/regadaBoton.test.mjs` (4 pruebas). Revisado en el PC: 164/164, tsc y build
   OK, checks en verde. **Fusionado** con el sí de Kike (`ef159b7`); main 164/164, producción `index-CsJK0rFG.js` = build
   local (2026-11-13). No se vio en un móvil real.
   Limpieza (13-nov): cerrados #140 (frase del informe), #137 (repetido de #84), #142 (el botón ya está
   deshabilitado, no hay nada que reiniciar) y #138 (no existe aviso de fallo que probar; sería función nueva).
   **#71** (`tests/cameraViewMezcla.test.mjs`) y **#66** (`tests/cameraViewLimpiaInput.test.mjs` + retocar una
   aserción de `tests/cameraView.test.mjs`) → **PR #143** (head `44a70c4`) y **PR #144** (head `39c6936`):
   revisados en el PC, 165/165 cada uno (166 juntos), tsc y build OK, checks en verde; mutación de #66 comprobada
   (sin `input.value = ''` la prueba falla). Solo pruebas. **Fusionados** con el sí de Kike (`99c120e`, `a49c140`); main 166/166,
   producción sin cambios (`index-CsJK0rFG.js`). #146 cerrado (la mutación ya está anotada en el PR #144).
   **#145** (helper `tests/helpers/montajeCamara.mjs` para las 3 pruebas de cámara, ficha de Claude) y **#75**
   (aviso de borrosa en fotos <512 px; toca `services/photoQuality.mjs`, ámbar: revisar con cuidado, el umbral
   se calibró con 7 fotos reales de Kike en #44) → **PR #149** (#145, head `871cd46`, 166/166) y **PR #147**
   (#75, head `99e8d29`, 168/168; `assessPhoto` ahora escala siempre el lado largo a 512 px, también hacia
   arriba; bundle `index-C8u_iaeO.js`). Los dos juntos: 168/168. tsc, build y checks en verde. **Fusionados**
   con el sí de Kike (`9fe6848`, `8b640ae`); main 168/168 en el PC, producción `index-C8u_iaeO.js` = build
   local. #75 no está probado con fotos pequeñas reales (solo imágenes sintéticas): una foto pequeña nítida,
   al ampliarla, podría dar aviso de borrosa de más. El aviso solo aconseja, no bloquea. Las fotos de la cámara
   y las subidas grandes (≥512 px) no cambian. Quedan abiertos: #148, #150 y #151 (tickets nuevos del
   revisor, sin triar), #82 (engine-strict, riesgo rojo) y #84 (aparcado), y #22 (mirar en móvil, Kike).
   Ojo: la consola de Claude en el PC se colgó un rato el 13-nov (Bash y PowerShell daban «exit code 107» hasta
   con `echo`); se arregló reiniciando la app.
   Limpieza de tickets del revisor (13-nov): cerrados #121, #119 y #117 (frases del informe convertidas en
   tarjeta por error), #123 (observación sin cambio), #131 (repetido de #84), #126 (repetido de #134) y #124
   (comprobado). Quedan sin ficha completa #127 (silenciar console.log en pruebas) y #129 (texto para lectores
   de pantalla en la gráfica).
   **#111 cerrado sin hacer**: una prueba de componente no distingue el doble toque (React repinta tras cada clic
   y el botón ya está desactivado); la regla ya está probada en `actionPlanDisplay.test.mjs`.
   Ojo: el vigilante que consulta `gh pr list` cada minuto agota el límite GraphQL de GitHub; usar `gh api` (REST).
   Tickets viejos ya cerrados (#51, #95, #86, #77, #83, #79, #80, #104, #89); #102 cerrado el 12-nov (Kike probó el
   recordatorio en su iPhone) junto con el borrador «Probar en iPhone el recordatorio…» del tablero 3dPlant.
   Pendientes en «Pendiente»: tickets del
   revisor de #46 (unificar isToxic, texto del prompt, ruido en PlantCard, plantas de ejemplo) y #22 (mirar «¿Qué le
   pasa?» en móvil, claro y oscuro; aprovechar para ver el botón de #33). Ojo: el
   borrador «Separar el prompt de ai.mjs en dos pasos» del tablero 3dPlant toca lo mismo que #18: no a la vez.
   Siguientes tarjetas: arreglar `package-lock.json` para `npm ci`; pruebas de límites 400/413. Mirar créditos de Netlify 1-2 días después de A1.
   Netlify (docs comprobadas): cada publicación en producción = 15 créditos; vistas previas gratis. El 6-nov,
   tras fusionar #1 y #2: 969,8/1.000. Plan gratis = 300/mes (~20 publicaciones) y para la web al agotarse.
   Kike sigue en Personal; hacia el **1-dic** decidir si baja a Free según el gasto con el Kanban.
1. **Verificar en producción** el cambio de `detail: 'high'` (commit `0a11186`, subido a `main`): ¿mejora
   la identificación de especie? ¿Coste y tiempo de respuesta dentro de lo estimado (~×4 coste, timeout
   con margen)? Sin probar aún contra la IA real.
2. Solo si tras el punto 1 la identificación de especie sigue sin ser suficientemente buena: separar
   identificación de especie y diagnóstico en dos llamadas a OpenAI en `ai.mjs` (hoy sigue siendo una
   sola). Sin diagnosticar todavía (el diagnóstico de esta opción, hecho el 2026-09-27, está en el
   handoff archivado si hace falta retomarlo).
3. Retomar el troceado de `DiagnosisResult.tsx`: aprobar y aplicar el diff de `ActionPlanList` (ya
   diagnosticado), verificar (`tsc` + `build` + pantalla), y seguir con `SummaryCard`, `BottomBar` y
   `TopBar` en otra sesión.
4. Prioridad 2, lo que queda: resto de avisos de React Doctor.
5. Rama `mejoras-diseno-apple`: no fusionar hasta probar el aviso con un diagnóstico real y en el
   móvil (A10); después, abordar A1-A8 por orden de impacto.

~~Recomendado (lo hace Kike en OpenAI): límite mensual de gasto en Billing → Limits.~~ Hecho: límite duro
de 5 $/mes configurado el 2026-09-26, con aviso por email.

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
Mejora de precisión, paso 1: 0a11186 detail:'high' en el diagnóstico por imagen (subido a main, sin
probar aún en producción)
