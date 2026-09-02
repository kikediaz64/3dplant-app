# 3dPlant — Resumen del Proyecto

## Qué es
3dPlant v2 es una aplicación web/móvil de **diagnóstico de plantas con inteligencia artificial**. El usuario saca una foto de una planta y la IA (Google Gemini) identifica la especie, detecta problemas (plagas, enfermedades, carencias) y da un plan de acción en español.

## Funcionalidades principales
1. **Diagnóstico por foto**: cámara → imagen → IA devuelve JSON estructurado (especie, problema, severidad, plan de acción, causas, toxicidad, luz/agua/zona).
2. **Mi Jardín**: guarda las plantas diagnosticadas en el dispositivo (localStorage).
3. **Ciclos de riego**: cada planta guarda frecuencia de riego y última fecha regada; la app calcula automáticamente si "necesita agua".
4. **Detalle de planta**: información ampliada (abono/fertilización, plagas e insecticidas con dosis, remedios caseros).
5. **Asistente de plantas (chat)**: preguntas en lenguaje natural con contexto de la planta seleccionada.
6. **Seguridad**: la clave de la IA vive solo en el servidor (Netlify Function), nunca en el cliente.

## Objetivos
- App móvil-first, simple y en español, para personas no expertas en jardinería.
- Resultados claros, accionables y basados en evidencia (sin mitos virales peligrosos).
- Funcionar en celular y escritorio.
