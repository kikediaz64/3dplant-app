# Handoff — Sesión 2026-04-09

## Estado del repo
- Rama `main`, working tree limpio, todo pusheado a `origin/main`.
- Netlify auto-deploy activo (URL: `https://famous-churros-89c618.netlify.app`).

## Commits de esta sesión
1. `76ff41e` — fix: PWA instalable + respaldo exportar/importar + compresión de fotos + mensajes de error claros.
2. `4858172` — feat: migrar IA a OpenAI GPT-4o-mini + renombrar `gemini` → `ai`.

## Qué se hizo
1. **Problemas reportados por el usuario (móvil):**
   - La web no se guardaba como app → manifest corregido + botón "Instalar" + instrucciones iOS/Android en Ajustes.
   - La 2ª foto fallaba → causa: cuota de Gemini (429). Migrado a OpenAI.
   - Las plantas desaparecían → causa: `localStorage` local del navegador. Añadido respaldo exportar/importar.
2. **Almacenamiento:** compresión de fotos a 512px al guardar, limpieza de `capturedPlantImage`, manejo de `QuotaExceededError`.
3. **Migración de proveedor IA:** Gemini → **OpenAI GPT-4o-mini**.
   - Endpoint: `https://api.openai.com/v1/chat/completions` (auth `Bearer`).
   - Diagnóstico con `response_format: { type: 'json_object' }`.
   - Env var server-side: `OPENAI_API_KEY`.
4. **Renombrado:** `netlify/functions/gemini.mjs` → `ai.mjs` (ruta `/.netlify/functions/ai`); `services/geminiService.ts` → `aiService.ts` (`callAI`).

## ⚠️ PENDIENTE — acción del USUARIO (bloquea el funcionamiento)
- Configurar `OPENAI_API_KEY` (clave `sk-...`) en Netlify → Site configuration → Environment variables.
- Disparar un deploy después de añadirla.
- Verificar: `GET https://famous-churros-89c618.netlify.app/.netlify/functions/ai` → `{"ok":true,"hasKey":true}`.
- Nota: OpenAI es de pago por uso (requiere saldo/crédito en la cuenta).

## Próximos pasos sugeridos
1. Probar el diagnóstico en el móvil con GPT-4o-mini.
2. (Opcional) Híbrido con PlantNet para mayor precisión en la especie.
3. (Opcional) Persistencia en la nube (cuenta de usuario + backend) en lugar de `localStorage`.
4. Los scripts `test-*.mjs` (en `.gitignore`) siguen apuntando a Gemini: obsoletos, borrar o actualizar si se necesitan.

## Decisiones técnicas clave
- Modelo: `gpt-4o-mini` ($0.15 / $0.60 por 1M tokens).
- La clave de IA vive solo en Netlify (nunca en el bundle del cliente).
- Nombre de función heredado "gemini" eliminado; ahora todo se llama `ai`.
