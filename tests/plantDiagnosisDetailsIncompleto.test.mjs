import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import './helpers/tsLoader.mjs';

const { default: PlantDiagnosisDetails } = await import('../components/plant-detail/PlantDiagnosisDetails.tsx');

const plant = {
  id: 'plant-1', name: 'Monstera', scientificName: 'Monstera deliciosa', location: 'Casa', image: '',
  status: 'healthy', needsWater: false, careDetails: { light: '', water: '', temp: '', humidity: '' }, nextWatering: 'mañana',
};

const render = diagnosis => renderToStaticMarkup(React.createElement(PlantDiagnosisDetails, { plant: { ...plant, diagnosis } }));

test('un diagnóstico guardado sin listas no rompe la ficha', () => {
  assert.doesNotThrow(() => render({ health: 'Regular' }));
  const html = render({ health: 'Regular' });
  assert.doesNotMatch(html, /Problemas detectados/);
  assert.doesNotMatch(html, /Recomendaciones/);
});

test('un diagnóstico con solo una de las dos listas pinta esa lista', () => {
  const soloProblemas = render({ health: 'Regular', problems: ['Manchas'] });
  assert.match(soloProblemas, /Problemas detectados/);
  assert.match(soloProblemas, /Manchas/);
  assert.doesNotMatch(soloProblemas, /Recomendaciones/);

  const soloRecomendaciones = render({ health: 'Regular', recommendations: ['Regar menos'] });
  assert.match(soloRecomendaciones, /Recomendaciones/);
  assert.match(soloRecomendaciones, /Regar menos/);
  assert.doesNotMatch(soloRecomendaciones, /Problemas detectados/);
});
