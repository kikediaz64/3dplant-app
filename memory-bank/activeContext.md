# Contexto Activo

## Foco actual (2026-09-06)
- **Bugs/features en la UI del jardín:**
  1. El contador "Próximo riego" no decrecía con los días (quedaba congelado). → Corregido con re-render periódico.
  2. No había forma de eliminar plantas guardadas ni de quitar las 3 plantas de ejemplo. → Añadido icono de papelera + descarte de mock plants.

## Cambios recientes (sesión 2026-09-06)
- **Riego dinámico:** `GardenGallery` y `PlantDetail` re-renderizan cada 60s y al recuperar foco/visibilidad.
- **Plantas de ejemplo dinámicas:** `MOCK_PLANTS` con `wateringFrequencyDays` + `lastWateredAt`.
- **Eliminar plantas:** papelera en `PlantCard` y `PlantDetail`; mock plants descartables (localStorage `dismissedMockPlants`) y restaurables desde Ajustes.
- **Commit:** `f067de7` pusheado a `origin/main`.

## ⚠️ Bloqueo de despliegue
- Netlify con créditos agotados → deploys pausados. El commit `f067de7` está "Skipped". El usuario añadió créditos; falta disparar el deploy manualmente y verificar "Published".

## Próximos pasos
1. Disparar deploy en Netlify y verificar que la URL sirve el bundle nuevo (`index-C7ghK_Yf.js`).
2. Confirmar en el móvil: papelera + botón "Restaurar plantas de ejemplo".
3. (Opcional) Evaluar migración a Cloudflare Pages si Netlify vuelve a bloquear.

## Decisiones activas y consideraciones
- Modelo de IA: `gpt-4o-mini` (OpenAI), vía función serverless `/.netlify/functions/ai`.
- Sitio Netlify: `https://famous-churros-89c618.netlify.app`.
- Repo GitHub: `kikediaz64/3dplant-app` (rama `main`), auto-deploy activado (sujeto a créditos).
