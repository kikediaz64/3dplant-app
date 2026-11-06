# Handoff — 3dPlant v2

## Sesión 2026-11-06 — Preparar 3dPlant como primer repo real del Kanban

**Qué se hizo.**
1. Revisión de solo lectura de las dos ramas sin subir: `mejoras-diseno-apple` (aviso «Diagnóstico
   orientativo» + refactor `53654e1` de `main` local) y `a1-tope-diario` (worktree `G:\Laboratorio IA\3dplant-a1`).
   Las dos: `npm run build` y `tsc --noEmit` OK. A1: 27/27 pruebas. El código no se solapa; solo chocaban
   `package.json`/`package-lock.json` (Playwright frente a `@netlify/blobs`).
2. Plan aprobado por Kike. A1 commiteado (`94ec7ee`, sin `package.json.bak1`), subido y **PR #1**
   https://github.com/kikediaz64/3dplant-app/pull/1 (sin fusionar).
3. Playwright descartado: `package.json`/`package-lock.json` vueltos a HEAD (los `.bak-20261008-192557` eran
   idénticos a HEAD); versión con Playwright guardada en `*.bak-playwright-20261106`.
4. `mejoras-diseno-apple` subida como PR en borrador, para fusionar después de A1.

**Qué se descubrió.**
- El comando documentado `node --test --experimental-test-module-mocks tests/` falla en Node 24 (trata la
  carpeta como archivo). Sin argumento (busca `*.test.mjs`) o con el archivo funciona.
- Dispatcher (`src/procesador.py`, `_pruebas`): `comandos_pruebas[repo]` es una lista argv que se ejecuta en
  el clon **sin `npm ci` previo**; lista vacía = «omitidas». No hay clon de 3dplant-app en `/srv/kanban/repos`.
  kike-srv: Node 24.22.1, npm 11.19.1.
- No hay webs de apps de plantas «identificadas» en `REA REVERSE ENGINEER ANYTHING` ni en 3dPlant; la
  auditoría dice que nunca se analizaron apps de terceros. Kike quiere aprovechar apps que funcionan: se le
  explicó que no se copia su contenido ni se usan sus API internas; sí ideas de funciones, Pl@ntNet (gratis
  con límite, sin confirmar) y la biblioteca propia `3dPlant\mi-jardin` (78 artículos). Espera los nombres.
- El PR #1 se abrió sin poner antes la `OPENAI_API_KEY` falsa en Deploy Previews (paso de `A1_RESULTADO.md`):
  la vista previa usa la clave real, frenada por el tope de A1.

**Qué NO se hizo.** Nada fusionado. Sin script `"test"` en `package.json` (cambio de código: Codex o
«construye»). Sin tocar la config del Kanban en kike-srv (paso posterior, solo propuesto).

**Siguiente.** Kike: Netlify (`AWS_LAMBDA_JS_RUNTIME`, coste de Blobs), probar la vista previa del PR #1 y
fusionarlo. Después: script `"test"`, clonar el repo en kike-srv y `comandos_pruebas` =
`["sh","-c","npm ci --no-audit --no-fund && npm run build && node --test --experimental-test-module-mocks"]`;
primeras tarjetas: pruebas de límites de pregunta (400/413) y `*.bak*` al `.gitignore`.
