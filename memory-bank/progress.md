# Progreso

## Qué funciona ✅
- Cámara: video siempre montado, stream se adjunta tras el mount (sin pantalla negra).
- Diagnóstico por foto vía Netlify Function → Gemini (fetch directo, ~3s).
- Guardar plantas en "Mi Jardín" (localStorage).
- Ciclos de riego: frecuencia + última fecha + "Regar ahora" + aviso automático "necesita agua".
- Filtro simplificado "Necesita agua".
- Detalle de planta ampliado: abono/fertilización, plagas e insecticidas (con dosis), remedios caseros.
- Asistente de plantas con contexto (ruta `/assistant/:plantId?`, botón en jardín y detalle).
- Seguridad: clave de IA en el servidor (Netlify Function), fuera del bundle del cliente.
- PWA instalable: manifest corregido + botón "Instalar" + instrucciones iOS/Android (Ajustes).
- Respaldo de datos: exportar/importar JSON (Ajustes).
- Compresión de fotos al guardar (512px) para no llenar el almacenamiento.

## Qué falta / en progreso ⏳
- **Resolver cupo de Google (429)**: bloquea diagnóstico y asistente hasta que la clave tenga cuota o se suba el límite.
- Verificar desde el celular: diagnóstico y chat funcionando tras resolver la cuota.

## Problemas conocidos
- `429` → puede ser cuota/saldo agotado del proveedor de IA (ahora OpenAI). Ya se muestra un mensaje claro al usuario.
- `localStorage` es frágil: los datos viven solo en el navegador actual (cambiar de navegador, modo incógnito o limpiar datos = perder las plantas). Mitigado con respaldo exportar/importar.
- (Histórico) El SDK `@google/genai` causaba timeouts → se reemplazó por `fetch` directo.
- (Histórico) Error `Expected property name or '}' in JSON` en POST → fue transitorio; el error definitivo es el 429 de cuota.
- Modelo `gpt-4o-mini` (OpenAI): vigente y barato ($0.15/$0.60 por 1M tokens).

## Evolución de decisiones
1. Diagnóstico inicial con `@google/genai` → daba timeout con imágenes.
2. Cambio a `fetch` directo a la API REST de Gemini → funciona.
3. Clave en el cliente (`vite.config.ts` define) → **inseguro**.
4. Migración a Netlify Function + env var → seguro, clave solo en servidor.
5. Filtros (zona/luz/tipo) → simplificados a solo "necesita agua".
6. Detalle de planta básico → ampliado con abono, plagas y remedios.
7. Proveedor IA: Google Gemini → **OpenAI GPT-4o-mini** (por el cupo limitado del tier gratuito de AI Studio).

## Documentación pendiente
- `docs/superpowers/plans/2026-02-09-fix-3dplant-bugs.md` está desactualizado (refleja filtros viejos). Considerar actualizarlo o reemplazarlo por este Memory Bank.
