import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

const diagnosePlant = mock.fn();
class AIUserError extends Error {
  constructor(message, kind) {
    super(message);
    this.kind = kind;
  }
}
mock.module('../services/aiService.ts', {
  namedExports: { diagnosePlant, AIUserError },
});

await import('./helpers/tsLoader.mjs');

const { default: DiagnosisResult } = await import('../screens/DiagnosisResult.tsx');
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const { act } = React;
const { montarPantalla } = await import('./helpers/montajePantalla.mjs');

let dom, root, container, montaje;

beforeEach(() => {
  montaje = montarPantalla();
  dom = montaje.dom;
  diagnosePlant.mock.resetCalls();
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

async function renderError(error) {
  localStorage.setItem('capturedPlantImage', 'data:image/jpeg;base64,Zm90bw==');
  diagnosePlant.mock.mockImplementationOnce(async () => { throw error; });
  await act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/result'] },
    React.createElement(DiagnosisResult))));
}

const button = label => [...container.querySelectorAll('button')]
  .find(node => node.textContent.trim() === label);

test('daily-limit oculta Reintentar y muestra Volver', async () => {
  await renderError(new AIUserError('Límite diario alcanzado', 'daily-limit'));

  assert.equal(button('Reintentar'), undefined);
  assert.ok(button('Volver'));
});

test('un error normal permite Reintentar', async () => {
  await renderError(new AIUserError('Error temporal', 'provider'));

  assert.ok(button('Reintentar'));
});
