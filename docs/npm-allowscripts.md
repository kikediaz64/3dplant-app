# Avisos de scripts de instalación de npm

## Entorno y aviso real

Revisión con Node.js `v24.22.1` y npm **11.19.1** (`node -v` y `npm -v`). Las versiones fijadas en `package-lock.json` e inspeccionadas en `node_modules` son `@google/genai@1.52.0`, `protobufjs@7.6.6` y `esbuild@0.25.12`.

Aviso real de `npm ci` recogido en las pruebas de la tarjeta y reproducido aquí literalmente según la evidencia aportada por el auditor:

```text
npm warn install-scripts 3 packages have install scripts not yet covered by allowScripts:
npm warn install-scripts   @google/genai@1.52.0 (preinstall: echo 'preinstall: no-op')
npm warn install-scripts   protobufjs@7.6.6 (postinstall: node scripts/postinstall)
npm warn install-scripts   esbuild@0.25.12 (postinstall: node install.js)
```

Este bloque procede de aquella ejecución, no de una nueva ejecución de `npm ci` en esta revisión. No se reinstalaron dependencias para corregir el documento. El intento anterior con `npm ci --foreground-scripts` registró un error `spawnSync .../esbuild/bin/esbuild EPERM`; su causa no se ha confirmado y no permite concluir que sea una restricción del sandbox. La instalación anterior con `--ignore-scripts` tampoco demuestra que los scripts sean prescindibles.

En esta revisión, `npm config get allow-scripts` devuelve **una línea vacía**, no `false`. Ese resultado no equivale a una denegación explícita: `allow-scripts` es una lista de configuración distinta del mapa `allowScripts` de `package.json`. Actualmente el proyecto no declara ese mapa y su `.npmrc` solo contiene `engine-strict=true`.

## Evaluación por paquete

| Paquete | Qué hace su script de instalación | ¿Lo necesita la app? | Recomendación |
| --- | --- | --- | --- |
| `@google/genai@1.52.0` | `preinstall: echo 'preinstall: no-op'`. Solo imprime un mensaje; no prepara archivos, descarga ni compila código. | El script no es necesario. No se encontraron imports del SDK en el código de la app ni en la función de Netlify: `services/aiService.ts` llama a `/api/ai` y `netlify/functions/ai.mjs` usa peticiones HTTP. | **Bloquear el script**: no aporta funcionalidad. Esto no implica quitar la dependencia. |
| `protobufjs@7.6.6` | `postinstall: node scripts/postinstall`. El archivo `scripts/postinstall.js` consulta `versionScheme`; si existe, lee el `package.json` del consumidor e imprime un aviso cuando su especificación no coincide con ese esquema. No genera archivos ni descarga o compila código. | El script no es necesario para la app. Es una dependencia transitiva de `@google/genai`; no se encontraron imports directos en la app. La advertencia de compatibilidad no prepara el runtime. | **Bloquear el script**: su omisión no elimina código del paquete ni altera su funcionamiento. |
| `esbuild@0.25.12` | `postinstall: node install.js`. Localiza el binario de la plataforma instalado mediante una dependencia opcional `@esbuild/*`, prepara/optimiza su ejecutable y valida la versión ejecutándolo con `--version`. Respeta `ESBUILD_BINARY_PATH` si está configurado. Si falta la dependencia opcional, intenta instalarla mediante npm y, si falla, descargar y extraer su archivo desde el registro. La descarga es una vía de respaldo, no el paso habitual. | **Se necesita esbuild en desarrollo/build**: `package.json` ejecuta Vite y el código instalado de Vite importa esbuild para transformar código y optimizar dependencias. El script prepara y valida esa herramienta; con la dependencia opcional disponible puede funcionar aun omitiéndolo, pero no se ha comprobado esa variante del build. `npm test` usa Node y un loader basado en `typescript.transpileModule`, no esbuild. | **Autorizar el script de la versión revisada**: conserva la preparación y validación soportadas por esbuild, incluida la recuperación si falta el binario opcional. No afirmar que todos los entornos fallan al bloquearlo. |

## Política recomendada para npm 11.19.1

El código de la versión instalada confirma que los scripts sin decisión explícita todavía se ejecutan con aviso. Una entrada `false` omite los scripts del paquete; una aprobación permite ejecutarlos. `strict-allow-scripts` convierte los pendientes en error y su valor predeterminado es `false`. No confundir el aviso con un bloqueo ya aplicado.

Para una futura tarjeta de configuración, la recomendación es registrar las dos denegaciones y aprobar únicamente `esbuild@0.25.12` tras esta revisión. npm ofrece `npm install-scripts ls` para consultar pendientes sin escribir y `npm install-scripts approve` / `deny` para mantener el mapa `allowScripts` de `package.json`. Las aprobaciones fijan la versión por defecto (`allow-scripts-pin=true`), mientras las denegaciones se guardan por nombre. Conviene revisar de nuevo el script al cambiar la versión autorizada, en lugar de aprobar todos los paquetes. No pasar `--allow-scripts` a un `npm ci` del proyecto: esta versión lo rechaza; la política compartida corresponde al proyecto.

Se contrastó con la [documentación oficial de npm sobre install-scripts](https://docs.npmjs.com/cli/v11/commands/npm-install-scripts/). Esa página sirve actualmente npm 11.21.2 y describe bloqueo predeterminado; para el comportamiento de **11.19.1** prevalece la inspección local de `lib/utils/resolve-allow-scripts.js`, `lib/commands/install-scripts.js`, `node_modules/@npmcli/arborist/lib/arborist/rebuild.js` y `node_modules/@npmcli/config/lib/definitions/definitions.js`, relativos a la instalación de npm (`npm root -g` + `/npm`).

Esta tarjeta solo documenta las decisiones: no se ha aplicado ninguna autorización o denegación ni se ha cambiado la configuración o las dependencias.
