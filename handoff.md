# Handoff — 3dPlant v2

## Sesión 2026-11-07 — De Pl@ntNet al estudio de la competencia, todo en producción

**Qué se hizo.** Día entero pasando tarjetas por la fábrica Kanban de kike-srv. Claude revisa cada PR en una
copia aparte (`scratchpad\pr13`: build, `tsc --noEmit`, todas las pruebas) y fusiona solo con el sí de Kike.
Después comprueba que el bundle de producción lleva el cambio.
- #12 Pl@ntNet (PR #13). Queja «dice lo mismo en todas las plantas»: #17 → PR #19 y #18 → PR #23. La fábrica
  agotó los 3 intentos con #18 y Codex remató `max_tokens` + 502 `truncated`.
- Estudio de la competencia, solo con información pública. REA capturó 5 webs → Obsidian `research\3dplant-competencia.md`.
  Las 5 ideas están en producción:
  - #24 especies alternativas con foto (PR #31; elegir otra especie repite el diagnóstico; umbral 0,05);
  - #25 hasta 3 fotos + aviso de foto mala (PR #42);
  - #30 aviso de tóxica (PR #46);
  - #28 recordatorio `.ics` pensado para iPhone (PR #50);
  - #29 evolución de la salud (PR #54).
- Más: #35 «Regada ✓» (PR #36), #40 iconos con lista blanca (PR #58), #41 mensaje del tope diario (PR #62) y
  #43 pruebas de interfaz de CameraView con jsdom (PR #65, solo pruebas; la web no cambia).

**Qué se descubrió y por qué importa.**
- Tope de vistas previas: todas las vistas previas comparten la cuota `consultas-diarias-deploy-preview`
  (30 al día). Por eso hoy se probó en producción después de fusionar.
- La fábrica tiene `max_tarjetas_dia` = 20, y cada intento cuenta. Llegó al tope con la #41. Con el sí de Kike
  se subió a 25 y la fábrica se reinició (copia en `dispatcher.json.bak-tope20`). Al cerrar se devolvió a **20**,
  porque es su freno de gasto. La config se lee al arrancar, así que cualquier cambio necesita
  `sudo systemctl restart kanban-dispatcher`.
- Una tarjeta `ready-for-human` no pasa sola a «Hecho». Un PR que solo trae pruebas también publica en Netlify
  (15 créditos), aunque el bundle quede igual.
- Norma de Kike: cada vez que se le pide algo, su tarjeta del tablero 3dPlant pasa a «Necesita a Kike».

**Qué NO se ha comprobado.**
- En el iPhone de Kike: el recordatorio del calendario (data URL), las especies alternativas y el resto de
  cambios de hoy.
- El mensaje real del tope diario: verlo exige gastar los 30 análisis.
- El panel de uso de Pl@ntNet.

**Siguiente.** #44 (calibrar los umbrales de foto oscura o borrosa) y #45 (pulir «1 fotos» y los avisos
alert/confirm). Después, tickets pequeños: #14, #15, #20-#22, los del revisor de #46 y #50, y que el chat diga
«preguntas» y no «diagnósticos» al llegar al tope. Pendientes de Kike: factura de Netlify de 9 $, plan de
Netlify hacia el 1-dic, y rotar la clave de Pl@ntNet si quiere.
