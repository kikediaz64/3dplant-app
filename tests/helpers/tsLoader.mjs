import { register } from 'node:module';

// Los hooks asíncronos conservan la carga nativa de CommonJS y son compatibles
// con los módulos sintéticos de mock.module en Node 22.15.
// Importar este helper antes de registrar mock.module: el último hook envuelve
// a los anteriores y debe poder sustituir el resultado de la transpilación.
register(new URL('./tsLoaderHooks.mjs', import.meta.url));
