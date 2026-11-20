import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/tsLoader.mjs';
import { montarCamara } from './helpers/montajeCamara.mjs';

const { default: CameraView } = await import('../screens/CameraView.tsx');
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const { act } = React;

let montaje, dom, root, container;

beforeEach(async () => {
  montaje = montarCamara();
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

async function click(node) {
  assert.ok(node, 'existe el control esperado');
  await act(async () => node.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
}

async function upload(name) {
  const input = container.querySelector('input[type="file"]');
  const file = new File(['photo'], name, { type: 'image/jpeg' });
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  await act(async () => input.dispatchEvent(new dom.window.Event('change', { bubbles: true })));
}

test('CameraView muestra sus cinco piezas y actualiza miniatura y diagnóstico', async () => {
  // Cabecera: título, cierre y flash.
  assert.ok([...container.querySelectorAll('h1')].some(node => node.textContent === 'Nueva Foto'));
  const header = container.querySelector('header');
  assert.equal(header.querySelectorAll('button').length, 2);
  assert.ok(header.querySelector('button').textContent.includes('close'));
  assert.ok([...header.querySelectorAll('button')].some(node => /flash_off|flash_on/.test(node.textContent)));

  // Marco y pie con cámara inactiva.
  assert.equal(container.querySelector('[data-testid="rejilla-camara"]')?.children.length, 9);
  assert.ok(container.querySelector('footer input[type="file"]'));
  assert.ok(container.textContent.includes('0/3 fotos'));
  assert.equal([...container.querySelectorAll('button')].some(node => node.textContent.startsWith('Diagnosticar')), false);

  // Consejo: abrirlo desde la bombilla y cerrarlo.
  const tipButton = [...container.querySelectorAll('footer button')]
    .find(node => node.textContent.includes('lightbulb'));
  await click(tipButton);
  assert.ok([...container.querySelectorAll('p')].some(node => node.textContent === 'Consejo'));
  await click([...container.querySelectorAll('button')].find(node => node.textContent === 'Cerrar'));
  assert.equal([...container.querySelectorAll('p')].some(node => node.textContent === 'Consejo'), false);

  // Una foto debe producir miniatura, acción para quitarla y diagnóstico.
  await upload('hoja.jpg');
  assert.ok(container.querySelector('img[alt="Foto 1"]'));
  assert.ok(container.querySelector('button[aria-label="Quitar foto 1"]'));
  assert.ok([...container.querySelectorAll('button')].some(node => node.textContent === 'Diagnosticar (1 foto)'));
});
