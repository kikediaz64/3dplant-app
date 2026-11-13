import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/tsLoader.mjs';
import { montarPantalla } from './helpers/montajePantalla.mjs';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
const { default: PlantDetail } = await import('../screens/PlantDetail.tsx');
const { default: PlantCard } = await import('../components/PlantCard.tsx');

for (const component of ['PlantDetail', 'PlantCard']) {
  for (const earlyUnmount of [false, true]) {
    test(`${component}: ${earlyUnmount ? 'desmontar cancela el temporizador pendiente' : 'Regada ✓ deshabilita el botón durante 2000 ms'}`, async t => {
      const montaje = montarPantalla();
      const root = createRoot(montaje.container);
      let unmounted = false;
      t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
      const pending = new Set();
      // Registrar los temporizadores simulados permite comprobar su cancelación,
      // incluso aunque React ignore una actualización después del desmontaje.
      for (const [schedule, cancel] of [['setTimeout', 'clearTimeout'], ['setInterval', 'clearInterval']]) {
        const originalSchedule = globalThis[schedule];
        const originalCancel = globalThis[cancel];
        t.mock.method(globalThis, schedule, (callback, delay, ...args) => {
          const id = originalSchedule(() => {
            if (schedule === 'setTimeout') pending.delete(id);
            callback(...args);
          }, delay);
          if ((schedule === 'setTimeout' && delay === 2000) ||
              (schedule === 'setInterval' && delay === 60000)) pending.add(id);
          return id;
        });
        t.mock.method(globalThis, cancel, id => {
          pending.delete(id);
          return originalCancel(id);
        });
      }
      try {
        const plant = {
          id: 'regada', name: 'Albahaca', image: '', location: 'Cocina',
          status: 'healthy', needsWater: true, nextWatering: 'Riego hoy',
          careDetails: {},
        };
        localStorage.setItem('savedPlants', JSON.stringify([plant]));
        const onWater = t.mock.fn();
        const element = component === 'PlantDetail'
          ? React.createElement(Routes, null, React.createElement(Route, {
            path: '/plant/:id', element: React.createElement(PlantDetail),
          }))
          : React.createElement(PlantCard, { plant, onWater });
        await act(async () => root.render(React.createElement(MemoryRouter, {
          initialEntries: ['/plant/regada'],
        }, element)));
        const button = [...montaje.container.querySelectorAll('button')]
          .find(node => /Regar ahora/i.test(node.textContent));
        assert.ok(button);
        const originalText = button.textContent;
        assert.equal(button.disabled, false);
        const baselineTimers = pending.size;
        await act(async () => button.click());
        assert.match(button.textContent, /Regada ✓/);
        assert.equal(button.disabled, true);
        assert.equal(pending.size, baselineTimers + 1);
        if (component === 'PlantCard') {
          assert.equal(onWater.mock.callCount(), 1);
          assert.deepEqual(onWater.mock.calls[0].arguments, [plant.id]);
        } else {
          assert.ok(JSON.parse(localStorage.getItem('savedPlants'))[0].lastWateredAt);
        }
        if (!earlyUnmount) {
          await act(async () => t.mock.timers.tick(1999));
          assert.match(button.textContent, /Regada ✓/);
          assert.equal(button.disabled, true);
          await act(async () => t.mock.timers.tick(1));
          assert.equal(button.textContent, originalText);
          assert.equal(button.disabled, false);
          assert.equal(pending.size, baselineTimers);
          // Un segundo riego vuelve a activar el mismo ciclo.
          await act(async () => button.click());
          assert.equal(button.disabled, true);
          await act(async () => t.mock.timers.tick(2000));
          assert.equal(button.textContent, originalText);
          assert.equal(button.disabled, false);
        }
        await act(async () => root.unmount());
        unmounted = true;
        assert.equal(pending.size, 0, 'no queda ningún temporizador vivo');
        await act(async () => t.mock.timers.tick(60000));
        assert.equal(pending.size, 0);
      } finally {
        if (!unmounted) await act(async () => root.unmount());
        t.mock.restoreAll();
        t.mock.timers.reset();
        montaje.restaurar();
      }
    });
  }
}
