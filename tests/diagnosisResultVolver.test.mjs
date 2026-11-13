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

const photo = 'data:image/jpeg;base64,Zm90bw==';
const originalDiagnosis = {
  speciesName: 'Costilla de Adán', scientificName: 'Monstera deliciosa',
  confidence: 65, problemName: 'Falta de agua', impact: 'Hojas caídas',
  severity: 'low', isContagious: false, healthStatus: 'Enferma', healthScore: 55,
  actionPlan: [{ title: 'Regar la planta', description: 'Añade agua poco a poco.', icon: 'water_drop' }],
  rootCauses: [],
  candidates: [
    { scientificName: 'Monstera deliciosa', commonNames: ['Costilla de Adán'], score: 0.65, imageUrl: null },
    { scientificName: 'Philodendron hederaceum', commonNames: ['Filodendro'], score: 0.2, imageUrl: null },
  ],
};
const candidateDiagnosis = {
  ...originalDiagnosis,
  speciesName: 'Filodendro', scientificName: 'Philodendron hederaceum',
  problemName: 'Exceso de riego', impact: 'Raíces húmedas', healthScore: 72,
  actionPlan: [{ title: 'Revisar el sustrato', description: 'Comprueba la humedad.', icon: 'search' }],
  candidates: undefined,
};

let dom, root, container, montaje;

beforeEach(() => {
  montaje = montarPantalla();
  dom = montaje.dom;
  localStorage.setItem('capturedPlantImage', photo);
  diagnosePlant.mock.resetCalls();
  diagnosePlant.mock.mockImplementationOnce(async () => originalDiagnosis);
  diagnosePlant.mock.mockImplementationOnce(async () => candidateDiagnosis, 1);
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

test('volver a la propuesta inicial recupera el diagnóstico y reinicia el plan sin llamar de nuevo a la IA', async () => {
  await act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/result'] },
    React.createElement(DiagnosisResult))));

  assert.equal(container.querySelector('h1')?.textContent, originalDiagnosis.speciesName);
  assert.equal(diagnosePlant.mock.callCount(), 1);
  const initialAction = [...container.querySelectorAll('p')]
    .find(node => node.textContent === originalDiagnosis.actionPlan[0].title);
  assert.ok(initialAction, 'se muestra la acción del plan original');
  const initialActionButton = initialAction.parentElement.parentElement.querySelector('button');
  await act(async () => initialActionButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
  assert.ok(initialActionButton.textContent.includes('check'), 'la acción queda marcada');

  const candidateButton = [...container.querySelectorAll('button')]
    .find(node => node.textContent.includes('Filodendro'));
  assert.ok(candidateButton, 'se muestra la candidata');
  await act(async () => candidateButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));

  assert.equal(container.querySelector('h1')?.textContent, candidateDiagnosis.speciesName);
  assert.ok(container.textContent.includes(candidateDiagnosis.problemName));
  assert.equal(diagnosePlant.mock.callCount(), 2);

  const returnButton = [...container.querySelectorAll('button')]
    .find(node => node.textContent.includes('Volver a la propuesta inicial'));
  assert.ok(returnButton, 'aparece el control para volver al diagnóstico original');
  await act(async () => returnButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));

  assert.equal(container.querySelector('h1')?.textContent, originalDiagnosis.speciesName);
  assert.ok(container.textContent.includes(originalDiagnosis.scientificName));
  assert.ok(container.textContent.includes(originalDiagnosis.problemName));
  assert.ok(container.textContent.includes(originalDiagnosis.impact));
  assert.equal(container.textContent.includes(candidateDiagnosis.problemName), false);
  const restoredAction = [...container.querySelectorAll('p')]
    .find(node => node.textContent === originalDiagnosis.actionPlan[0].title);
  assert.ok(restoredAction, 'se restaura la acción del plan original');
  const restoredActionButton = restoredAction.parentElement.parentElement.querySelector('button');
  assert.equal(restoredActionButton.textContent, '', 'la casilla vuelve a estar desmarcada');
  assert.equal(diagnosePlant.mock.callCount(), 2, 'volver no vuelve a llamar a diagnosePlant');
  assert.deepEqual(diagnosePlant.mock.calls.map(call => call.arguments), [
    [[photo]],
    [[photo], { scientificName: 'Philodendron hederaceum', commonName: 'Filodendro' }],
  ]);
});
