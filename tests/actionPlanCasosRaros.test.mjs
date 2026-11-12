import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/tsLoader.mjs';

const { diagnosePlant } = await import('../services/aiService.ts');

test('descarta cadenas vacías y cadenas con solo espacios del plan de acción', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({
    text: JSON.stringify({ actionPlan: ['', '   '] })
  }), { status: 200 });

  const result = await diagnosePlant('imagen-de-prueba');
  assert.deepEqual(result.actionPlan, []);
});

test('usa Recomendación cuando el título no es texto', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({
    text: JSON.stringify({ actionPlan: [{ title: 42, description: 'x' }] })
  }), { status: 200 });

  const result = await diagnosePlant('imagen-de-prueba');
  assert.deepEqual(result.actionPlan, [
    { title: 'Recomendación', description: 'x', icon: 'task_alt' }
  ]);
});

test('un objeto con solo title conserva descripción vacía y un icono válido', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({
    text: JSON.stringify({ actionPlan: [{ title: 'Poda' }] })
  }), { status: 200 });

  const result = await diagnosePlant('imagen-de-prueba');
  assert.deepEqual(result.actionPlan, [
    { title: 'Poda', description: '', icon: 'task_alt' }
  ]);
  assert.ok(['content_cut', 'water_drop', 'wb_sunny', 'compost', 'pest_control', 'task_alt', 'eco', 'spa', 'thermostat', 'humidity_percentage', 'local_florist', 'grass', 'potted_plant', 'healing', 'visibility', 'schedule'].includes(result.actionPlan[0].icon));
  assert.deepEqual(Object.keys(result.actionPlan[0]).sort(), ['description', 'icon', 'title']);
});
