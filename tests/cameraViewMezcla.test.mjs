import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/tsLoader.mjs';
import { montarCamara } from './helpers/montajeCamara.mjs';

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

let dom, root, container, montaje;
const button = text => [...container.querySelectorAll('button')].find(node => node.textContent === text);

function Location() {
  return React.createElement('output', null, useLocation().pathname);
}

beforeEach(async () => {
  let nextUrl = 0;
  montaje = montarCamara({
    createObjectURL: file => `blob:${file.name}:${++nextUrl}`,
    revokeObjectURL: () => {},
    globals: {
    alert: () => assert.fail('No se esperaba un aviso del navegador'),
    confirm: () => assert.fail('No se esperaba una confirmación'),
    },
  });
  dom = montaje.dom;
  container = document.getElementById('root');
  root = createRoot(container);
  await act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: ['/scan'] },
    React.createElement(CameraView), React.createElement(Location))));
});

afterEach(async () => {
  await act(async () => root?.unmount());
  montaje.restaurar();
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
