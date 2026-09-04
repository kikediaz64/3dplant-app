# Contexto Activo

## Foco actual (2026-04-09)
- **Feedback del usuario tras probar la app en el móvil** (3 problemas):
  1. La web no "se guarda" como app (hay que copiar el enlace cada vez). → Solucionado con botón "Instalar" + instrucciones iOS + fix del manifest (referencia rota a `screenshot-1.png`).
  2. La segunda foto ya no diagnostica. → Causa: cuota de Gemini (429). Se añadió mensaje claro en el servidor.
  3. Las plantas guardadas desaparecieron. → Causa: `localStorage` es local del navegador. Se añadió respaldo exportar/importar y compresión de fotos.

## Cambios recientes (sesión 2026-04-09)
- **PWA**: quitado `screenshots` roto del `manifest.json`; botón "Instalar como app" en Ajustes (beforeinstallprompt) + instrucciones iOS/Android.
- **Respaldo**: exportar/importar JSON en Ajustes (`plantStorage.importPlants`).
- **Almacenamiento**: compresión de la foto a 512px antes de guardar (`compressForStorage` en DiagnosisResult); `capturedPlantImage` se limpia tras guardar; try/catch ante `QuotaExceededError`.
- **Errores IA**: `gemini.mjs` devuelve mensaje claro ante HTTP 429 (cuota agotada).

## Próximos pasos
1. Confirmar en el celular: instalar la app (Android: aviso de instalación; iOS: "Añadir a pantalla de inicio") y probar el respaldo exportar/importar.
2. Resolver la cuota de Gemini definitivamente (subir límite en Google Cloud o usar clave con más cuota).
3. (Opcional) Persistencia en la nube (cuenta de usuario + backend) para no depender del navegador.

## Decisiones activas y consideraciones
- Modelo de IA: `gemini-3.6-flash` (probado y funcionando).
- Se usa `fetch` directo a la API REST de Gemini (NO el SDK `@google/genai`, que causaba timeouts).
- Sitio Netlify: `https://famous-churros-89c618.netlify.app`.
- Repo GitHub: `kikediaz64/3dplant-app` (rama `main`), auto-deploy activado.

## Aprendizajes
- El SDK `@google/genai` daba timeout con imágenes; el `fetch` directo funciona (~3s).
- La función Netlify tiene timeout de 25s; el cliente de 60s.
- `hasKey: true` solo confirma que la clave existe, no que sea válida ni que tenga cuota disponible.
