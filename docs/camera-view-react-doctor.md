# CameraView: React Doctor antes y después

Medición local del 2026-11-16 con React Doctor **0.9.23**, sin modificar reglas. La base es `908dfc9`, que incluye PlantDetail (#180, tarjeta #177).

```bash
node_modules/.bin/react-doctor screens/CameraView.tsx --no-supply-chain --no-score --no-cache --json --json-out /tmp/camera-view-before.json
# Después de extraer los subcomponentes:
node_modules/.bin/react-doctor screens/CameraView.tsx --no-supply-chain --no-score --no-cache --json --json-out /tmp/camera-view-after.json
node_modules/.bin/react-doctor components/camera-view --no-supply-chain --no-score --no-cache --json --json-out /tmp/camera-view-components.json
```

| Aviso | Antes (`CameraView.tsx`) | Después |
| --- | --- | --- |
| `no-high-complexity-react-function` | Línea 7: complejidad ciclomática 16, cognitiva 16, profundidad máxima 2 | Ninguno en la pantalla ni en los subcomponentes |
| `no-giant-component` | Línea 7: componente de más de 300 líneas | Ninguno en la pantalla ni en los subcomponentes |
| `no-array-index-as-key` | Línea 261 | Conservado en `CameraPhotos.tsx:13` |
| `no-create-object-url-without-revoke` | Línea 136 | Conservado en `CameraView.tsx:140` |

La complejidad medida antes es 16, frente al 7 indicado en la tarjeta. El archivo pasa de 326 a 227 líneas. Ambos análisis posteriores terminan completos; solo quedan los dos avisos fuera de alcance. La revocación del object URL en `onload` y `onerror` permanece intacta.

Se extraen cinco subcomponentes en `components/camera-view/`: cabecera, marco de cámara, miniaturas, avisos/consejo y pie con controles. Se conservan el JSX, textos, clases, orden, claves por índice y condiciones. CameraView mantiene el estado, los efectos, las rutas y toda la lógica de captura, carga, reducción, calidad y almacenamiento de fotos. Los fragmentos nuevos no añaden elementos al DOM.

Validación: la comprobación literal de la tarjeta terminó con código 0: `npm test` aprobó los 35 archivos de pruebas, incluidos `cameraView.test.mjs`, `cameraViewLimpiaInput.test.mjs`, `cameraViewMezcla.test.mjs` y `photoQuality*.test.mjs`, sin cambios; `npm run build` pasó. `git diff --check` también pasa. Se comprobó que el cuerpo de CameraView anterior al JSX es idéntico al de HEAD. Se revisó además el árbol de trabajo, porque `origin/main...HEAD` no incluye cambios sin commit: el único archivo existente modificado es `screens/CameraView.tsx`; solo se añaden los cinco subcomponentes y este documento solicitado. No se realizó validación visual en navegador.
