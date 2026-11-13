import { test, beforeEach, afterEach } from 'node:test';
import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';
import './helpers/tsLoader.mjs';

const { default: CameraView } = await import('../screens/CameraView.tsx');
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const { act } = React;

let dom, root, container, originals;

beforeEach(async () => {
  dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://plant.test/scan' });
  originals = new Map();
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    localStorage: dom.window.localStorage,
    IS_REACT_ACT_ENVIRONMENT: true,
    alert: () => assert.fail('No se esperaba un error al procesar la foto'),
    Image: class {
      naturalWidth = 256;
      naturalHeight = 256;
      set src(value) {
        this.source = value;
        queueMicrotask(() => this.onload?.());
      }
      decode() { return Promise.resolve(); }
    },
  };
  for (const [key, value] of Object.entries(globals)) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  dom.window.HTMLCanvasElement.prototype.getContext = function () {
    return { drawImage: image => { this.source = image.source; } };
  };
  dom.window.HTMLCanvasElement.prototype.toDataURL = function () {
    return `data:image/jpeg;base64,${Buffer.from(this.source).toString('base64')}`;
  };
  container = document.getElementById('root');
  root = createRoot(container);
  await act(async () => root.render(React.createElement(MemoryRouter, null,
    React.createElement(CameraView))));
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

test('limpia el input de archivo después de procesar la foto', async () => {
  const input = container.querySelector('input[type="file"]');
  assert.ok(input);
  const valueDescriptor = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value');
  const assignedValues = [];
  Object.defineProperty(input, 'value', {
    configurable: true,
    get() { return valueDescriptor.get.call(this); },
    set(value) {
      assignedValues.push(value);
      valueDescriptor.set.call(this, value);
    },
  });

  const file = new File(['photo'], 'hoja.jpg', { type: 'image/jpeg' });
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  await act(async () => input.dispatchEvent(new dom.window.Event('change', { bubbles: true })));

  assert.deepEqual(assignedValues, [''], 'CameraView asigna una cadena vacía al input tras procesar');
  assert.equal(container.querySelectorAll('img[alt^="Foto "]').length, 1);
});
