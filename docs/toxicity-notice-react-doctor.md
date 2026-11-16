# ToxicityNotice: React Doctor antes y después

Medición realizada el 2026-11-16 con React Doctor **0.9.23**, instalado en el repositorio. Se analizó únicamente `components/ToxicityNotice.tsx`, sin caché, consultas de dependencias ni envío de puntuación:

```bash
node_modules/.bin/react-doctor components/ToxicityNotice.tsx --no-supply-chain --no-score --no-cache --json --json-out /tmp/toxicity-before.json
# Después de la extracción:
node_modules/.bin/react-doctor components/ToxicityNotice.tsx --no-supply-chain --no-score --no-cache --json --json-out /tmp/toxicity-after.json
```

| Medición | Avisos del archivo | Resultado |
| --- | --- | --- |
| Antes | 1: `react-doctor/no-high-complexity-react-function` (línea 4) | `ToxicityNotice`: complejidad ciclomática 16, cognitiva 23, anidamiento máximo 3. |
| Después | 0 | Sin diagnósticos; análisis completo del archivo. |

El valor 4 mencionado en la tarjeta no es la complejidad informada por esta versión. Los valores anteriores proceden de la ejecución local, sin cambiar la configuración ni desactivar reglas.

Se extrajo la construcción de los mensajes a la función privada `toxicityMessages`, en el mismo archivo. El componente conserva las props, el retorno vacío para plantas no tóxicas, los textos, el orden de los mensajes, las clases y la nota opcional.

La prueba `tests/toxicityNotice.test.mjs` monta el componente con datos tóxicos, no tóxicos, desconocidos y avisos antiguos. Comprueba textos, clases, nota y ausencia del aviso cuando corresponde. Pasa tanto con la implementación original como con la refactorizada.

Validación final: la comprobación literal de la tarjeta terminó con código 0 (`npm test`: 35 archivos de pruebas aprobados; `npm run build`: correcto). También se revisó el árbol de trabajo, incluyendo archivos nuevos: fuera de `tests/` y `docs/`, solo cambia `components/ToxicityNotice.tsx`. `git diff --check` pasa.
