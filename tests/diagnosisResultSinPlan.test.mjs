import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

const diagnosePlant = mock.fn();
mock.module('../services/aiService.ts', {
  namedExports: { diagnosePlant, AIUserError: class AIUserError extends Error {} },
});

await import('./helpers/tsLoader.mjs');

const { default: DiagnosisResult } = await import('../screens/DiagnosisResult.tsx');
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const { act } = React;
const { montarPantalla } = await import('./helpers/montajePantalla.mjs');

const diagnosisWithoutActionPlan = {
  speciesName: 'Costilla de Adán',
  scientificName: 'Monstera deliciosa',
  confidence: 65,
  problemName: 'Falta de agua',
  impact: 'Hojas caídas',
  severity: 'low',
  isContagious: false,
  healthStatus: 'Enferma',
  healthScore: 55,
  rootCauses: [],
};

let dom, root, container, montaje;

beforeEach(() => {
  montaje = montarPantalla();
  dom = montaje.dom;
  localStorage.setItem('capturedPlantImage', 'data:image/jpeg;base64,Zm90bw==');
  diagnosePlant.mock.resetCalls();
  diagnosePlant.mock.mockImplementationOnce(async () => diagnosisWithoutActionPlan);
  container = montaje.container;
  root = createRoot(container);
});

afterEach(async () => {
  try {
    await act(async () => root?.unmount());
  } finally {
    montaje.restaurar();
  }
});

test('DiagnosisResult se monta con diagnóstico sin actionPlan', async () => {
  await act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/result'] },
    React.createElement(DiagnosisResult))));

  assert.equal(diagnosePlant.mock.callCount(), 1);
  assert.equal(container.querySelector('h1')?.textContent, diagnosisWithoutActionPlan.speciesName);
  assert.ok(container.textContent.includes(diagnosisWithoutActionPlan.scientificName));
  assert.ok(container.textContent.includes(diagnosisWithoutActionPlan.problemName));
  assert.ok(container.textContent.includes('No hay acciones recomendadas.'));
  assert.ok(container.textContent.includes('Guardar en Mi Jardín'));
  assert.equal(container.textContent.includes('undefined'), false);
  assert.equal(container.querySelector('[role="alert"]'), null);
  assert.equal(container.querySelector('h2')?.textContent, 'Resultado');
});
