import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/tsLoader.mjs';
import { montarCamara } from './helpers/montajeCamara.mjs';

const { default: CameraView } = await import('../screens/CameraView.tsx');
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, useLocation } = await import('react-router-dom');
const { act } = React;

let dom, root, container, alerts, montaje, pixelValue;
const photoSources = () => [...container.querySelectorAll('img[alt^="Foto "]')].map(img => img.src);
const button = text => [...container.querySelectorAll('button')].find(node => node.textContent === text);

function Location() {
  return React.createElement('output', { 'data-location': true }, useLocation().pathname);
}

beforeEach(async () => {
  alerts = [];
  pixelValue = () => 0;
  montaje = montarCamara({ pixelValue: (...args) => pixelValue(...args), globals: {
    alert: message => alerts.push(message),
    confirm: () => assert.fail('CameraView no debe abrir confirmaciones del navegador'),
  }});
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
  // Node proporciona Blob y object URLs; CameraView usa ambos sin simularlos.
  const file = new File(['photo'], name, { type: 'image/jpeg' });
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  await act(async () => input.dispatchEvent(new dom.window.Event('change', { bubbles: true })));
}

async function click(node) {
  assert.ok(node, 'existe el botón esperado');
  await act(async () => node.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })));
}

test('CameraView sin fotos muestra el contador y la captura, sin botón de diagnóstico', () => {
  assert.ok(container.textContent.includes('0/3 fotos'));
  assert.equal(container.querySelector('input[type="file"]').getAttribute('capture'), 'environment');
  assert.equal(photoSources().length, 0);
  assert.equal(button('Diagnosticar (0 fotos)'), undefined);
  assert.equal([...container.querySelectorAll('button')].some(node => node.textContent.startsWith('Diagnosticar')), false);
});

test('acepta tres subidas y rechaza la cuarta conservando las tres miniaturas', async () => {
  for (let i = 1; i <= 3; i++) {
    await upload(`hoja-${i}.jpg`);
    assert.equal(photoSources().length, i);
    assert.ok(container.textContent.includes(`${i}/3 ${i === 1 ? 'foto' : 'fotos'}`));
    assert.ok(button(`Diagnosticar (${i} ${i === 1 ? 'foto' : 'fotos'})`));
  }
  const accepted = photoSources();
  assert.equal(new Set(accepted).size, 3);
  await upload('cuarta.jpg');
  assert.deepEqual(alerts, []);
  assert.ok(container.textContent.includes('Puedes añadir hasta 3 fotos.'));
  assert.deepEqual(photoSources(), accepted);
  assert.ok(container.textContent.includes('3/3 fotos'));
  assert.ok(button('Diagnosticar (3 fotos)'));
});

test('quitar la miniatura intermedia elimina esa foto y deja añadir otra', async () => {
  for (let i = 1; i <= 3; i++) await upload(`hoja-${i}.jpg`);
  const original = photoSources();
  await click(container.querySelector('[aria-label="Quitar foto 2"]'));
  assert.deepEqual(photoSources(), [original[0], original[2]]);
  assert.ok(container.textContent.includes('2/3 fotos'));
  assert.ok(button('Diagnosticar (2 fotos)'));
  await upload('reemplazo.jpg');
  assert.equal(photoSources().length, 3);
  assert.deepEqual(photoSources().slice(0, 2), [original[0], original[2]]);
  assert.deepEqual(alerts, []);
  for (let i = 0; i < 3; i++) await click(container.querySelector('[aria-label="Quitar foto 1"]'));
  assert.deepEqual(photoSources(), []);
  assert.ok(container.textContent.includes('0/3 fotos'));
  assert.equal([...container.querySelectorAll('button')].some(node => node.textContent.startsWith('Diagnosticar')), false);
});

test('agrupa avisos de fotos malas; repetir conserva la cámara y continuar guarda y navega', async () => {
  pixelValue = () => 0;
  await upload('oscura-1.jpg');
  await upload('oscura-2.jpg');
  const photos = photoSources();
  localStorage.setItem('capturedPlantImage', 'anterior');
  await click(button('Diagnosticar (2 fotos)'));
  assert.equal(container.querySelectorAll('[role="alert"]').length, 1);
  assert.equal(container.querySelector('[role="alert"] p').textContent, 'La foto 1 está muy oscura. La foto 2 está muy oscura.');
  assert.equal(localStorage.getItem('capturedPlantImages'), null);
  assert.equal(container.querySelector('output').textContent, '/scan');
  assert.ok(button('Repetir fotos'));
  assert.ok(button('Continuar igualmente'));
  await click(button('Repetir fotos'));
  assert.equal(container.querySelector('[role="alert"]'), null);
  assert.equal(container.querySelector('output').textContent, '/scan');
  assert.equal(localStorage.getItem('capturedPlantImages'), null);
  assert.equal(localStorage.getItem('capturedPlantImage'), 'anterior');
  assert.deepEqual(photoSources(), photos);

  await click(button('Diagnosticar (2 fotos)'));
  await click(button('Continuar igualmente'));
  assert.deepEqual(JSON.parse(localStorage.getItem('capturedPlantImages')), photos);
  assert.equal(localStorage.getItem('capturedPlantImage'), null);
  assert.equal(container.querySelector('output').textContent, '/result');
  assert.deepEqual(alerts, []);
});

test('fotos sin advertencias se guardan y van al resultado directamente', async () => {
  pixelValue = () => 140;
  await upload('hoja.jpg');
  const photos = photoSources();
  await click(button('Diagnosticar (1 foto)'));
  assert.equal(container.querySelector('[role="alert"]'), null);
  assert.deepEqual(JSON.parse(localStorage.getItem('capturedPlantImages')), photos);
  assert.equal(container.querySelector('output').textContent, '/result');
  assert.deepEqual(alerts, []);
});
