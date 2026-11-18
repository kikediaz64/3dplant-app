# Avisos de scripts de instalación de npm

## Entorno y reproducción

La comprobación se hizo con Node.js `v24.22.1` y npm `11.19.1`, usando las versiones fijadas en `package-lock.json` (`@google/genai` 1.52.0, `protobufjs` 7.6.6 y `esbuild` 0.25.12).

Se ejecutó `npm ci --foreground-scripts`. npm no mostró un aviso de `allowScripts` antes de que la instalación fallara: el `postinstall` de esbuild no pudo ejecutar su binario en este sandbox y terminó con `spawnSync .../esbuild/bin/esbuild EPERM`. Su salida final fue:

```text
Error: spawnSync /srv/kanban/worktrees/kikediaz64/3dplant-app/CARD-169/node_modules/esbuild/bin/esbuild EPERM
...
npm error code 1
npm error path /srv/kanban/worktrees/kikediaz64/3dplant-app/CARD-169/node_modules/esbuild
npm error command failed
npm error command sh -c node install.js
```

También se ejecutó `npm ci --ignore-scripts`: terminó correctamente («added 322 packages in 9s») y no emitió aviso de `allowScripts`. Por tanto, no hay un aviso real de `allowScripts` que copiar de esta reproducción. La configuración actual de npm devuelve `false` para `npm config get allow-scripts`; `.npmrc` solo establece `engine-strict=true`. No se modificó la configuración.

## Evaluación

| Paquete | Qué hace el script | ¿Lo necesita la app? | Recomendación |
| --- | --- | --- | --- |
| `@google/genai` 1.52.0 | `preinstall` ejecuta `echo 'preinstall: no-op'`; no prepara archivos ni compila código. | No. El paquete aparece en dependencias, pero la app usa `services/aiService.ts` contra `/api/ai` y no importa el SDK. | **Bloquear**: el script no aporta funcionalidad. La dependencia instalada no se necesita en el runtime actual, aunque retirarla queda fuera de esta tarjeta. |
| `protobufjs` 7.6.6 | `postinstall` ejecuta `scripts/postinstall.js`; solo comprueba `versionScheme` y avisa si la dependencia usa un esquema de versión incompatible. No genera archivos ni descarga código. | No se encontró uso en el código de la app. Es una dependencia transitiva de `@google/genai`; el script solo aporta una advertencia de compatibilidad para consumidores. | **Bloquear**: no es necesario para ejecutar la app ni para sus builds y pruebas actuales. |
| `esbuild` 0.25.12 | `postinstall` ejecuta `node install.js`; valida que el ejecutable nativo disponible corresponda a la versión instalada y, según plataforma, puede descargar/descomprimir el binario correcto. | Sí. Vite lo requiere durante el build/desarrollo y las pruebas del proyecto también lo usan para empaquetar código. | **Autorizar**: el binario de la plataforma es necesario. Sin el script puede faltar su instalación o validación; el EPERM observado aquí es una restricción de ejecución del sandbox, no un fallo del script en un entorno normal. |

## Límite de la comprobación

La ejecución normal no llegó a completar `npm ci` por el bloqueo de procesos del sandbox en el script de esbuild. La instalación con scripts omitidos sí completó, pero no prueba que el proyecto compile con esos scripts bloqueados. Las recomendaciones describen el efecto de los scripts de las versiones fijadas y el uso hallado en el árbol de código; no se cambió `package.json`, `package-lock.json` ni `.npmrc`.
