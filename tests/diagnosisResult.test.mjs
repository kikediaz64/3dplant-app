import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

const diagnosePlant = mock.fn();
mock.module('../services/aiService.ts', {
  namedExports: { diagnosePlant, AIUserError: class AIUserError extends Error {} },
});

await import('./helpers/tsLoader.mjs');

const { default: DiagnosisResult } = await import('../screens/DiagnosisResult.tsx');
const { plantStorage } = await import('../services/plantStorage.ts');
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const { act } = React;
const { montarPantalla } = await import('./helpers/montajePantalla.mjs');

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

let dom, root, container, montaje, network;
// El aviso de toxicidad también usa role=status; busca solo el estado del rediagnóstico.
const pendingStatus = () => [...container.querySelectorAll('[role="status"]')]
  .map(node => node.textContent)
  .find(text => text.startsWith('Repitiendo el diagnóstico con '));
beforeEach(() => {
  network = mock.fn(() => { throw new Error('La prueba no debe acceder a la red'); });
  montaje = montarPantalla({ globals: { fetch: network, Image: class { set src(value) { queueMicrotask(() => this.onerror()); } } } });
  dom = montaje.dom;
  dom.window.fetch = network;
  container = montaje.container;
  diagnosePlant.mock.resetCalls();
  root = createRoot(container);
});

afterEach(async () => {
  try {
    await act(async () => root?.unmount());
  } finally {
    montaje.restaurar();
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
    assert.equal(pendingStatus(), undefined);

    await act(async () => candidateButtons[0].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));

    assert.deepEqual(diagnosePlant.mock.calls.map(call => call.arguments), [
      [photos],
      [photos, { scientificName: candidates[1].scientificName, commonName: candidates[1].commonNames[0] }],
    ]);
    assert.equal(pendingStatus(), 'Repitiendo el diagnóstico con Filodendro…');
    assert.equal(container.querySelector('h1').textContent, initialDiagnosis.speciesName);
    assert.ok(candidateButtons.every(button => button.disabled));
    assert.equal(container.textContent.includes(newDiagnosis.problemName), false);

    await act(async () => resolveDiagnosis(newDiagnosis));

    assert.equal(container.querySelector('h1').textContent, newDiagnosis.speciesName);
    assert.ok(container.textContent.includes(newDiagnosis.scientificName));
    assert.ok(container.textContent.includes(newDiagnosis.problemName));
    assert.ok(container.textContent.includes(newDiagnosis.impact));
    assert.equal(container.textContent.includes(initialDiagnosis.problemName), false);
    assert.equal(pendingStatus(), undefined);
    assert.equal(container.querySelectorAll('[role="alert"]').length, 0);
    assert.equal(diagnosePlant.mock.callCount(), 2);
    assert.equal(network.mock.callCount(), 0);
  });
}

for (const mode of ['nueva', 'reescaneo', 'original eliminada']) {
  test(`DiagnosisResult guarda el resultado: ${mode}`, async () => {
    const photo = 'data:image/jpeg;base64,Zm90bw==';
    localStorage.setItem('capturedPlantImage', photo);
    const original = mode === 'reescaneo' ? plantStorage.savePlant({
      name: 'Mi planta', scientificName: initialDiagnosis.scientificName,
      image: photo, status: 'healthy', location: 'Terraza',
    }) : null;
    const plantId = mode === 'nueva' ? null : original?.id || 'eliminada';
    diagnosePlant.mock.mockImplementationOnce(async () => initialDiagnosis);
    await act(async () => root.render(React.createElement(MemoryRouter, {
      initialEntries: [plantId ? `/result?plantId=${plantId}` : '/result'],
    }, React.createElement(DiagnosisResult))));

    const saveButton = [...container.querySelectorAll('button')]
      .find(node => node.textContent.includes(plantId ? 'Añadir al historial' : 'Guardar en Mi Jardín'));
    mock.timers.enable({ apis: ['setTimeout'] });
    try {
      await act(async () => saveButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
      const plants = plantStorage.getSavedPlants();
      assert.equal(plants.length, 1);
      assert.equal(plants[0].name, original ? 'Mi planta' : initialDiagnosis.speciesName);
      assert.equal(plants[0].location, original ? 'Terraza' : 'Mi Jardín');
      assert.equal(plants[0].diagnosisHistory[0].healthScore, initialDiagnosis.healthScore);
      assert.equal(plants[0].image, photo);
      assert.equal(localStorage.getItem('capturedPlantImage'), null);
      assert.equal(saveButton.disabled, true);
      assert.ok(saveButton.textContent.includes(mode === 'original eliminada'
        ? 'Guardada como planta nueva (la original ya no existe)'
        : original ? 'Añadido al historial' : 'Guardada en Mi Jardín'));
      assert.equal(network.mock.callCount(), 0);
    } finally {
      mock.timers.reset();
    }
  });
}
