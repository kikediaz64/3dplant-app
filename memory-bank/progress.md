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

## Qué falta / en progreso ⏳
- **Resolver cupo de Google (429)**: bloquea diagnóstico y asistente hasta que la clave tenga cuota o se suba el límite.
- Verificar desde el celular: diagnóstico y chat funcionando tras resolver la cuota.

## Problemas conocidos
- `429 "You exceeded your current quota"` → límite de la clave de AI Studio (no es bug de código).
- (Histórico) El SDK `@google/genai` causaba timeouts → se reemplazó por `fetch` directo.
- (Histórico) Error `Expected property name or '}' in JSON` en POST → fue transitorio; el error definitivo es el 429 de cuota.
- Modelo `gemini-3.6-flash`: verificar disponibilidad si Google lo cambia.

## Evolución de decisiones
1. Diagnóstico inicial con `@google/genai` → daba timeout con imágenes.
2. Cambio a `fetch` directo a la API REST de Gemini → funciona.
3. Clave en el cliente (`vite.config.ts` define) → **inseguro**.
4. Migración a Netlify Function + env var → seguro, clave solo en servidor.
5. Filtros (zona/luz/tipo) → simplificados a solo "necesita agua".
6. Detalle de planta básico → ampliado con abono, plagas y remedios.

## Documentación pendiente
- `docs/superpowers/plans/2026-02-09-fix-3dplant-bugs.md` está desactualizado (refleja filtros viejos). Considerar actualizarlo o reemplazarlo por este Memory Bank.
