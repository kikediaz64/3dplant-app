import { test } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import './helpers/tsLoader.mjs';

const { default: CameraPhotos } = await import('../components/camera-view/CameraPhotos.tsx');

async function withCameraPhotos(check) {
  const dom = new JSDOM('<div id="root"></div>');
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.getElementById('root');
  const root = createRoot(container);
  try {
    await check({ container, root });
  } finally {
    await act(() => root.unmount());
    dom.window.close();
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
  }
}

const render = (photos, onRemovePhoto = () => {}) =>
  React.createElement(CameraPhotos, { photos, photoLimitMessage: false, onRemovePhoto });

test('mantiene los nodos de las fotos restantes al quitar la miniatura del medio', async () => {
  await withCameraPhotos(async ({ container, root }) => {
    const photos = ['data:image/png;base64,a', 'data:image/png;base64,b', 'data:image/png;base64,c'];
    await act(() => root.render(render(photos)));
    const before = [...container.querySelectorAll('img')];

    await act(() => root.render(render([photos[0], photos[2]])));
    const after = [...container.querySelectorAll('img')];

    assert.equal(after.length, 2);
    assert.equal(after[0], before[0]);
    assert.equal(after[1], before[2]);
    assert.deepEqual(after.map(img => img.alt), ['Foto 1', 'Foto 2']);
  });
});

test('pinta fotos idénticas con claves distintas y sin avisos de clave repetida', async () => {
  await withCameraPhotos(async ({ container, root }) => {
    const errors = [];
    const originalError = console.error;
    console.error = (...args) => errors.push(args.join(' '));
    try {
      await act(() => root.render(render(['data:image/png;base64,igual', 'data:image/png;base64,igual'])));
    } finally {
      console.error = originalError;
    }

    assert.equal(container.querySelectorAll('img').length, 2);
    assert.equal(errors.some(message => /same key|clave.*repetid/i.test(message)), false, errors.join('\n'));
  });
});
