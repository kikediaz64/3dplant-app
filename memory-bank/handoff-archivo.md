# Handoff — Sesión 2026-09-06

## Estado del repo
- Rama `main`, working tree limpio, todo pusheado a `origin/main`.
- Commit de esta sesión: `f067de7` — feat: eliminar plantas individuales y actualizar próximo riego en tiempo real.

## ⚠️ BLOQUEO ACTUAL — Despliegue pausado en Netlify (créditos)
- Netlify tiene **créditos agotados** → deploys de producción **pausados** ("Production deploys are paused…").
- El deploy del commit `f067de7` quedó en estado **"Skipped"** (igual que los anteriores `4efa43a`, `3338ade`, `34868bd`), motivo: *"Skipped due to account credit usage exceeded"*.
- El usuario **ya añadió créditos**, pero Netlify **NO relanza solo** los deploys saltados: hay que dispararlo manualmente.
- Al cerrar la sesión, la URL de producción **sigue sirviendo el bundle VIEJO** (`index-DwAVs3aA.js`); la versión nueva es `index-C7ghK_Yf.js`.
- URL producción: `https://famous-churros-89c618.netlify.app`.

## Qué se hizo en esta sesión

### 1. Bug: "Próximo riego" no decrecía con los días
- **Causa:** no había re-render periódico; `getWateringStatus()` solo se calculaba al renderizar. En PWA (iOS/Android) el componente no se remonta al reabrir, así que el texto quedaba congelado.
- **Fix:** en `GardenGallery.tsx` y `PlantDetail.tsx` se añadió un `setInterval` de 60s + listeners `visibilitychange` y `focus` que fuerzan un re-render.
- Las 3 plantas de ejemplo (`MOCK_PLANTS`) no tenían `lastWateredAt` → se les añadió `wateringFrequencyDays` + `lastWateredAt` (helper `daysAgo()` en `constants.tsx`) para que también sean dinámicas.

### 2. Eliminar plantas + quitar las 3 plantas de ejemplo
- Nuevo **icono de papelera** en `PlantCard.tsx` (esquina sup. derecha de la foto) y **botón papelera** en `PlantDetail.tsx` (barra superior, con confirmación).
- Plantas guardadas: se borran con `plantStorage.deletePlant(id)` (borrado real de localStorage).
- Plantas de ejemplo: se "descartan" con `plantStorage.dismissMockPlant(id)` (soft-delete; clave localStorage `dismissedMockPlants`). Se restauran desde Ajustes con `restoreMockPlants()`.
- Helper `isMockPlant(id)` en `constants.tsx`.

### Archivos modificados
- `components/PlantCard.tsx`, `constants.tsx`, `screens/GardenGallery.tsx`, `screens/PlantDetail.tsx`, `screens/Settings.tsx`, `services/plantStorage.ts`.

## Próximos pasos
1. **(USUARIO)** Netlify → **Deploys** → **"Trigger deploy" → "Deploy site"** (o "Retry" sobre `f067de7`) → esperar **"Published"**.
2. Verificar en el móvil: cerrar/reabrir la app y confirmar (a) papelera en cada planta y (b) botón "Restaurar plantas de ejemplo" en Ajustes.
3. (Opcional) Si Netlify vuelve a dar problemas de créditos, plantear migración a **Cloudflare Pages** (gratis, soporta functions serverless como `ai.mjs`).

## Decisiones técnicas clave (nuevas)
- **Riego dinámico:** re-render por temporizador + eventos `visibilitychange`/`focus` (no tocar `getWateringStatus`, que ya calcula bien).
- **Borrado:** mock plants = soft-delete (descartadas en `dismissedMockPlants`); guardadas = borrado real de `savedPlants`.
- **Clave de IA:** sigue solo en Netlify (`OPENAI_API_KEY`), nunca en el bundle.
- Modelo IA: `gpt-4o-mini` (OpenAI), vía función serverless `/.netlify/functions/ai`.
