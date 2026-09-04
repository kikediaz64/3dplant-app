# Contexto Técnico

## Stack
- **Frontend**: React 19.2, TypeScript 5.8, Vite 6.2, React Router DOM 7.11 (HashRouter).
- **Estilos**: Tailwind CSS (clases utilitarias; tema claro/oscuro con prefijos `dark:`).
- **IA**: OpenAI API REST (modelo `gpt-4o-mini`).
- **Backend**: Netlify Functions (serverless, Node, archivo `.mjs`).
- **Hosting**: Netlify (sitio estático + funciones).

## Dependencias (package.json)
- `react`, `react-dom`, `react-router-dom`
- `@google/genai` (instalada pero **ya NO se usa** en runtime)
- Dev: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/node`

## Setup y comandos
- `npm run dev` → servidor local Vite (NO incluye las funciones).
- `npm run build` → genera `dist/`.
- `npm run preview` → previsualiza el build.
- Para probar las funciones localmente hace falta `netlify dev` (requiere netlify-cli; aún no usado).
- Las pruebas del celular se hacen contra el **sitio desplegado**.

## Despliegue
- Netlify conectado al repo GitHub `kikediaz64/3dplant-app` (rama `main`), auto-publica en cada push.
- `netlify.toml`: build = `npm run build`, publish = `dist`, functions directory = `netlify/functions`, redirect `/* → /index.html` (SPA).
- URL: `https://famous-churros-89c618.netlify.app`.

## Variables de entorno
- `OPENAI_API_KEY` — configurada en Netlify (server-side). NO debe ir en el cliente.
- `.env.local` — existe localmente con la clave (solo desarrollo local, está en `.gitignore`).
- `.env.example` — plantilla.

## Limitaciones
- Función Netlify: timeout de **25s** hacia OpenAI.
- Cliente: timeout de **60s**.
- `dist/` es el build generado (no editar a mano).

## Notas de herramientas
- Los archivos de prueba `test-*.mjs` están en `.gitignore`.
