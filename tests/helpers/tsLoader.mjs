import { register } from 'node:module';

// Los hooks asíncronos conservan la carga nativa de CommonJS y son compatibles
// con los módulos sintéticos de mock.module en Node 22.15.
// Con registerHooks, el grafo de CameraView en Node 22.15 hace que el
// require('react') de react/jsx-runtime reciba exports vacíos durante la carga.
// ReactSharedInternals queda undefined y jsx falla en recentlyCreatedOwnerStacks.
// No precargar React para ocultarlo: mantener la carga nativa con register.
// Importar este helper antes de registrar mock.module: el último hook envuelve
// a los anteriores y debe poder sustituir el resultado de la transpilación.
register(new URL('./tsLoaderHooks.mjs', import.meta.url));
