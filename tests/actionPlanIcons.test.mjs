import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/tsLoader.mjs';

const { normalizeActionPlanIcon, diagnosePlant } = await import('../services/aiService.ts');

test('conserva iconos permitidos del plan de acción', () => {
  assert.equal(normalizeActionPlanIcon('content_cut'), 'content_cut');
});

test('mapea sinónimos frecuentes de iconos', () => {
  assert.equal(normalizeActionPlanIcon('scissors'), 'content_cut');
  assert.equal(normalizeActionPlanIcon('water'), 'water_drop');
  assert.equal(normalizeActionPlanIcon('sun'), 'wb_sunny');
  assert.equal(normalizeActionPlanIcon('bug'), 'pest_control');
});

test('usa task_alt para iconos desconocidos o valores que no son texto', () => {
  assert.equal(normalizeActionPlanIcon('made_up_icon'), 'task_alt');
  assert.equal(normalizeActionPlanIcon(42), 'task_alt');
  assert.equal(normalizeActionPlanIcon(null), 'task_alt');
});

test('descarta elementos inválidos del plan y normaliza acciones válidas', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({
    text: JSON.stringify({
      actionPlan: [null, 3, 'Regar menos', { title: 'Poda', icon: 'scissors' }, {}]
    })
  }), { status: 200 });

  const result = await diagnosePlant('imagen-de-prueba');
  assert.deepEqual(result.actionPlan, [
    { title: 'Recomendación', description: 'Regar menos', icon: 'task_alt' },
    { title: 'Poda', icon: 'content_cut', description: '' }
  ]);
});
