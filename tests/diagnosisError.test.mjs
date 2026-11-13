import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

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

let dom, root, container, originals;

beforeEach(() => {
  dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://plant.test/result' });
  originals = new Map();
  for (const [key, value] of Object.entries({
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    localStorage: dom.window.localStorage,
    IS_REACT_ACT_ENVIRONMENT: true,
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
