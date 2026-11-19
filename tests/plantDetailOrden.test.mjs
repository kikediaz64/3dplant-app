import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/tsLoader.mjs';
import { montarPantalla } from './helpers/montajePantalla.mjs';

const { default: PlantDetail } = await import('../screens/PlantDetail.tsx');
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, Routes, Route } = await import('react-router-dom');
const { act } = React;

let montaje, root, container;

beforeEach(() => {
  montaje = montarPantalla({ url: 'https://plant.test/plant/orden' });
  container = montaje.container;
  root = createRoot(container);
});

afterEach(async () => {
  try {
    await act(async () => root?.unmount());
  } finally {
    montaje.restaurar();
  }
});

test('pinta las secciones en orden y coloca los recordatorios en su bloque', async () => {
  const plant = {
    id: 'orden', name: 'Albahaca', image: '', location: 'Cocina',
    status: 'unhealthy', needsWater: false, nextWatering: 'En 3 días',
    wateringFrequencyDays: 3,
    diagnosis: {
      health: 'Necesita atención',
      problems: ['Manchas en las hojas'],
      recommendations: ['Revisar el riego'],
    },
    diagnosisHistory: [{
      id: 'diagnostico-1', date: '2026-11-18T12:00:00.000Z',
      healthScore: 70, healthStatus: 'Regular', image: '',
    }],
    careGuide: {
      origin: 'Mediterránea', soil: 'Drenante',
      fertilizer: 'Abonar cada 2 semanas', seasonal: 'Proteger del frío',
      watering: 'Regar con moderación', light: 'Luz abundante',
      temperature: 'Templada', humidity: 'Media', commonPests: ['Pulgón'],
    },
  };
  localStorage.setItem('savedPlants', JSON.stringify([plant]));

  await act(async () => root.render(
    React.createElement(MemoryRouter, { initialEntries: [`/plant/${plant.id}`] },
      React.createElement(Routes, null,
        React.createElement(Route, { path: '/plant/:id', element: React.createElement(PlantDetail) }))),
  ));

  assert.equal(container.querySelector('h1')?.textContent, plant.name);
  assert.deepEqual(
    [...container.querySelectorAll('h3')].map(heading => heading.textContent),
    [
      'Historial de diagnósticos', 'Problemas detectados', 'Recomendaciones',
      'Historia', 'Tipo de suelo', 'Abono / Fertilización', 'Cuidado estacional',
      'Necesidades de riego', 'Requisitos de luz', 'Temperatura', 'Humedad',
      'Plagas e insecticidas', 'Remedios caseros',
    ],
  );

  const reminderButton = kind => [...container.querySelectorAll('button')]
    .find(button => button.textContent === `Añadir recordatorio de ${kind} al calendario`);
  for (const [kind, headingText] of [
    ['abono', 'Abono / Fertilización'],
    ['riego', 'Necesidades de riego'],
  ]) {
    const button = reminderButton(kind);
    assert.ok(button, `existe el recordatorio de ${kind}`);
    const block = button.closest('div.rounded-xl');
    assert.ok(block?.contains([...block.querySelectorAll('h3')].find(heading => heading.textContent === headingText)));
  }
  assert.ok([...container.querySelectorAll('button')].some(button => button.textContent.includes('Regar ahora')));
  assert.ok([...container.querySelectorAll('button')].some(button => button.textContent.includes('Volver')));
});

test('no muestra el historial en una planta de ejemplo y mantiene el orden de cuidados', async () => {
  localStorage.setItem('savedPlants', JSON.stringify([]));

  await act(async () => root.render(
    React.createElement(MemoryRouter, { initialEntries: ['/plant/1'] },
      React.createElement(Routes, null,
        React.createElement(Route, { path: '/plant/:id', element: React.createElement(PlantDetail) }))),
  ));

  const headings = [...container.querySelectorAll('h3')].map(heading => heading.textContent);
  assert.equal(headings.includes('Historial de diagnósticos'), false);
  assert.deepEqual(headings, [
    'Historia', 'Tipo de suelo', 'Abono / Fertilización', 'Cuidado estacional',
    'Necesidades de riego', 'Requisitos de luz', 'Temperatura', 'Humedad',
    'Plagas e insecticidas', 'Remedios caseros',
  ]);
});
