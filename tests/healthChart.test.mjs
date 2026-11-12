import { test } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import './helpers/tsLoader.mjs';

const { default: HealthChart } = await import('../components/HealthChart.tsx');

async function withChart(scores, check) {
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
    await act(() => root.render(React.createElement(HealthChart, { scores })));
    check(container);
  } finally {
    await act(() => root.unmount());
    dom.window.close();
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
  }
}

for (const [scores, trend, ordered] of [
  [[70, 55, 40], 'Mejorando', [40, 55, 70]],
  [[40, 55, 70], 'Empeorando', [70, 55, 40]],
  [[55, 50], 'Igual', [50, 55]],
  [[100, null, NaN, undefined, Infinity, -1, 101, 0], 'Mejorando', [0, 100]],
]) {
  test(`muestra ${trend} y las puntuaciones válidas en orden: ${ordered}`, async () => {
    await withChart(scores, container => {
      const chart = container.querySelector('svg[role="img"]');
      assert.ok(chart);
      assert.equal(chart.getAttribute('aria-label'), `Evolución de puntuación: ${trend}. Puntuaciones: ${ordered.join(', ')}`);
      assert.deepEqual([...chart.querySelectorAll('text')].map(node => Number(node.textContent)), ordered);
      assert.equal(chart.querySelectorAll('circle').length, ordered.length);
    });
  });
}

test('conserva las dimensiones y posiciones de la gráfica', async () => {
  await withChart([70, 55, 40], container => {
    assert.equal(container.querySelector('svg').getAttribute('viewBox'), '0 0 160 64');
    assert.equal(container.querySelector('polyline').getAttribute('points'), '12,36.8 80,29.599999999999998 148,22.400000000000006');
  });
  await withChart([100, 75, 50, 25, 0], container => {
    assert.equal(container.querySelector('svg').getAttribute('viewBox'), '0 0 240 64');
    assert.equal(container.querySelector('polyline').getAttribute('points'), '12,56 66,44 120,32 174,20 228,8');
  });
});

test('no pinta nada con menos de dos puntuaciones válidas', async () => {
  for (const scores of [[], [50], [null, undefined, NaN, Infinity, -1, 101], [null, 0, 101]]) {
    await withChart(scores, container => assert.equal(container.innerHTML, ''));
  }
});
