# Pruebas con Node 22.15

Validación local: 2026-11-16. Base: `origin/main` en
`1d667f45184e437483540935e041d149a6085a19`. Dependencias instaladas del
proyecto, compartidas con una copia limpia obtenida mediante `git archive
origin/main` en `/tmp/card151-verify-main`. Node mínimo: v22.15.0;
Node habitual: v24.22.1. No se modifica `engines`, `.nvmrc` ni CameraView.

## Causa y propuesta aplicada (a)

El loader original registra hooks síncronos con `registerHooks`. En Node
22.15 esos hooks también interceptan la carga CommonJS. Al cargar primero
el grafo real de CameraView, el `require("react")` interno de
`react/cjs/react-jsx-runtime.development.js` recibe exports vacíos. Esto
se comprobó instrumentando esa llamada: `Object.keys(React)` devuelve `[]`.
En la línea 304 del runtime, la asignación
`ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE`
produce `undefined`; la llamada a `jsx` intenta incrementar
`ReactSharedInternals.recentlyCreatedOwnerStacks` (línea 329) y falla.
Es un problema de interoperabilidad/carga CommonJS del loader síncrono en
22.15; el contador de React es donde se manifiesta. No depende del DOM ni
del comportamiento de CameraView. Precargar React altera el orden y oculta
la reproducción, por eso la regresión carga primero CameraView.

Reproducción mínima sobre la base, sin montar una pantalla:

```sh
"$NODE22" --input-type=module -e 'import "./tests/helpers/tsLoader.mjs"; await import("./screens/CameraView.tsx"); const {jsx} = await import("react/jsx-runtime"); jsx("div", {});'
```

Salida de la reproducción instrumentada (se añade únicamente el listado
de claves tras `require("react")`):

```text
REACT_FROM_JSX []
/srv/kanban/worktrees/kikediaz64/3dplant-app/CARD-151/node_modules/react/cjs/react-jsx-runtime.development.js:329
        1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
              ^

TypeError: Cannot read properties of undefined (reading 'recentlyCreatedOwnerStacks')
    at process.env.NODE_ENV.exports.jsx (/srv/kanban/worktrees/kikediaz64/3dplant-app/CARD-151/node_modules/react/cjs/react-jsx-runtime.development.js:329:15)
    at file:///tmp/card151-verify-main/probe.mjs:10:1

Node.js v22.15.0
```

La solución que ya contiene esta rama usa `register` y hooks asíncronos en
`tests/helpers/tsLoaderHooks.mjs`, dejando CommonJS en su ruta nativa.
Conserva la transpilación TypeScript y la resolución de extensiones.
Además evita otros dos fallos independientes del mínimo:

- Los módulos sintéticos de `mock.module` pueden devolver `source: null`,
  que el encadenamiento síncrono de 22.15 rechaza con
  `ERR_INVALID_RETURN_PROPERTY_VALUE`. El helper se registra antes de los
  mocks para que estos puedan sustituir la carga; se comprueba la extensión
  con `URL.pathname` para admitir sus parámetros de URL.
- `umbralCandidatas.test.mjs` importaba `.ts` sin loader. Node 22.15 no tiene
  activado por defecto el soporte que permite esa importación en Node 24.
  Ahora registra el loader antes de importar dinámicamente el módulo.

Las pruebas de DiagnosisResult cambian solo el orden de registro del helper
respecto a sus mocks. Estos ajustes y el nuevo fichero de hooks son
necesarios para que la suite completa funcione con el mínimo, además de
CameraView. `tsLoaderReact.test.mjs` verifica la identidad de React entre
CommonJS y ESM y la creación de JSX después de cargar CameraView.
No se propone elevar el mínimo: el arreglo (a) pasa con 22.15.

## Comprobación y salida

Se intentó literalmente la comprobación de la tarjeta:

```sh
npx -y node@22.15.0 --experimental-test-module-mocks --test tests/*.test.mjs && npm test
```

`npx` no pudo consultar el registro en este entorno:

```text
npm error code EAI_AGAIN
npm error syscall getaddrinfo
npm error request to https://registry.npmjs.org/node failed, reason: getaddrinfo EAI_AGAIN registry.npmjs.org
```

Se ejecutó el mismo comando con el binario 22.15.0 ya instalado por npx,
verificando primero `--version` (`v22.15.0`):

```sh
NODE22=/home/kike/.npm/_npx/165bf73430067a31/node_modules/node/bin/node
"$NODE22" --experimental-test-module-mocks --test tests/*.test.mjs && npm test
```

Salida resumida de la base con Node 22.15 (código 1):

```text
  ...
1..32
# tests 32
# suites 0
# pass 22
# fail 10
# cancelled 0
# skipped 0
# todo 0
# duration_ms 15849.011074
```

Salida con el arreglo, Node 22.15 (código 0):

```text
  ...
1..33
# tests 33
# suites 0
# pass 33
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 18074.845966
```

Salida de `npm test`, Node 24.22.1 (código 0):

```text
✔ tests/umbralCandidatas.test.mjs (494.556255ms)
ℹ tests 33
ℹ suites 0
ℹ pass 33
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 9176.335627
```

## Recuento de casos individuales

En este entorno el runner anterior informa por archivos (32 en la base,
33 en la rama). Para no confundir archivos con casos, se ejecutó además
cada fichero por separado, guardando sus contadores TAP y su código de
salida:

```sh
for archivo in tests/*.test.mjs; do
  "$NODE22" --experimental-test-module-mocks --test-reporter=tap "$archivo"
done
```

**Base: 14 fallos de 170 resultados**, coincidente con la medición del
revisor: 156 casos pasan, 6 casos fallan y 8 ficheros abortan antes de
registrar casos (cada aborto cuenta como un resultado fallido). No son
14 aserciones ejecutadas y fallidas. Los 7 casos de CameraView no pasan:
5 fallan en `cameraView`, 1 en `cameraViewLimpiaInput` y el fichero
`cameraViewMezcla` aborta. En esta reproducción `diagnosisError` aborta por
`source: null`, antes de llegar al error de React.

**Arreglo: 193 casos pasan, 0 fallos, 33 archivos con código 0.** Incluye
la nueva regresión y los casos que antes quedaban ocultos por los abortos;
por eso cambia el denominador.

| Archivo | Base: pasan | Base: fallan | Base: aborta al importar | Arreglo: pasan |
| --- | ---: | ---: | :---: | ---: |
| a1.test.mjs | 32 | 0 | — | 32 |
| actionPlanCasosRaros.test.mjs | 3 | 0 | — | 3 |
| actionPlanClaves.test.mjs | 1 | 0 | — | 1 |
| actionPlanDisplay.test.mjs | 4 | 0 | — | 4 |
| actionPlanIcons.test.mjs | 4 | 0 | — | 4 |
| aiService.test.mjs | 12 | 0 | — | 12 |
| assistantHistory.test.mjs | 14 | 0 | — | 14 |
| calendar.test.mjs | 8 | 0 | — | 8 |
| calendarDownload.test.mjs | 7 | 0 | — | 7 |
| cameraView.test.mjs | 0 | 5 | — | 5 |
| cameraViewLimpiaInput.test.mjs | 0 | 1 | — | 1 |
| cameraViewMezcla.test.mjs | 0 | 0 | sí | 1 |
| candidateHint.test.mjs | 1 | 0 | — | 1 |
| careGuide.test.mjs | 14 | 0 | — | 14 |
| diagnosisError.test.mjs | 0 | 0 | sí | 2 |
| diagnosisResult.test.mjs | 0 | 0 | sí | 5 |
| diagnosisResultSinPlan.test.mjs | 0 | 0 | sí | 1 |
| diagnosisResultVolver.test.mjs | 0 | 0 | sí | 1 |
| fechaFlotante.test.mjs | 1 | 0 | — | 1 |
| healthChart.test.mjs | 6 | 0 | — | 6 |
| healthTrend.test.mjs | 1 | 0 | — | 1 |
| healthTrendBordes.test.mjs | 2 | 0 | — | 2 |
| photoQuality.test.mjs | 7 | 0 | — | 7 |
| photoQualityPequenas.test.mjs | 2 | 0 | — | 2 |
| plantAssistantHistory.test.mjs | 0 | 0 | sí | 1 |
| plantDetailRecordatorios.test.mjs | 0 | 0 | sí | 18 |
| plantDetailTones.test.mjs | 3 | 0 | — | 3 |
| plantnet.test.mjs | 21 | 0 | — | 21 |
| recordatorio.test.mjs | 6 | 0 | — | 6 |
| regadaBoton.test.mjs | 4 | 0 | — | 4 |
| truncated.test.mjs | 3 | 0 | — | 3 |
| umbralCandidatas.test.mjs | 0 | 0 | sí | 1 |
| tsLoaderReact.test.mjs (nuevo) | — | — | — | 1 |
