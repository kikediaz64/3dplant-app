# Handoff — 3dPlant v2

## Sesión 2026-09-26 — Historial de diagnósticos por planta, con reescaneo desde la ficha

**Punto de partida (diagnóstico, solo lectura).** No existía «reescanear»: cada escaneo creaba una planta
nueva (`savePlant`, id nuevo) y cada planta guardaba un único diagnóstico, como texto
(`"Aviso · 64/100"`). No había nada que se sobrescribiera.

**Decisiones de Kike**
- Flujo de reescaneo desde la ficha: botón «Nuevo diagnóstico» → `/scan?plantId=X` → `/result` → «Añadir al
  historial» (en vez de crear planta nueva).
- Tope de 10 diagnósticos por planta (se descarta el más antiguo) y fotos del historial más comprimidas.
- El diagnóstico más reciente es el «actual» (PlantCard y resumen de la ficha), sin selección manual.
- Cancelar un reescaneo vuelve a la ficha de la planta. El reescaneo NO toca riego (`needsWater`,
  `lastWateredAt`, `wateringFrequencyDays`), nombre ni ubicación.
- Tarjeta del historial al principio de la ficha (antes de «Historia»), no al final como se propuso.
- Caso «planta borrada antes de llegar a /result»: se deja sin proteger (la X/volver lleva a una ficha que
  dirá «Planta no encontrada»). Si al guardar la planta ya no existe, se guarda como planta nueva y el botón
  lo dice.

**Qué se hizo** (por bloques, con diff literal aprobado y copia `.bak` antes de cada uno)
1. `types.ts`, `services/plantStorage.ts`: `DiagnosisEntry`, `Plant.diagnosisHistory?` (opcional, sin
   migración), `getDiagnosisHistory` (planta antigua = una entrada sintética con su diagnóstico de siempre) y
   `addDiagnosis` (una sola escritura; tope 10). `savePlant` no se tocó: el llamador pasa
   `diagnosisHistory: [entry]`.
2. `CameraView.tsx`, `DiagnosisResult.tsx`: `plantId` por query string en `/scan` y `/result`; cancelar y
   «Volver» → ficha; «Tomar otra foto» conserva `plantId`. Variación aprobada: `plantData` queda fuera del
   `if/else` (mismo resultado, diff más corto). `compressForStorage` ahora acepta tamaño y calidad.
3. Bloqueo de doble pulsación en guardar (`useRef` + estado `saving`; se libera si falla). Copia `.bak2`.
4. `PlantDetail.tsx`: tarjeta «Historial de diagnósticos» (miniatura, fecha, estado, puntuación, etiqueta
   «Actual»), botón «Nuevo diagnóstico» (no en plantas de ejemplo) y el botón cerrar pasa de `navigate(-1)` a
   `navigate('/')` para no caer en `/scan` o `/result` tras un reescaneo.
5. Commit `7e48e75` «feat: historial de diagnósticos por planta, con reescaneo desde la ficha» (5 ficheros,
   +204/−32). **Sin push.**

**Qué se comprobó y con qué resultado**
- `tsc --noEmit` y `vite build`: exit 0 tras cada bloque (no se repitieron después del commit).
- Lógica de `plantStorage` con un `localStorage` falso (esbuild + node, fuera del proyecto): 13 pruebas OK
  (planta antigua, texto sin puntuación, mock, historial corrupto, tope 10, riego intacto, id inexistente,
  cuota llena).
- Navegador local (dev server en `127.0.0.1:5199`, planta antigua sembrada a mano): la ficha muestra la
  tarjeta arriba con una fila («1 ago 2026, 12:30 · Aviso · Actual · 64/100»); `localStorage` no se modificó;
  «Nuevo diagnóstico» abre `#/scan?plantId=…`; cancelar vuelve a la ficha; la X de la ficha va a `#/`.
  Consola sin mensajes, pero solo se leyó después de cargar la página (prueba débil).
- Medición de miniaturas con 7 fotos reales de baterías (no de plantas): principal 512 px/0,7 ≈ 33 KB;
  miniatura 240 px/0,5 ≈ 7,3 KB (5,8–9,5). Cota baja; con follaje puede pesar más.
- El gancho de pre-commit ejecuta React Doctor: 14 avisos, 64/100, no bloqueó el commit (exit 0). Escaneó
  solo los 5 ficheros del commit; sin línea base para separar avisos nuevos de antiguos.

**Qué NO se comprobó**
- Un reescaneo real de punta a punta con la IA (guardar, fila nueva, «Actual», riego intacto, miniatura de
  una foto real). Pendiente; el dev server local puede no tener el endpoint `/api/ai` (sin comprobar).
- Nada en producción (no hay push).
- El bloqueo de doble pulsación en pantalla, el aspecto en móvil y en modo claro.

**Descubrimientos útiles**
- La app usa `HashRouter`: las rutas para probar son `/#/plant/<id>`, no `/plant/<id>`; cambiar la URL con
  `pushState` sin recargar no re-renderiza.
- Hay un gancho de pre-commit con React Doctor: avisa de «regresiones» pero no bloquea.
- `.bak` no está en `.gitignore`: para commitear se añadieron los ficheros por nombre.

**Pendiente**
- `.bak` sin borrar hasta confirmar el reescaneo real: `types.ts.bak`, `services/plantStorage.ts.bak`,
  `screens/CameraView.tsx.bak`, `screens/DiagnosisResult.tsx.bak` y `.bak2`, `screens/PlantDetail.tsx.bak`.
