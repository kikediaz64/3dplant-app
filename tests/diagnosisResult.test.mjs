import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

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

const candidates = [
  { scientificName: 'Monstera deliciosa', commonNames: ['Costilla de Adán'], score: 0.65, imageUrl: null },
  { scientificName: 'Philodendron hederaceum', commonNames: ['Filodendro'], score: 0.2, imageUrl: null },
  { scientificName: 'Epipremnum aureum', commonNames: ['Poto'], score: 0.15, imageUrl: null },
];
const initialDiagnosis = {
  speciesName: 'Costilla de Adán', scientificName: 'Monstera deliciosa',
  confidence: 65, problemName: 'Falta de agua', impact: 'Hojas caídas',
  severity: 'low', isContagious: false, healthStatus: 'Enferma', healthScore: 55,
  actionPlan: [], rootCauses: [], candidates,
};
const newDiagnosis = {
  ...initialDiagnosis,
  speciesName: 'Filodendro', scientificName: 'Philodendron hederaceum',
  problemName: 'Exceso de riego', impact: 'Raíces húmedas', healthScore: 72,
  candidates: undefined,
};

let dom, root, container, originals, network;
beforeEach(() => {
  dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://plant.test/result' });
  // jsdom no carga recursos externos por defecto; cualquier fetch también falla.
  network = mock.fn(() => { throw new Error('La prueba no debe acceder a la red'); });
  dom.window.fetch = network;
  originals = new Map();
  for (const [key, value] of Object.entries({
    window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    localStorage: dom.window.localStorage, IS_REACT_ACT_ENVIRONMENT: true, fetch: network,
  })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  diagnosePlant.mock.resetCalls();
  container = document.getElementById('root');
  root = createRoot(container);
});

afterEach(async () => {
  try {
    await act(async () => root?.unmount());
  } finally {
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

for (const storageKey of ['capturedPlantImages', 'capturedPlantImage']) {
  test(`DiagnosisResult muestra candidatas, espera y nuevo diagnóstico con ${storageKey}`, async () => {
    const photos = storageKey === 'capturedPlantImages'
      ? ['data:image/jpeg;base64,Zm90bzE=', 'data:image/jpeg;base64,Zm90bzI=']
      : ['data:image/jpeg;base64,Zm90bzE='];
    localStorage.setItem(storageKey, storageKey === 'capturedPlantImages' ? JSON.stringify(photos) : photos[0]);
    let resolveDiagnosis;
    const pending = new Promise(resolve => { resolveDiagnosis = resolve; });
    diagnosePlant.mock.mockImplementationOnce(async () => initialDiagnosis);
    diagnosePlant.mock.mockImplementationOnce(() => pending, 1);

    await act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/result'] },
      React.createElement(DiagnosisResult))));

    assert.deepEqual(diagnosePlant.mock.calls.map(call => call.arguments), [[photos]]);
    assert.equal(container.querySelector('h1').textContent, initialDiagnosis.speciesName);
    assert.ok(container.textContent.includes('¿No es esta? Otras posibles'));
    const candidateButtons = candidates.slice(1).map(candidate => {
      const button = [...container.querySelectorAll('button')].find(node => node.textContent.includes(candidate.commonNames[0]));
      assert.ok(button, `se muestra la candidata ${candidate.scientificName}`);
      assert.equal(button.disabled, false);
      return button;
    });
    assert.equal(container.querySelector('[role="status"]'), null);

    await act(async () => candidateButtons[0].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));

    assert.deepEqual(diagnosePlant.mock.calls.map(call => call.arguments), [
      [photos],
      [photos, { scientificName: candidates[1].scientificName, commonName: candidates[1].commonNames[0] }],
    ]);
    assert.equal(container.querySelector('[role="status"]').textContent, 'Repitiendo el diagnóstico con Filodendro…');
    assert.equal(container.querySelector('h1').textContent, initialDiagnosis.speciesName);
    assert.ok(candidateButtons.every(button => button.disabled));
    assert.equal(container.textContent.includes(newDiagnosis.problemName), false);

    await act(async () => resolveDiagnosis(newDiagnosis));

    assert.equal(container.querySelector('h1').textContent, newDiagnosis.speciesName);
    assert.ok(container.textContent.includes(newDiagnosis.scientificName));
    assert.ok(container.textContent.includes(newDiagnosis.problemName));
    assert.ok(container.textContent.includes(newDiagnosis.impact));
    assert.equal(container.textContent.includes(initialDiagnosis.problemName), false);
    assert.equal(container.querySelector('[role="status"]'), null);
    assert.equal(container.querySelector('[role="alert"]'), null);
    assert.equal(diagnosePlant.mock.callCount(), 2);
    assert.equal(network.mock.callCount(), 0);
  });
}
