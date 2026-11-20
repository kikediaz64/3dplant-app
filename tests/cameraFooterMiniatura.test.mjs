import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/tsLoader.mjs';
import { montarPantalla } from './helpers/montajePantalla.mjs';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const { default: CameraFooter } = await import('../components/camera-view/CameraFooter.tsx');

test('el botón de cerrar muestra la última foto o un icono y cierra la cámara', async () => {
  const montaje = montarPantalla();
  const root = createRoot(montaje.container);
  const onClose = () => { onClose.calls += 1; };
  onClose.calls = 0;
  const props = {
    cameraActive: true,
    photos: [],
    onClose,
    capturePhoto() {},
    handleFileInput() {},
    onToggleTip() {},
    async continueWithPhotos() {},
  };

  try {
    await act(async () => root.render(React.createElement(CameraFooter, props)));
    let closeButton = montaje.container.querySelector('button[aria-label="Cerrar cámara"]');
    assert.ok(closeButton, 'el botón de cerrar tiene una etiqueta accesible');
    assert.equal(closeButton.querySelector('img'), null, 'sin fotos no se muestra ninguna imagen');
    assert.equal(closeButton.querySelector('.material-symbols-outlined')?.textContent, 'photo_library');
    await act(async () => closeButton.click());
    assert.equal(onClose.calls, 1, 'el botón sigue llamando a onClose');

    await act(async () => root.render(React.createElement(CameraFooter, {
      ...props,
      photos: ['foto-anterior.jpg', 'ultima-foto.jpg'],
    })));
    closeButton = montaje.container.querySelector('button[aria-label="Cerrar cámara"]');
    assert.equal(closeButton.querySelector('img')?.getAttribute('src'), 'ultima-foto.jpg');
    assert.equal(closeButton.querySelector('.material-symbols-outlined'), null);
  } finally {
    await act(async () => root.unmount());
    montaje.restaurar();
  }
});
