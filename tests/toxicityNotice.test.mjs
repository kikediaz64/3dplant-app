import './helpers/tsLoader.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
const { default: ToxicityNotice } = await import('../components/ToxicityNotice.tsx');
import { montarPantalla } from './helpers/montajePantalla.mjs';

const amber = 'rounded-xl border p-4 mb-4 border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100';
const gray = 'rounded-xl border p-4 mb-4 border-gray-200 bg-gray-50 text-gray-700 dark:border-white/10 dark:bg-surface-dark dark:text-gray-300';
const guide = (pets, people, note = '') => ({ toxicity: { pets, people, note } });

const cases = [
  ['tóxica para ambos', { careGuide: guide('tóxica', 'tóxica', '  Evitar la ingestión  ') }, '⚠️ Tóxica para mascotas · ⚠️ Tóxica para personas', amber, 'Evitar la ingestión'],
  ['no tóxica', { careGuide: guide('no tóxica', 'no tóxica', 'No se muestra') }, null],
  ['tóxica para mascotas con personas sin datos', { careGuide: guide('tóxica', 'desconocido') }, '⚠️ Tóxica para mascotas · Toxicidad para personas: sin datos fiables', amber],
  ['tóxica para personas con mascotas sin datos', { careGuide: guide('desconocido', 'tóxica') }, '⚠️ Tóxica para personas · Toxicidad para mascotas: sin datos fiables', amber],
  ['ambos desconocidos', { careGuide: guide('desconocido', 'desconocido') }, 'Toxicidad: sin datos fiables', gray],
  ['solo mascotas desconocidas', { careGuide: guide('desconocido', 'no tóxica') }, 'Toxicidad para mascotas: sin datos fiables', gray],
  ['solo personas desconocidas', { careGuide: guide('no tóxica', 'desconocido') }, 'Toxicidad para personas: sin datos fiables', gray],
  ['aviso antiguo prevalece sobre guía no tóxica', { isToxic: true, careGuide: guide('no tóxica', 'no tóxica') }, '⚠️ Puede ser tóxica para mascotas o personas', amber],
  ['tóxica sin guía', { isToxic: true }, '⚠️ Tóxica para mascotas o personas', amber],
  ['sin datos', {}, 'Toxicidad: sin datos fiables', gray],
  ['false antiguo sin guía', { isToxic: false }, 'Toxicidad: sin datos fiables', gray],
];

for (const [name, props, message, className, note] of cases) {
  test(`ToxicityNotice: ${name}`, async () => {
    const montaje = montarPantalla();
    const root = createRoot(montaje.container);
    try {
      await act(async () => root.render(React.createElement(ToxicityNotice, props)));
      if (message === null) {
        assert.equal(montaje.container.innerHTML, '');
        return;
      }
      const status = montaje.container.querySelector('[role="status"]');
      assert.ok(status);
      assert.equal(status.className, className);
      const paragraphs = status.querySelectorAll('p');
      assert.equal(paragraphs.length, note ? 2 : 1);
      assert.equal(paragraphs[0].textContent, message);
      assert.equal(paragraphs[0].className, 'font-bold');
      if (note) {
        assert.equal(paragraphs[1].textContent, note);
        assert.equal(paragraphs[1].className, 'mt-1 text-sm');
      }
    } finally {
      await act(async () => root.unmount());
      montaje.restaurar();
    }
  });
}
