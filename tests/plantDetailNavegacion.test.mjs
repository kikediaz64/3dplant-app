import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/tsLoader.mjs';
import { montarPantalla } from './helpers/montajePantalla.mjs';

const { default: PlantDetail } = await import('../screens/PlantDetail.tsx');
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, Routes, Route, useLocation } = await import('react-router-dom');
const { act } = React;

let montaje, root, container;
let mountKey = 0;
function ScanDestination() {
  const location = useLocation();
  return React.createElement('p', null, `Destino escaneo ${location.search}`);
}
const plant = {
  id: 'navegacion-123', name: 'Albahaca', image: '', location: 'Cocina',
  status: 'healthy', needsWater: false, nextWatering: 'En 3 días',
  diagnosisHistory: [],
};

beforeEach(() => {
  montaje = montarPantalla({ url: 'https://plant.test/plant/navegacion-123' });
  container = montaje.container;
  root = createRoot(container);
  localStorage.setItem('savedPlants', JSON.stringify([plant]));
});

afterEach(async () => {
  try {
    await act(async () => root?.unmount());
  } finally {
    montaje.restaurar();
  }
});

async function mount() {
  await act(async () => root.render(
    React.createElement(MemoryRouter, { key: ++mountKey, initialEntries: [`/plant/${plant.id}`] },
      React.createElement(Routes, null,
        React.createElement(Route, { path: '/plant/:id', element: React.createElement(PlantDetail) }),
        React.createElement(Route, { path: '/', element: React.createElement('p', null, 'Destino inicio') }),
        React.createElement(Route, { path: '/assistant/:plantId', element: React.createElement('p', null, 'Destino asistente') }),
        React.createElement(Route, { path: '/scan', element: React.createElement(ScanDestination) }),
      ),
    ),
  ));
  assert.equal(container.querySelector('h1')?.textContent, plant.name);
}

async function click(button) {
  await act(async () => button.dispatchEvent(new montaje.dom.window.MouseEvent('click', { bubbles: true })));
}

test('los botones de cabecera e historial navegan a sus destinos', async () => {
  await mount();
  const buttons = [...container.querySelectorAll('button')];

  await click(buttons.find(node => node.querySelector('.material-symbols-outlined')?.textContent === 'close'));
  assert.equal(container.textContent, 'Destino inicio');

  await mount();
  await click([...container.querySelectorAll('button')].find(node => node.querySelector('.material-symbols-outlined')?.textContent === 'support_agent'));
  assert.equal(container.textContent, 'Destino asistente');

  await mount();
  await click([...container.querySelectorAll('button')].find(node => node.textContent.includes('Nuevo diagnóstico')));
  assert.equal(container.textContent, `Destino escaneo ?plantId=${plant.id}`);
});
