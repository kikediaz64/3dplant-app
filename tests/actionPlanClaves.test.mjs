import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/tsLoader.mjs';

const { diagnosePlant } = await import('../services/aiService.ts');

test('descarta claves ajenas en acciones válidas del plan', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({
    text: JSON.stringify({
      actionPlan: [{ title: 'Poda', description: 'Retira hojas secas', icon: 'content_cut', extra: 1 }]
    })
  }), { status: 200 });

  const result = await diagnosePlant('imagen-de-prueba');
  assert.deepEqual(result.actionPlan, [
    { title: 'Poda', description: 'Retira hojas secas', icon: 'content_cut' }
  ]);
});
