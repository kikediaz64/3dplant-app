# Progreso

## Qué funciona ✅
- Cámara: video siempre montado, stream se adjunta tras el mount (sin pantalla negra).
- Diagnóstico por foto vía Netlify Function → OpenAI (fetch directo, ~3s).
- Guardar plantas en "Mi Jardín" (localStorage).
- Ciclos de riego: frecuencia + última fecha + "Regar ahora" + aviso automático "necesita agua".
- **Contador "Próximo riego" dinámico:** se actualiza con el paso del tiempo (re-render periódico).
- **Eliminar plantas:** papelera en tarjeta y detalle; las guardadas se borran y las de ejemplo se descartan (restaurables desde Ajustes).
- Filtro simplificado "Necesita agua".
- Detalle de planta ampliado: abono/fertilización, plagas e insecticidas (con dosis), remedios caseros.
- Asistente de plantas con contexto (ruta `/assistant/:plantId?`, botón en jardín y detalle).
- Seguridad: clave de IA en el servidor (Netlify Function), fuera del bundle del cliente.
- PWA instalable: manifest corregido + botón "Instalar" + instrucciones iOS/Android (Ajustes).
- Respaldo de datos: exportar/importar JSON (Ajustes).
- Compresión de fotos al guardar (512px) para no llenar el almacenamiento.

## Qué falta / en progreso ⏳
- **Desplegar la versión nueva en Netlify:** créditos agotados pausaron los deploys; el usuario añadió créditos pero falta disparar el deploy manualmente y confirmar "Published".

## Problemas conocidos
- **Netlify credit-based:** cuando se agotan los créditos, los deploys se pausan y no se relanzan solos (hay que "Trigger deploy").
- `localStorage` es frágil: los datos viven solo en el navegador actual. Mitigado con respaldo exportar/importar.
- Modelo `gpt-4o-mini` (OpenAI): de pago por uso; requiere saldo/crédito.
- (Histórico) `429` de Gemini por cuota → se migró a OpenAI.
- (Histórico) El SDK `@google/genai` causaba timeouts → `fetch` directo.

## Evolución de decisiones
1. Diagnóstico inicial con `@google/genai` → daba timeout con imágenes.
2. Cambio a `fetch` directo a la API REST de Gemini → funciona.
3. Clave en el cliente (`vite.config.ts` define) → **inseguro**.
4. Migración a Netlify Function + env var → seguro, clave solo en servidor.
5. Filtros (zona/luz/tipo) → simplificados a solo "necesita agua".
6. Detalle de planta básico → ampliado con abono, plagas y remedios.
7. Proveedor IA: Google Gemini → **OpenAI GPT-4o-mini** (por el cupo limitado del tier gratuito de AI Studio).
8. **Riego:** re-render periódico para que el contador "Próximo riego" baje solo.
9. **Borrado de plantas:** papelera + descarte de plantas de ejemplo (soft-delete) + restaurar desde Ajustes.

## Documentación pendiente
- `docs/superpowers/plans/2026-02-09-fix-3dplant-bugs.md` está desactualizado (refleja filtros viejos). Considerar actualizarlo o reemplazarlo por este Memory Bank.
