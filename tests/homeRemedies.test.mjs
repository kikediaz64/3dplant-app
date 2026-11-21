import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers/tsLoader.mjs';

const { normalizeCareGuide, missingCareData } = await import('../services/careGuide.ts');
const React = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { default: PlantCareSections } = await import('../components/plant-detail/PlantCareSections.tsx');

const plant = { id: 'p1', name: 'Tomate', scientificName: 'Solanum lycopersicum', location: 'Huerto', image: '', status: 'healthy', isToxic: false, needsWater: false, nextWatering: 'Mañana' };
const renderRemedies = guide => {
  const html = renderToStaticMarkup(React.createElement(PlantCareSections, { plant, guide, exportReminder() {} }));
  return html.split('Remedios caseros</h3>')[1];
};

test('normalizeCareGuide acepta homeRemedies válidos', () => {
  assert.deepEqual(normalizeCareGuide({ homeRemedies: ['Jabón potásico: 15 ml por litro'] }).homeRemedies, ['Jabón potásico: 15 ml por litro']);
});

test('normalizeCareGuide devuelve [] si homeRemedies no es un array o falta', () => {
  assert.deepEqual(normalizeCareGuide({ homeRemedies: 'jabón' }).homeRemedies, []);
  assert.deepEqual(normalizeCareGuide({ homeRemedies: { a: 1 } }).homeRemedies, []);
  assert.deepEqual(normalizeCareGuide({}).homeRemedies, []);
});

test('normalizeCareGuide descarta basura y vacíos y recorta los remedios', () => {
  assert.deepEqual(normalizeCareGuide({ homeRemedies: [null, 42, '  Neem 5 ml/l  ', '', '   ', {}] }).homeRemedies, ['Neem 5 ml/l']);
});

test('normalizeCareGuide limita homeRemedies a 3', () => {
  assert.deepEqual(normalizeCareGuide({ homeRemedies: ['a', 'b', 'c', 'd', 'e'] }).homeRemedies, ['a', 'b', 'c']);
});

test('la ficha lista los remedios de la planta, con claves estables si se repiten, y mantiene el aviso de mitos', () => {
  const remedies = renderRemedies({ homeRemedies: ['Jabón potásico: 15 ml por litro', 'Jabón potásico: 15 ml por litro'] });
  assert.equal(remedies.match(/<li>/g).length, 2);
  assert.match(remedies, /Jabón potásico: 15 ml por litro/);
  assert.doesNotMatch(remedies, /Sin datos para esta planta|Cáscara de huevo/);
  assert.match(remedies, /Muchos remedios virales son mitos/);
});

test('la ficha sin homeRemedies muestra la ausencia de datos y no el texto fijo antiguo', () => {
  for (const guide of [undefined, {}, { homeRemedies: [] }]) {
    const remedies = renderRemedies(guide);
    assert.ok(remedies.includes(missingCareData));
    assert.doesNotMatch(remedies, /Cáscara de huevo|Agua oxigenada/);
    assert.match(remedies, /Muchos remedios virales son mitos/);
  }
});

test('DIAGNOSE_PROMPT pide homeRemedies, acciones ordenadas por urgencia y planes distintos por foto', () => {
  const source = readFileSync(new URL('../netlify/functions/ai.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('const DIAGNOSE_PROMPT');
  const prompt = source.slice(start, source.indexOf('`;', start));
  assert.match(prompt, /"homeRemedies"/);
  assert.match(prompt, /ORDENADAS de más a menos urgente/);
  assert.match(prompt, /nunca deben recibir el mismo plan/);
  assert.match(prompt, /máximo 30 palabras/);
});
