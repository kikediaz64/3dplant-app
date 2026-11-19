import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/tsLoader.mjs';
import { montarPantalla } from './helpers/montajePantalla.mjs';

const ai = await import('../services/aiService.ts');
mock.module('../services/aiService.ts', { exports: {
  ...ai,
  askPlantExpert: async question => `Respuesta ${question}`
} });

const React = await import('react');
const { act } = React;
const { MemoryRouter } = await import('react-router-dom');
const { default: PlantAssistant } = await import('../screens/PlantAssistant.tsx');

test('mantiene las claves y los nodos de mensajes al añadir preguntas', async () => {
  const page = montarPantalla();
  page.dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(page.container);
  const mount = () => act(async () => root.render(
    React.createElement(MemoryRouter, null, React.createElement(PlantAssistant))
  ));
  const send = async question => {
    const input = page.container.querySelector('input');
    await act(async () => {
      Object.getOwnPropertyDescriptor(page.dom.window.HTMLInputElement.prototype, 'value').set.call(input, question);
      input.dispatchEvent(new page.dom.window.Event('input', { bubbles: true }));
    });
    await act(async () => page.container.querySelector('button[aria-label="Enviar pregunta"]').dispatchEvent(
      new page.dom.window.MouseEvent('click', { bubbles: true })
    ));
  };
  const messageNodes = () => [...page.container.querySelector('.flex-1.overflow-y-auto').children]
    .filter(node => node.classList.contains('flex'));

  try {
    await mount();
    await send('Primera');
    const priorNodes = messageNodes();
    assert.deepEqual(priorNodes.map(node => node.textContent), [
      '¡Hola! Soy tu asistente de plantas 🌱. Pregúntame lo que necesites: riego, abono, plagas, remedios caseros, dosis…',
      'Primera',
      'Respuesta Primera'
    ]);

    await send('Segunda');
    const allNodes = messageNodes();
    assert.deepEqual(allNodes.map(node => node.textContent), [
      '¡Hola! Soy tu asistente de plantas 🌱. Pregúntame lo que necesites: riego, abono, plagas, remedios caseros, dosis…',
      'Primera',
      'Respuesta Primera',
      'Segunda',
      'Respuesta Segunda'
    ]);
    priorNodes.forEach((node, i) => assert.strictEqual(allNodes[i], node));
  } finally {
    await act(async () => root.unmount());
    page.restaurar();
  }
});
