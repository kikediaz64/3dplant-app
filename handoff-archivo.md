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
