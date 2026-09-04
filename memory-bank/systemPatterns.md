# Patrones del Sistema / Arquitectura

## Arquitectura general
SPA (React 19 + Vite 6 + TypeScript) desplegada en Netlify como sitio estático, con una **serverless function** para hablar con la IA.

### Flujo de diagnóstico
1. `CameraView.tsx` captura la foto (el video siempre está montado; el stream se adjunta después del mount, evitando pantalla negra).
2. `services/aiService.ts` (`diagnosePlant`) envía `{ action: 'diagnose', imageBase64 }` a `/.netlify/functions/ai`.
3. `netlify/functions/ai.mjs` lee `OPENAI_API_KEY` del entorno y llama a OpenAI REST (GPT-4o-mini).
4. La respuesta JSON se parsea en el cliente (`extractJson` limpia markdown) y se muestra en `DiagnosisResult.tsx`.

## Componentes y relaciones
- `App.tsx` — enrutado (HashRouter) con rutas: `/` (jardín), `/scan`, `/result`, `/plant/:id`, `/settings`, `/assistant/:plantId?`.
- `screens/GardenGallery.tsx` — lista de plantas + filtro "Necesita agua" + botón flotante de asistente.
- `screens/CameraView.tsx` — cámara y captura.
- `screens/DiagnosisResult.tsx` — resultado del diagnóstico + guardar.
- `screens/PlantDetail.tsx` — detalle ampliado + botón regar + asistente (link con contexto).
- `screens/PlantAssistant.tsx` — chat con contexto de planta.
- `components/PlantCard.tsx` — tarjeta de planta con estado de riego.
- `services/plantStorage.ts` — persistencia en localStorage + cálculo de riego.
- `services/aiService.ts` — cliente IA (solo llama a la función; NO tiene la clave).
- `constants/dailyTips.ts` — tips diarios.
- `types.ts` y `constants.tsx` — tipos y constantes globales.

## Decisiones técnicas clave
- **Seguridad**: la clave de IA está solo en Netlify (`OPENAI_API_KEY`), nunca en el bundle del cliente.
- **IA por fetch directo**: se usa `fetch` a `https://api.openai.com/v1/chat/completions` con header `Authorization: Bearer`.
- **Modo JSON**: en `diagnose` se usa `response_format: { type: 'json_object' }`.
- **Riego**: `getWateringStatus()` calcula con `wateringFrequencyDays` y `lastWateredAt`.
- **Persistencia**: localStorage con clave `savedPlants`.
- **HashRouter** (no BrowserRouter) para que las rutas funcionen en Netlify sin redirecciones especiales.
- **Estructura sin `src/`**: componentes/screens/services/constants en la raíz del proyecto.

## Rutas de implementación críticas
- `netlify/functions/ai.mjs` — única conexión con la IA (seguridad + prompts + timeout).
- `services/aiService.ts` — contrato cliente ↔ función.
- `services/plantStorage.ts` — modelo de datos y lógica de riego.
