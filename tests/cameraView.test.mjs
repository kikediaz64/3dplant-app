import { test, beforeEach, afterEach } from 'node:test';
import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL) {
      const url = new URL(specifier, context.parentURL);
      for (const ext of ['.ts', '.tsx', '.mjs']) {
        if (existsSync(new URL(url.href + ext))) return next(url.href + ext, context);
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (/\.tsx?$/.test(url)) return {
      format: 'module', shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }
      }).outputText
    };
    return next(url, context);
  }
});

const { default: CameraView } = await import('../screens/CameraView.tsx');
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, useLocation } = await import('react-router-dom');
const { act } = React;

let dom, root, container, alerts, originals, pixelValue;
const photoSources = () => [...container.querySelectorAll('img[alt^="Foto "]')].map(img => img.src);
const button = text => [...container.querySelectorAll('button')].find(node => node.textContent === text);

function Location() {
  return React.createElement('output', { 'data-location': true }, useLocation().pathname);
}

beforeEach(async () => {
  dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://plant.test/scan' });
  alerts = [];
  pixelValue = () => 0;
  originals = new Map();
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator, // Sin cámara en vivo: usa la entrada de archivos.
    localStorage: dom.window.localStorage,
    IS_REACT_ACT_ENVIRONMENT: true,
    alert: message => alerts.push(message),
    confirm: () => assert.fail('CameraView no debe abrir confirmaciones del navegador'),
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
  // Solo se simulan las APIs de imagen que jsdom no implementa. assessPhoto
  // sigue ejecutándose con píxeles oscuros o bordes difusos según el caso.
  dom.window.HTMLCanvasElement.prototype.getContext = function () {
    return {
      drawImage: image => { this.source = image.source; },
      getImageData: () => {
        const data = new Uint8ClampedArray(this.width * this.height * 4);
        for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
          const i = (y * this.width + x) * 4;
          data[i] = data[i + 1] = data[i + 2] = pixelValue(x, y);
          data[i + 3] = 255;
        }
        return { data };
      },
    };
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
  // Node proporciona Blob y object URLs; CameraView usa ambos sin simularlos.
  const file = new File(['photo'], name, { type: 'image/jpeg' });
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  await act(async () => input.dispatchEvent(new dom.window.Event('change', { bubbles: true })));
  assert.equal(input.value, '', 'la entrada queda lista para otra foto');
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
