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
