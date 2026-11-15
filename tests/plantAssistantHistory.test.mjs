import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/tsLoader.mjs';
import { montarPantalla } from './helpers/montajePantalla.mjs';
const calls = [];
let fail = false;
let nextAnswer;
const ai = await import('../services/aiService.ts');
mock.module('../services/aiService.ts', { namedExports: {
  ...ai,
  askPlantExpert: async (question, context, history) => {
    calls.push({ question, history: structuredClone(history) });
    if (history?.some(pair => !pair.answer.trim())) throw new Error('historial inválido');
    if (fail) throw new Error('sin servicio');
    const answer = nextAnswer ?? `Respuesta ${question}`;
    nextAnswer = undefined;
    return answer;
  }
} });
const React = await import('react');
const { act } = React;
const { MemoryRouter } = await import('react-router-dom');
const { default: PlantAssistant } = await import('../screens/PlantAssistant.tsx');

test('recuerda seis consultas completas, excluye errores y se vacía al desmontar', async () => {
  const page = montarPantalla();
  page.dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(page.container);
  const mount = () => act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(PlantAssistant))));
  const send = async question => {
    const input = page.container.querySelector('input');
    await act(async () => {
      Object.getOwnPropertyDescriptor(page.dom.window.HTMLInputElement.prototype, 'value').set.call(input, question);
      input.dispatchEvent(new page.dom.window.Event('input', { bubbles: true }));
    });
    await act(async () => page.container.querySelectorAll('button')[1].dispatchEvent(new page.dom.window.MouseEvent('click', { bubbles: true })));
  };
  try {
    await mount();
    for (let i = 0; i < 8; i++) await send(`Pregunta ${i}`);
    assert.deepEqual(calls[0].history, []);
    assert.deepEqual(calls[7].history, Array.from({ length: 6 }, (_, i) => ({ question: `Pregunta ${i + 1}`, answer: `Respuesta Pregunta ${i + 1}` })));
    fail = true;
    await send('Fallo');
    fail = false;
    await send('Seguimiento');
    assert.ok(calls.at(-1).history.every(pair => pair.question !== 'Fallo'));
    nextAnswer = '   ';
    await send('Respuesta vacía');
    assert.equal(calls.at(-1).question, 'Respuesta vacía');
    assert.equal(calls.at(-1).history.length, 6);
    await send('Siguiente pregunta');
    assert.equal(calls.at(-1).question, 'Siguiente pregunta');
    assert.ok(calls.at(-1).history.every(pair => pair.question !== 'Respuesta vacía'));
    await act(async () => root.render(null));
    await mount();
    await send('Nueva sesión');
    assert.deepEqual(calls.at(-1).history, []);
  } finally {
    await act(async () => root.unmount());
    page.restaurar();
  }
});
