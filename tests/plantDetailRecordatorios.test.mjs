import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/tsLoader.mjs';
import { montarPantalla } from './helpers/montajePantalla.mjs';

const calendar = await import('../services/calendar.ts');
const downloadCalendarReminder = mock.fn();
mock.module('../services/calendar.ts', {
  namedExports: { ...calendar, downloadCalendarReminder },
});

const { default: PlantDetail } = await import('../screens/PlantDetail.tsx');
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, Routes, Route } = await import('react-router-dom');
const { act } = React;

let montaje, root, container;
const button = kind => [...container.querySelectorAll('button')]
  .find(node => node.textContent === `Añadir recordatorio de ${kind} al calendario`);

beforeEach(() => {
  montaje = montarPantalla({ url: 'https://plant.test/plant/recordatorios' });
  container = montaje.container;
  root = createRoot(container);
  downloadCalendarReminder.mock.resetCalls();
});

afterEach(async () => {
  try {
    await act(async () => root?.unmount());
  } finally {
    montaje.restaurar();
  }
});

async function mountPlant(overrides = {}) {
  const plant = {
    id: 'recordatorios', name: 'Albahaca', image: '', location: 'Cocina',
    status: 'healthy', needsWater: false, nextWatering: 'En 3 días',
    ...overrides,
  };
  localStorage.setItem('savedPlants', JSON.stringify([plant]));
  await act(async () => root.render(
    React.createElement(MemoryRouter, { initialEntries: [`/plant/${plant.id}`] },
      React.createElement(Routes, null,
        React.createElement(Route, { path: '/plant/:id', element: React.createElement(PlantDetail) }))),
  ));
  assert.equal(container.querySelector('h1')?.textContent, plant.name, 'se monta la planta guardada');
  assert.equal(downloadCalendarReminder.mock.callCount(), 0, 'montar no inicia descargas');
}

for (const [label, frequency, visible] of [
  ['entero positivo', 3, true],
  ['mínimo positivo', 1, true],
  ['cero', 0, false],
  ['decimal', 2.5, false],
  ['ausente', undefined, false],
  ['vacío', '', false],
  ['nulo', null, false],
  ['negativo', -1, false],
  ['cadena numérica', '3', false],
]) {
  test(`riego: frecuencia ${label} ${visible ? 'muestra' : 'oculta'} el botón`, async () => {
    await mountPlant({ wateringFrequencyDays: frequency });
    assert.equal(Boolean(button('riego')), visible);
    assert.equal(button('abono'), undefined);
  });
}

for (const [label, careGuide, visible] of [
  ['intervalo en semanas', { fertilizer: 'Abonar cada 2 semanas' }, true],
  ['intervalo mensual', { fertilizer: 'Abono mensual' }, true],
  ['guía ausente', undefined, false],
  ['abono ausente', {}, false],
  ['abono vacío', { fertilizer: '' }, false],
  ['sin intervalo', { fertilizer: 'Usar abono para plantas verdes' }, false],
  ['intervalo ambiguo', { fertilizer: 'Abonar cada 2 o 3 semanas' }, false],
]) {
  test(`abono: ${label} ${visible ? 'muestra' : 'oculta'} el botón`, async () => {
    await mountPlant({ careGuide });
    assert.equal(Boolean(button('abono')), visible);
    assert.equal(button('riego'), undefined);
  });
}

for (const [kind, intervalDays] of [['riego', 3], ['abono', 14]]) {
  test(`pulsar el botón de ${kind} descarga su recordatorio`, async () => {
    await mountPlant({
      wateringFrequencyDays: 3,
      careGuide: { fertilizer: 'Abonar cada 2 semanas' },
    });
    assert.ok(button('riego'));
    assert.ok(button('abono'));
    await act(async () => button(kind).dispatchEvent(
      new montaje.dom.window.MouseEvent('click', { bubbles: true }),
    ));
    assert.equal(downloadCalendarReminder.mock.callCount(), 1);
    const [ics, filename, params] = downloadCalendarReminder.mock.calls[0].arguments;
    assert.equal(filename, `${kind}-Albahaca.ics`);
    assert.equal(params.kind, kind);
    assert.equal(params.plantName, 'Albahaca');
    assert.equal(params.intervalDays, intervalDays);
    assert.ok(params.start instanceof Date);
    assert.ok(Number.isFinite(params.start.getTime()));
    assert.match(ics, /BEGIN:VCALENDAR/);
    assert.ok(ics.includes(`RRULE:FREQ=DAILY;INTERVAL=${intervalDays}`));
  });
}
