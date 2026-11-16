# PlantDetail: React Doctor antes y después

Medición local del 2026-11-16 con React Doctor **0.9.23**, sin modificar reglas. La base incluye la extracción de ToxicityNotice (#179, tarjeta #158).

```bash
node_modules/.bin/react-doctor screens/PlantDetail.tsx --no-supply-chain --no-score --no-cache --json --json-out /tmp/plant-detail-before.json
# Después de extraer los subcomponentes:
node_modules/.bin/react-doctor screens/PlantDetail.tsx --no-supply-chain --no-score --no-cache --json --json-out /tmp/plant-detail-after.json
node_modules/.bin/react-doctor components/plant-detail --no-supply-chain --no-score --no-cache --json --json-out /tmp/plant-detail-components.json
```

| Aviso | Antes (`PlantDetail.tsx`) | Después (`PlantDetail.tsx`) |
| --- | --- | --- |
| `no-high-complexity-react-function` | Línea 21: complejidad ciclomática 17, cognitiva 12, profundidad máxima 1 | Ninguno |
| `no-giant-component` | Línea 21: componente de más de 300 líneas | Ninguno |
| `no-array-index-as-key` | Líneas 190, 201 y 297 | Trasladados sin cambios a los subcomponentes |

El archivo pasa de 339 a 115 líneas. La complejidad medida antes es 17, frente al 21 indicado en la tarjeta. El análisis posterior de la pantalla termina completo y sin diagnósticos. Los cuatro archivos nuevos tampoco presentan avisos de complejidad ni tamaño; conservan los tres avisos por claves de índice (dos en `PlantDiagnosisDetails`, uno en `PlantCareSections`), expresamente fuera de alcance.

Se extraen cabecera, historial, diagnóstico y cuidados en `components/plant-detail/`. Se mantienen el JSX, textos, clases, orden, rutas y condiciones originales. La pantalla conserva el estado, los temporizadores y las acciones de riego, borrado y exportación del calendario. No se modifica ToxicityNotice ni otras pantallas.

Validación: la comprobación literal de la tarjeta terminó con código 0: `npm test` aprobó los 35 archivos de pruebas (incluidos `plantDetailRecordatorios.test.mjs`, `plantDetailTones.test.mjs` y `regadaBoton.test.mjs`, sin modificarlos) y `npm run build` pasó. `git diff --check` también pasa. Se revisó además el árbol de trabajo, ya que la comparación `origin/main...HEAD` no incluye cambios sin commit: el único archivo existente modificado es `screens/PlantDetail.tsx`; solo se añaden los cuatro subcomponentes y este documento. No se realizó validación visual en navegador.
