# Handoff — 3dPlant v2

## Sesión 2026-09-27 (tarde) — Mejora de precisión, paso 1: `detail: 'high'` en el diagnóstico

**Punto de partida.** Kike confirmó que el límite mensual de gasto en OpenAI (5 $, límite duro, con
aviso por email) ya estaba configurado el 2026-09-26 — corregida la nota de `ESTADO.md` que lo daba
como pendiente.

**Decisión.** La mejora de precisión del diagnóstico se separa en dos pasos independientes. Hoy solo
el más simple y barato: subir `detail: 'low'` a `'high'` en la imagen que recibe OpenAI, sin tocar la
arquitectura (sigue siendo una sola llamada a OpenAI, una sola petición del cliente a `/api/ai`).
Separar identificación de especie y diagnóstico en dos llamadas queda pendiente, y solo se retoma si,
tras probar `detail: 'high'`, la identificación de especie sigue sin mejorar.

**Diagnóstico antes de tocar código**
- Confirmado con `CameraView.tsx:76`: la imagen que llega a la IA ya está redimensionada a `MAX_DIM =
  1024` px (calidad JPEG 0.8) antes de convertirse a base64.
- Coste estimado con `detail: 'high'` sobre esa imagen: ×4 aprox. por diagnóstico (de ~0,001 $ a
  ~0,004-0,005 $), por el salto en tokens de imagen (fórmula de gpt-4o-mini, estimación aproximada, no
  exacta). Con el tope de 5 $/mes, deja margen para ~1.000-1.200 diagnósticos/mes.
- Timeout de 24 s en `ai.mjs`: sin cambios necesarios, sigue siendo una sola llamada con margen de sobra.
- Sin razón encontrada para no aplicar el cambio ahora.

**Qué se hizo**
1. Cambio de una línea en `netlify/functions/ai.mjs` (línea 83): `detail: 'low'` → `'high'` en la
   llamada de diagnóstico (no afecta a `action: 'ask'`).
2. Copia de seguridad `ai.mjs.bak` antes de tocar el archivo (sin seguimiento en git, sin borrar).
3. `ESTADO.md` actualizado: nota del límite de gasto marcada como hecha (2026-09-26); entrada nueva en
   «Qué funciona» documentando el cambio de `detail` y sus estimaciones.
4. Commit `0a11186` («feat: mejorar precisión con detail:'high' en el diagnóstico por imagen»), solo con
   `ai.mjs` y `ESTADO.md` — se dejaron fuera a propósito `handoff.md`, `handoff-archivo.md` y
   `DiagnosisResult.tsx` (troceado pendiente de otra sesión, sin terminar). Push hecho a `main`
   (`b058115..0a11186`); Netlify debería desplegarlo solo.

**Qué se comprobó y con qué resultado**
- `node --check netlify/functions/ai.mjs`: sintaxis OK. No aplica `tsc`/`npm run build` (archivo JS puro
  de Netlify Functions, no TypeScript del frontend).

**Qué NO se comprobó**
- **Sin probar contra la IA real ni en producción.** No se ha verificado si la identificación de especie
  mejora de verdad con `detail: 'high'`, ni si el coste real coincide con la estimación, ni el tiempo de
  respuesta real en producción.

**Pendiente**
- Verificar en producción, con diagnósticos reales: ¿mejora la identificación de especie con
  `detail: 'high'`? ¿Coste y tiempo de respuesta dentro de lo estimado?
- Paso 2 (separar identificación de especie y diagnóstico en dos llamadas a OpenAI): **solo si**, tras
  probar el paso 1, la identificación de especie sigue sin ser suficientemente buena. Sin empezar.
- Retomar el troceado de `DiagnosisResult.tsx` desde `ActionPlanList` (diff ya diagnosticado, sin
  aplicar) — sigue igual que la sesión anterior, ver `handoff-archivo.md`.
- Resto de pendientes sin cambios: ver `ESTADO.md`.
