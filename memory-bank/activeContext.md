# Contexto Activo

## Foco actual (2026-02-09 → 2026-02-10)
- **Resolver el cupo de la API de Google**: el diagnóstico y el asistente devuelven error `429 "You exceeded your current quota"`. No es error de código; es límite de cuota de la clave.
- El usuario tiene **Google AI Pro** (suscripción paga), pero la clave `AQ.Ab8...` es de **AI Studio** y tiene su propio cupo diario separado.

## Cambios recientes (sesión 2026-02-09)
- **Seguridad**: clave movida a Netlify Function (`netlify/functions/gemini.mjs`) + env var `GEMINI_API_KEY`. Se eliminó `define` de `vite.config.ts` y el SDK `@google/genai` dejó de usarse en el cliente.
- **Asistente de plantas** (`screens/PlantAssistant.tsx`, ruta `/assistant/:plantId?`) con contexto de planta.
- **Ciclos de riego** (campos `wateringFrequencyDays`, `lastWateredAt`, función `getWateringStatus()`, botones "Regar ahora").
- **Filtros simplificados**: se quitaron Zona/Luz/Tipo; solo queda el chip "Necesita agua".
- **Detalle de planta ampliado** (secciones abono, plagas/insecticidas con dosis, remedios caseros).

## Próximos pasos (mañana)
1. Revisar cuotas en `console.cloud.google.com` → "Generative Language API" → "Quotas & System Limits".
2. Si es cuota por minuto: esperar y probar. Si es por día: subir el límite o esperar al reset.
3. Probar desde el celular: diagnóstico (foto) y asistente (chat).
4. (Opcional) Actualizar o retirar el plan viejo `docs/superpowers/plans/2026-02-09-fix-3dplant-bugs.md` (está desactualizado).

## Decisiones activas y consideraciones
- Modelo de IA: `gemini-3.6-flash` (probado y funcionando).
- Se usa `fetch` directo a la API REST de Gemini (NO el SDK `@google/genai`, que causaba timeouts).
- Sitio Netlify: `https://famous-churros-89c618.netlify.app`.
- Repo GitHub: `kikediaz64/3dplant-app` (rama `main`), auto-deploy activado.

## Aprendizajes
- El SDK `@google/genai` daba timeout con imágenes; el `fetch` directo funciona (~3s).
- La función Netlify tiene timeout de 25s; el cliente de 60s.
- `hasKey: true` solo confirma que la clave existe, no que sea válida ni que tenga cuota disponible.
