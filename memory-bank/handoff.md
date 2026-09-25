# Handoff — Sesión 2026-09-25: Prioridad 1 (seguridad y estabilidad) y Prioridad 2, punto 1

## Estado del repo
Rama main, sincronizada con origin/main tras el push de 54c00da. Working tree limpio antes de este cierre.

## Qué se hizo y por qué
### 1. Rate limiting y validación en netlify/functions/ai.mjs (569e35b, 2a09e6e)
- Problema: cualquiera con la URL podía gastar saldo de OpenAI sin control.
- Se eligió rate limiting nativo de Netlify (opción A). Verificado en su documentación: disponible en
  todos los planes, máx. 2 reglas por proyecto en Free/Starter; la regla exige un `path` propio
  (no se puede en netlify.toml), por eso la función pasó a /api/ai y aiService.ts cambió su URL.
- Topes: imagen 1,5 MB base64 (la app envía 150-500 KB reales), pregunta 500, contexto 1.000 → 413.
- Validación: pregunta que no es texto / vacía / solo espacios → 400; contexto no textual → 400;
  mensajes 413 distintos para pregunta y contexto. GET sin hasKey.
- Límite inicial 5/min; medido en producción: en ráfaga de 12 POST "zzz" pasaron 9 y cortó en la 10ª
  (retraso de hasta 10 s de Netlify). Se bajó a 3/min: ahora pasan 7 y corta en la 8ª.

### 2. Verificación en producción
- /api/ai devuelve JSON, no el index.html (la regla /* → /index.html no lo captura).
- Puerta trasera cerrada: /.netlify/functions/ai da 404 (POST) o el index.html (GET); ya no llega
  a la función. Al tener `path` propio, la ruta antigua deja de servirse.
- Pruebas sin coste: acción inválida "zzz" devuelve 400 pero cuenta para el límite.

### 3. Deploy (punto 2)
- Netlify vuelve a publicar tras cada push (créditos repuestos). Netlify NO publica estados en GitHub,
  así que se comprueba sondeando el nombre del bundle en producción o el efecto en la función.

### 4. Recuadro falso "Área Afectada" (9604b48)
- Era un marco fijo (50 % central) sin relación con la IA. Se eligió eliminarlo (opción A);
  la alternativa B (coordenadas de la IA) se descartó por baja fiabilidad de gpt-4o-mini con
  detail:'low', problemas de geometría con bg-cover y más coste/latencia.
- Verificado: build OK, 0 referencias en código y en el JS de producción, y vista real en navegador.

### 5. Mensaje amable del 429 (Prioridad 2, punto 1) (54c00da)
- Problema: al superar el rate limit, el usuario veía "HTTP 429" en crudo (diagnóstico: "Error al analizar
  la planta: HTTP 429. Por favor, intenta de nuevo."; chat: "⚠️ Error: HTTP 429").
- Hay dos 429 distintos y se distinguen por el cuerpo: vacío = rate limit de Netlify; con JSON `error`
  = cuota/saldo de OpenAI generado por ai.mjs. Este último se muestra genérico ("no disponible") y su
  detalle va solo a console.error.
- Cambios: aiService.ts (clase AIUserError + ramas del 429 + `if (error instanceof AIUserError) throw
  error` en el catch, porque el catch original re-creaba un Error genérico y perdía la marca);
  DiagnosisResult.tsx y PlantAssistant.tsx muestran el mensaje sin prefijo si es AIUserError.
- Alcance: acordado solo aiService.ts; se amplió a las dos pantallas (con aprobación) porque, sin ellas,
  el diagnóstico saldría "…vuelve a intentarlo.. Por favor, intenta de nuevo." (doble punto y
  contradictorio). Error mío: primero afirmé que las pantallas no necesitaban cambios.
- Verificación: build OK; callAI con fetch simulado 17 OK / 0 FAIL (429 vacío, 429 JSON, 500, 400, 200);
  ambas pantallas vistas en navegador con respuestas simuladas. En producción: bundle publicado en ~15 s
  con los dos textos, y ráfaga de 12 GET a /api/ai → pasan 6, corta en la 7ª con 429 de cuerpo vacío,
  sin Content-Type ni Retry-After (por eso el "espera un minuto" es aproximado).
- No se ha visto el mensaje en pantalla en producción (se deja para la prueba desde el móvil, para no
  gastar el cupo dos veces).

## Notas
- Vercel: el repo mostraba estados de Vercel en GitHub (569e35b, 2a09e6e) y no en 9604b48.
  Según Kike, el proyecto fantasma de Vercel está limpiado; Claude no lo verificó ni lo tocó.
- Copias de seguridad previas a los cambios en G:\Laboratorio IA\3dPlant\backups-p1\ (fuera del repo).
- Fallo mío durante las pruebas: el script de pruebas se rompió por un escapado y un "0 FAIL"
  intermedio no era válido (no había arrancado); se repitió y dio 18 OK / 0 FAIL.

## Pendiente (Prioridad 2)
Botones inferiores en escritorio · avisos de React Doctor (DiagnosisResult.tsx y PlantAssistant.tsx:89)
· decidir botón "Reintentar" en la pantalla de error · prueba real desde el móvil (esperar 1-2 min desde
la última ráfaga; ahí se verá también el mensaje del 429) · límite mensual de gasto en OpenAI (lo hace Kike).
