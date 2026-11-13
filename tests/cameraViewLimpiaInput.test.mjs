import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/tsLoader.mjs';
import { montarCamara } from './helpers/montajeCamara.mjs';

const { default: CameraView } = await import('../screens/CameraView.tsx');
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const { act } = React;

let dom, root, container, montaje;

beforeEach(async () => {
  montaje = montarCamara({ globals: {
    alert: () => assert.fail('No se esperaba un error al procesar la foto'),
  }});
  dom = montaje.dom;
  container = document.getElementById('root');
  root = createRoot(container);
  await act(async () => root.render(React.createElement(MemoryRouter, null,
    React.createElement(CameraView))));
});

afterEach(async () => {
  await act(async () => root?.unmount());
  montaje.restaurar();
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
