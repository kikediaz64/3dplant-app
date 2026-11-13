import { test, beforeEach, afterEach, mock } from 'node:test';
import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';
import './helpers/tsLoader.mjs';

mock.module('../services/photoQuality.mjs', {
  namedExports: {
    assessPhoto: async dataUrl => {
      const source = Buffer.from(dataUrl.split(',')[1], 'base64').toString();
      if (source.includes('oscura')) return 'Esta foto está muy oscura, ¿repetir?';
      if (source.includes('borrosa')) return 'Esta foto está muy borrosa, ¿repetir?';
      return null;
    },
  },
});

const { default: CameraView } = await import('../screens/CameraView.tsx');
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, useLocation } = await import('react-router-dom');
const { act } = React;

let dom, root, container, originals;
const button = text => [...container.querySelectorAll('button')].find(node => node.textContent === text);

function Location() {
  return React.createElement('output', null, useLocation().pathname);
}

beforeEach(async () => {
  dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://plant.test/scan' });
  originals = new Map();
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    localStorage: dom.window.localStorage,
    IS_REACT_ACT_ENVIRONMENT: true,
    alert: () => assert.fail('No se esperaba un aviso del navegador'),
    confirm: () => assert.fail('No se esperaba una confirmación'),
    Image: class {
      naturalWidth = 256;
      naturalHeight = 256;
      set src(value) { this.source = value; queueMicrotask(() => this.onload?.()); }
      decode() { return Promise.resolve(); }
    },
  };
  for (const [key, value] of Object.entries(globals)) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  let nextUrl = 0;
  URL.createObjectURL = file => `blob:${file.name}:${++nextUrl}`;
  URL.revokeObjectURL = () => {};
  dom.window.HTMLCanvasElement.prototype.getContext = function () {
    return { drawImage: image => { this.source = image.source; } };
  };
  dom.window.HTMLCanvasElement.prototype.toDataURL = function () {
    return `data:image/jpeg;base64,${Buffer.from(this.source).toString('base64')}`;
  };
  container = document.getElementById('root');
  root = createRoot(container);
  await act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/scan'] },
    React.createElement(CameraView), React.createElement(Location))));
});

afterEach(async () => {
  try {
    await act(async () => root?.unmount());
    dom.window.close();
  } finally {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

async function upload(name) {
  const input = container.querySelector('input[type="file"]');
  const file = new File(['photo'], name, { type: 'image/jpeg' });
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  await act(async () => input.dispatchEvent(new dom.window.Event('change', { bubbles: true })));
  assert.equal(input.value, '');
}

async function click(node) {
  assert.ok(node, 'existe el botón esperado');
  await act(async () => node.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
}

test('agrupa las advertencias de fotos mezcladas en orden y renumera después de quitar una foto', async () => {
  await upload('hoja-oscura.jpg');
  await upload('hoja-borrosa.jpg');
  await upload('hoja-buena.jpg');
  await click(button('Diagnosticar (3 fotos)'));

  const alert = container.querySelector('[role="alert"] p');
  assert.ok(alert);
  assert.equal(alert.textContent, 'La foto 1 está muy oscura. La foto 2 está muy borrosa.');
  assert.ok(!alert.textContent.includes('foto 3'));

  await click(container.querySelector('[aria-label="Quitar foto 1"]'));
  await click(button('Diagnosticar (2 fotos)'));
  assert.equal(container.querySelector('[role="alert"] p').textContent, 'La foto 1 está muy borrosa.');
});
